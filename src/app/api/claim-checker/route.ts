// POST /api/claim-checker
//
// Pipeline:
//   1. AI parses/understands the claim               -> parseClaim()
//   2. Search trusted sources/news DB for evidence    -> searchArticlesFromDb()
//   3. AI compares evidence                            -> generateVerdict()
//   3b. If step 3 returns "Insufficient Evidence", fall back to a live
//       search restricted to trusted PH news outlets  -> searchTrustedWebSources()
//       and retry generateVerdict() with that evidence added.
//   4. Returns a verdict plus the sources it used, and optionally persists
//      the result in the `claims` table.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { parseClaim, generateVerdict, searchTrustedWebSources } from "@/lib/gemini";
import type { DbArticle, Claim, ClaimCheckerRequest } from "@/types";

const MAX_CLAIM_LENGTH = 5000;
const EVIDENCE_LIMIT = 8;

/**
 * Searches the articles table for rows relevant to the search query.
 * Uses Postgres full-text search (websearch_to_tsquery via `textSearch`)
 * across title OR summary, falling back to a scored keyword match if full-
 * text search finds nothing. The scored fallback ranks articles by how
 * many extracted keywords they match (not just "any one keyword"), so a
 * generic word like "government" alone can't surface an unrelated article,
 * while an article matching most of the distinctive keywords ranks first.
 */
async function searchArticlesFromDb(
  searchQuery: string,
  rawClaim: string
): Promise<DbArticle[]> {
  try {
    const db = supabaseServer();

    // Try full-text search across both title and summary — many articles
    // have a vague/clickbait title where the actual matching facts (e.g.
    // specific figures, names) only appear in the summary.
    const [titleFts, summaryFts] = await Promise.all([
      db
        .from("articles")
        .select("*")
        .textSearch("title", searchQuery, { type: "websearch", config: "english" })
        .order("published_at", { ascending: false })
        .limit(EVIDENCE_LIMIT),
      db
        .from("articles")
        .select("*")
        .textSearch("summary", searchQuery, { type: "websearch", config: "english" })
        .order("published_at", { ascending: false })
        .limit(EVIDENCE_LIMIT),
    ]);

    const ftsResults = [
      ...(titleFts.error ? [] : titleFts.data ?? []),
      ...(summaryFts.error ? [] : summaryFts.data ?? []),
    ];

    if (ftsResults.length > 0) {
      // De-dupe by id (an article can match both title and summary FTS).
      const seen = new Set<string>();
      const deduped = ftsResults.filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      return deduped.slice(0, EVIDENCE_LIMIT) as DbArticle[];
    }

    // Fallback: scored keyword match across title + summary. Extract
    // significant keywords from the AI's search query (preferred) and the
    // raw claim, normalizing punctuation/currency symbols so formatting
    // differences (e.g. "₱7.5-billion" vs "P7-billion" vs "7.5 billion")
    // don't prevent a match on the underlying number/word.
    const normalize = (s: string) =>
      s
        .replace(/[₱$]/g, "")
        .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
        .toLowerCase();

    // Common abbreviations/phrasing a user might type that won't literally
    // appear in article text. Expand each to the term(s) actually likely
    // to be in our articles, so e.g. "PH ranked 66th place" can still match
    // an article whose text says "Philippines ranked 66th ... economies".
    const SYNONYMS: Record<string, string[]> = {
      ph: ["philippines", "philippine"],
      phl: ["philippines", "philippine"],
      rp: ["philippines", "philippine"],
      pilipinas: ["philippines", "philippine"],
      place: ["rank", "ranked", "ranking"],
      spot: ["rank", "ranked", "ranking"],
      position: ["rank", "ranked", "ranking"],
      no: ["number"],
      govt: ["government"],
      dept: ["department"],
    };

    const expandSynonyms = (words: string[]): string[] => {
      const expanded = [...words];
      for (const w of words) {
        // Strip a trailing ordinal suffix (66th -> 66) so a bare number in
        // the claim can match a bare number in article text and vice versa.
        const ordinalMatch = w.match(/^(\d+)(st|nd|rd|th)$/);
        if (ordinalMatch) expanded.push(ordinalMatch[1]);

        if (SYNONYMS[w]) expanded.push(...SYNONYMS[w]);
      }
      return expanded;
    };

    const extractKeywords = (s: string) => {
      const words = normalize(s)
        .split(/\s+/)
        .map((w) => w.replace(/^p(?=\d)/, "").replace(/[.-]+$/, ""))
        .filter((w) => w.length > 1);
      return expandSynonyms(words).filter((w) => w.length > 2);
    };

    const keywords = Array.from(
      new Set([...extractKeywords(searchQuery), ...extractKeywords(rawClaim)])
    ).slice(0, 16);

    if (keywords.length === 0) return [];

    // Extremely common words (stopwords) would match hundreds of unrelated
    // articles if used in the SQL filter, silently pushing out the true
    // match once results are capped. Use only distinctive keywords to
    // build the SQL filter, but keep the full keyword list (including
    // common ones) for scoring below, since they still help confirm a
    // genuine match once combined with the distinctive ones.
    const STOPWORDS = new Set([
      "the", "and", "for", "are", "was", "were", "with", "from", "that",
      "this", "have", "has", "had", "will", "would", "could", "should",
      "government", "plan", "spending", "said", "into", "over", "amid",
      "after", "before", "than", "their", "its", "his", "her", "they",
    ]);
    const distinctiveKeywords = keywords.filter((kw) => !STOPWORDS.has(kw));
    const sqlKeywords = distinctiveKeywords.length > 0 ? distinctiveKeywords : keywords;

    const orFilter = sqlKeywords
      .map((kw) => {
        const escaped = kw.replace(/[%_]/g, "");
        return `title.ilike.%${escaped}%,summary.ilike.%${escaped}%`;
      })
      .join(",");

    // Fetch a large, unordered candidate pool (not just the most recent
    // N) so scoring below chooses the best match by relevance, not by
    // which broadly-matching articles happen to be newest.
    const { data: candidates, error: likeError } = await db
      .from("articles")
      .select("*")
      .or(orFilter)
      .limit(500);

    if (likeError) {
      console.error("[claim-checker] article search fallback failed:", likeError);
      return [];
    }
    if (!candidates || candidates.length === 0) return [];

    // Score each candidate by how many distinct keywords (including
    // stopwords, for tie-breaking) it actually contains, then keep only
    // articles matching a meaningful share of the keywords and return the
    // best matches, most relevant first.
    const minMatches = Math.min(2, keywords.length);
    const scored = candidates
      .map((article) => {
        const haystack = normalize(`${article.title} ${article.summary ?? ""}`);
        const matchCount = keywords.filter((kw) => haystack.includes(kw)).length;
        return { article, matchCount };
      })
      .filter((s) => s.matchCount >= minMatches)
      .sort((a, b) => b.matchCount - a.matchCount);

    return scored.slice(0, EVIDENCE_LIMIT).map((s) => s.article) as DbArticle[];
  } catch (err) {
    // If the articles table doesn't exist yet, return empty (Gemini will
    // respond with "Insufficient Evidence").
    console.error("[claim-checker] article search threw:", err);
    return [];
  }
}

/**
 * Attempts to persist the claim result in Supabase. Non-fatal if it fails
 * (table might not exist yet during early development).
 */
async function persistClaim(
  rawClaim: string,
  verdict: string,
  aiExplanation: string,
  sourcesUsed: unknown[],
  confidence: number
): Promise<Claim | null> {
  try {
    const db = supabaseServer();

    const { data, error } = await db
      .from("claims")
      .insert({
        user_text: rawClaim,
        status: "completed",
        verdict,
        ai_explanation: aiExplanation,
        sources_used: sourcesUsed,
        confidence,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn("[claim-checker] could not persist claim:", error.message);
      return null;
    }

    return data as Claim;
  } catch (err) {
    console.warn("[claim-checker] persist threw (table may not exist):", err);
    return null;
  }
}

export async function POST(request: Request) {
  let body: ClaimCheckerRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const rawClaim = body?.claim?.trim();

  if (!rawClaim || rawClaim.length === 0) {
    return NextResponse.json(
      { error: "Field 'claim' is required and must be non-empty." },
      { status: 400 }
    );
  }

  if (rawClaim.length > MAX_CLAIM_LENGTH) {
    return NextResponse.json(
      { error: `Field 'claim' must be at most ${MAX_CLAIM_LENGTH} characters.` },
      { status: 400 }
    );
  }

  try {
    // Step 1: AI parses/understands the claim.
    const parsed = await parseClaim(rawClaim);

    // Step 2: Search trusted sources/news DB for related evidence.
    const evidence = await searchArticlesFromDb(parsed.search_query, rawClaim);

    // Step 3: AI compares the claim against our own DB evidence first.
    let result = await generateVerdict(parsed.normalized_claim, rawClaim, evidence);

    // Step 3b: If our own database evidence wasn't enough to reach a
    // verdict, fall back to a live search restricted to trusted Philippine
    // news outlets and try again with that added as evidence. This lets us
    // correctly verify claims covered by outlets not yet in our RSS
    // pipeline (e.g. ABS-CBN), or articles published before ingestion.
    if (result.verdict === "Insufficient Evidence") {
      try {
        const externalEvidence = await searchTrustedWebSources(
          parsed.normalized_claim,
          rawClaim
        );
        if (externalEvidence.length > 0) {
          result = await generateVerdict(
            parsed.normalized_claim,
            rawClaim,
            evidence,
            externalEvidence
          );
        }
      } catch (err) {
        console.error("[claim-checker] trusted web source search failed:", err);
      }
    }

    // Try to persist (non-fatal if claims table doesn't exist).
    const persistedClaim = await persistClaim(
      rawClaim,
      result.verdict,
      result.ai_explanation,
      result.sources_used,
      result.confidence,
    );

    // Build response — use persisted row if available, otherwise construct one.
    const responseClaim: Claim = persistedClaim ?? {
      id: crypto.randomUUID(),
      user_text: rawClaim,
      status: "completed",
      verdict: result.verdict,
      ai_explanation: result.ai_explanation,
      sources_used: result.sources_used,
      confidence: result.confidence,
      processed_at: new Date().toISOString(),
    };

    return NextResponse.json({ claim: responseClaim }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    console.error("[claim-checker] pipeline failed:", message, err);

    return NextResponse.json(
      {
        error: "Claim checker pipeline failed. Please try again.",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 502 }
    );
  }
}
