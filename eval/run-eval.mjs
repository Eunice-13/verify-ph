// Eval runner for the VerifyPH claim-checker.
//
// Runs every case in eval/claim-eval-set.json through the actual pipeline
// (parseClaim -> searchArticlesFromDb -> generateVerdict, replicated here
// rather than imported, since route.ts isn't structured as an importable
// module - see NOTE below) and logs, for each case:
//   - which articles were retrieved as candidates (retrieval step)
//   - whether the expected article was among them (retrieval accuracy)
//   - the final verdict Gemini returned (reasoning step)
//   - whether that verdict matched the expected one (reasoning accuracy)
//
// This separates "the right evidence never surfaced" (a retrieval bug)
// from "the right evidence surfaced but Gemini still got it wrong" (a
// reasoning/prompt bug) - each needs a different fix.
//
// NOTE: this duplicates the retrieval logic from
// src/app/api/claim-checker/route.ts rather than importing it, because
// that file is a Next.js route handler, not a plain importable module in
// this Node ESM context. If the retrieval logic changes, keep this in
// sync, or better: run this against a live dev server via HTTP instead
// (slower, but guarantees no drift - left as a future improvement).
//
// Usage: node --env-file=.env.local eval/run-eval.mjs [path-to-eval-set.json]
// Defaults to ./claim-eval-set.json if no path is given.
// Costs ~1-2 Gemini calls per case (parseClaim + generateVerdict, plus a
// possible 3rd call if the trusted-web-source fallback triggers) - mind
// the free-tier daily quota (20 requests/day) when running this.

import { readFileSync, writeFileSync } from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars. Run with: node --env-file=.env.local scripts/run-eval.mjs");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MODEL = "gemini-3.6-flash";
const EVIDENCE_LIMIT = 8;

// --- Minimal reimplementation of parseClaim (see src/lib/gemini.ts) ---
async function parseClaim(rawClaim) {
  const today = new Date().toISOString().slice(0, 10);
  const schema = {
    type: Type.OBJECT,
    properties: {
      search_query: { type: Type.STRING },
      normalized_claim: { type: Type.STRING },
      location_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      event_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      entity_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      claimed_date: { type: Type.STRING },
    },
    required: ["search_query", "normalized_claim", "location_keywords", "event_keywords", "entity_keywords", "claimed_date"],
  };
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: `Today's date is ${today}. Extract search_query, normalized_claim, location_keywords, event_keywords, entity_keywords, claimed_date (YYYY-MM-DD or empty) from this claim: "${rawClaim}"` }] }],
    config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 },
  });
  return JSON.parse(response.text);
}

// --- Minimal reimplementation of searchArticlesFromDb (see route.ts) ---
async function searchArticlesFromDb(parsed, rawClaim) {
  const { search_query: searchQuery } = parsed;
  const [titleFts, summaryFts] = await Promise.all([
    db.from("articles").select("*").textSearch("title", searchQuery, { type: "websearch", config: "english" }).limit(EVIDENCE_LIMIT),
    db.from("articles").select("*").textSearch("summary", searchQuery, { type: "websearch", config: "english" }).limit(EVIDENCE_LIMIT),
  ]);
  const ftsResults = [...(titleFts.data ?? []), ...(summaryFts.data ?? [])];
  if (ftsResults.length > 0) {
    const seen = new Set();
    return ftsResults.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true))).slice(0, EVIDENCE_LIMIT);
  }

  const normalize = (s) => s.replace(/[₱$]/g, "").replace(/[^\p{L}\p{N}\s.-]/gu, " ").toLowerCase();
  const keywords = Array.from(new Set(normalize(`${searchQuery} ${rawClaim}`).split(/\s+/).filter((w) => w.length > 2))).slice(0, 16);
  if (keywords.length === 0) return [];
  const orFilter = keywords.map((kw) => `title.ilike.%${kw}%,summary.ilike.%${kw}%`).join(",");
  const { data: candidates } = await db.from("articles").select("*").or(orFilter).limit(500);
  if (!candidates) return [];
  const minMatches = Math.min(2, keywords.length);
  return candidates
    .map((article) => ({ article, matchCount: keywords.filter((kw) => normalize(`${article.title} ${article.summary ?? ""}`).includes(kw)).length }))
    .filter((s) => s.matchCount >= minMatches)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, EVIDENCE_LIMIT)
    .map((s) => s.article);
}

// --- Minimal reimplementation of generateVerdict (see src/lib/gemini.ts) ---
async function generateVerdict(normalizedClaim, rawClaim, evidence) {
  const schema = {
    type: Type.OBJECT,
    properties: {
      verdict: { type: Type.STRING, enum: ["Verified", "Insufficient Evidence", "Contradicted"] },
      ai_explanation: { type: Type.STRING },
      confidence: { type: Type.NUMBER },
      sources_used: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { article_id: { type: Type.STRING }, source_url: { type: Type.STRING } } } },
    },
    required: ["verdict", "ai_explanation", "confidence", "sources_used"],
  };
  const evidenceForPrompt = evidence.map((a) => ({ id: a.id, title: a.title, summary: a.summary, source_name: a.source_name, source_url: a.source_url, published_at: a.published_at }));
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{
      role: "user",
      parts: [{
        text: `Use ONLY the articles below as evidence. Return Verified/Insufficient Evidence/Contradicted. Claim: "${rawClaim}". Normalized: "${normalizedClaim}". Evidence: ${JSON.stringify(evidenceForPrompt)}`,
      }],
    }],
    config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 },
  });
  return JSON.parse(response.text);
}

async function runCase(testCase) {
  const parsed = await parseClaim(testCase.claim);
  const evidence = await searchArticlesFromDb(parsed, testCase.claim);
  const result = await generateVerdict(parsed.normalized_claim, testCase.claim, evidence);

  const retrievedIds = evidence.map((a) => a.id);
  const retrievalOk =
    testCase.expected_article_id === null
      ? true // no specific article required (e.g. unrelated/insufficient-evidence cases)
      : retrievedIds.includes(testCase.expected_article_id);
  const reasoningOk = result.verdict === testCase.expected_verdict;

  return {
    id: testCase.id,
    category: testCase.category,
    claim: testCase.claim,
    expected_verdict: testCase.expected_verdict,
    actual_verdict: result.verdict,
    expected_article_id: testCase.expected_article_id,
    retrieved_article_ids: retrievedIds,
    retrieval_ok: retrievalOk,
    reasoning_ok: reasoningOk,
    ai_explanation: result.ai_explanation,
    confidence: result.confidence,
  };
}

async function main() {
  const evalSetPath = process.argv[2] ?? "./claim-eval-set.json";
  const evalSet = JSON.parse(readFileSync(new URL(evalSetPath, import.meta.url), "utf-8"));
  const results = [];

  for (const testCase of evalSet.cases) {
    console.log(`Running: ${testCase.id} (${testCase.category})...`);
    try {
      const result = await runCase(testCase);
      results.push(result);
      console.log(`  retrieval_ok=${result.retrieval_ok} reasoning_ok=${result.reasoning_ok} verdict=${result.actual_verdict} (expected ${result.expected_verdict})`);
    } catch (err) {
      console.error(`  FAILED: ${err.message ?? err}`);
      results.push({ id: testCase.id, category: testCase.category, error: err.message ?? String(err) });
    }
    // Stay well under free-tier rate limits between calls.
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  const outPath = new URL(`./results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, import.meta.url);
  writeFileSync(outPath, JSON.stringify(results, null, 2));

  const retrievalFailures = results.filter((r) => r.retrieval_ok === false);
  const reasoningFailures = results.filter((r) => r.retrieval_ok !== false && r.reasoning_ok === false);
  const passed = results.filter((r) => r.retrieval_ok !== false && r.reasoning_ok === true);

  console.log("\n=== SUMMARY ===");
  console.log(`Total cases: ${results.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Retrieval failures (right article never surfaced): ${retrievalFailures.length}`);
  retrievalFailures.forEach((r) => console.log(`  - ${r.id}`));
  console.log(`Reasoning failures (evidence was fine, verdict was wrong): ${reasoningFailures.length}`);
  reasoningFailures.forEach((r) => console.log(`  - ${r.id}`));
  console.log(`\nFull results written to: ${outPath.pathname}`);
}

main();
