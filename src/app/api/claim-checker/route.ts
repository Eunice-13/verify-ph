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
import { supabaseServer, ARTICLE_COLUMNS } from "@/lib/supabase";
import { parseClaim, generateVerdict, searchTrustedWebSources } from "@/lib/gemini";
import { searchArticlesBySemanticSimilarity, reciprocalRankFusion } from "@/lib/embeddings";
import { getCapacityStatus } from "@/lib/llm-providers";
import type { DbArticle, Claim, ClaimCheckerRequest } from "@/types";
import type { ParsedClaim } from "@/lib/gemini";

const MAX_CLAIM_LENGTH = 5000;
const EVIDENCE_LIMIT = 8;

/**
 * Searches the articles table for rows relevant to the claim. Uses Postgres
 * full-text search (websearch_to_tsquery via `textSearch`) across title OR
 * summary, falling back to a categorized, conjunctively-scored keyword
 * match if full-text search finds nothing.
 *
 * The fallback requires candidates to match at least one keyword from each
 * non-empty category (location/event/entity) that the claim has, not just
 * a high raw count of any keywords. This prevents an article that only
 * shares a location (e.g. two unrelated stories both mentioning "Romblon")
 * from outranking or crowding out an article that actually matches the
 * claimed event too.
 */
async function searchArticlesFromDb(
  parsed: ParsedClaim,
  rawClaim: string
): Promise<DbArticle[]> {
  const { search_query: searchQuery, location_keywords, event_keywords, entity_keywords } = parsed;
  try {
    const db = supabaseServer();

    // Try full-text search across both title and summary — many articles
    // have a vague/clickbait title where the actual matching facts (e.g.
    // specific figures, names) only appear in the summary.
    const [titleFts, summaryFts] = await Promise.all([
      db
        .from("articles")
        .select(ARTICLE_COLUMNS)
        .textSearch("title", searchQuery, { type: "websearch", config: "english" })
        .order("published_at", { ascending: false })
        .limit(EVIDENCE_LIMIT),
      db
        .from("articles")
        .select(ARTICLE_COLUMNS)
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

    // Common abbreviations/phrasing (English and Taglish/Filipino) a user
    // might type that won't literally appear in article text. Expand each
    // to the term(s) actually likely to be in our articles.
    const SYNONYMS: Record<string, string[]> = {
      // PH-English abbreviations
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
      // Taglish / Filipino terms commonly mixed into PH social media claims
      baha: ["flood", "flooding"],
      bagyo: ["typhoon", "storm"],
      lindol: ["earthquake"],
      sunog: ["fire"],
      patay: ["dead", "killed", "death"],
      namatay: ["died", "dead", "death"],
      pulis: ["police"],
      gobyerno: ["government"],
      pangulo: ["president"],
      pangalawang: ["vice"],
      bise: ["vice"],
      senado: ["senate"],
      kongreso: ["congress"],
      pinuno: ["leader", "official"],
      halalan: ["election"],
      badyet: ["budget"],
      buwis: ["tax"],
      pasukan: ["classes", "school"],
      lockdown: ["lockdown", "quarantine"],
      kwarantina: ["quarantine", "lockdown"],
      lungsod: ["city"],
      probinsya: ["province"],
      barangay: ["barangay", "village"],
      kabataan: ["youth"],
      guro: ["teacher"],
      mag: [], // "mag-" prefix common in Filipino verbs, no direct synonym
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

    // Reverse synonym map: e.g. "philippines" -> ["ph", "phl", "rp", ...],
    // so a category keyword that was itself expanded (claim says "PH",
    // expanded to "philippines") still matches an article that literally
    // uses the abbreviated form ("PH") rather than the expanded one.
    const REVERSE_SYNONYMS: Record<string, string[]> = {};
    for (const [abbr, fulls] of Object.entries(SYNONYMS)) {
      for (const full of fulls) {
        (REVERSE_SYNONYMS[full] ??= []).push(abbr);
      }
    }
    const expandBidirectional = (words: string[]): string[] => {
      const expanded = expandSynonyms(words);
      const withReverse = [...expanded];
      for (const w of expanded) {
        if (REVERSE_SYNONYMS[w]) withReverse.push(...REVERSE_SYNONYMS[w]);
      }
      return withReverse;
    };

    const extractKeywords = (s: string) => {
      const words = normalize(s)
        .split(/\s+/)
        .map((w) => w.replace(/^p(?=\d)/, "").replace(/[.-]+$/, ""))
        .filter((w) => w.length > 1);
      return expandSynonyms(words).filter((w) => w.length > 2);
    };

    // Like extractKeywords, but also includes abbreviated forms (reverse
    // synonyms) — used specifically for the category conjunctive check
    // below, where we need to match either form appearing in article text.
    const extractCategoryKeywords = (s: string) => {
      const words = normalize(s)
        .split(/\s+/)
        .map((w) => w.replace(/^p(?=\d)/, "").replace(/[.-]+$/, ""))
        .filter((w) => w.length > 1);
      return expandBidirectional(words).filter((w) => w.length > 1);
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
      .select(ARTICLE_COLUMNS)
      .or(orFilter)
      .limit(500);

    if (likeError) {
      console.error("[claim-checker] article search fallback failed:", likeError);
      return [];
    }
    if (!candidates || candidates.length === 0) return [];

    // Build normalized category keyword sets (location/event/entity) from
    // what parseClaim extracted, expanding synonyms bidirectionally so
    // either an abbreviated or expanded form appearing in article text
    // counts as a match (e.g. claim says "PH" -> expanded to "Philippines"
    // -> also re-expanded back to "PH" so an article using literally "PH"
    // still matches).
    const categoryKeywords = (values: string[]): string[] =>
      Array.from(new Set(values.flatMap((v) => extractCategoryKeywords(v))));

    const locationSet = categoryKeywords(location_keywords ?? []);
    const eventSet = categoryKeywords(event_keywords ?? []);
    const entitySet = categoryKeywords(entity_keywords ?? []);
    const categories = [locationSet, eventSet, entitySet].filter((c) => c.length > 0);

    // Score each candidate by how many distinct keywords (including
    // stopwords, for tie-breaking) it actually contains.
    const minMatches = Math.min(2, keywords.length);
    const scored = candidates
      .map((article) => {
        const haystack = normalize(`${article.title} ${article.summary ?? ""}`);
        const matchCount = keywords.filter((kw) => haystack.includes(kw)).length;

        // Conjunctive category check: if the claim has keywords in more
        // than one category (e.g. both a location and an event), require
        // the candidate to match at least one keyword from EACH non-empty
        // category. A location-only match with zero event-term overlap
        // (e.g. two unrelated stories that both mention "Romblon") scores
        // zero here and is excluded below, regardless of raw match count.
        const categoriesMatched = categories.every((cat) =>
          cat.some((kw) => haystack.includes(kw))
        );

        return { article, matchCount, categoriesMatched };
      })
      .filter((s) => s.matchCount >= minMatches && (categories.length < 2 || s.categoriesMatched))
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
    // Step 1: AI parses/understands the claim (including categorized
    // location/event/entity keywords and a resolved claimed_date, used by
    // retrieval and the verdict step below).
    const parsed = await parseClaim(rawClaim);

    // Step 2: Search trusted sources/news DB for related evidence. Runs
    // keyword-based search (full-text + scored ILIKE fallback) and
    // semantic/embedding search in parallel, then combines both rankings
    // via reciprocal rank fusion. Semantic search catches paraphrased
    // claims that share little literal vocabulary with the matching
    // article; keyword search catches exact terms/figures embeddings can
    // sometimes miss. semanticResults is [] until the pgvector migration
    // (supabase/migrations/20260826000003_add_article_embeddings.sql) has
    // been applied and articles have been backfilled — see
    // src/lib/embeddings.ts, which degrades gracefully until then.
    const [keywordResults, semanticResults] = await Promise.all([
      searchArticlesFromDb(parsed, rawClaim),
      searchArticlesBySemanticSimilarity(rawClaim, EVIDENCE_LIMIT),
    ]);
    const evidence =
      semanticResults.length > 0
        ? reciprocalRankFusion([keywordResults, semanticResults], EVIDENCE_LIMIT)
        : keywordResults;

    // Step 3: AI compares the claim against our own DB evidence first.
    let result = await generateVerdict(
      parsed.normalized_claim,
      rawClaim,
      evidence,
      [],
      parsed.claimed_date
    );

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
            externalEvidence,
            parsed.claimed_date
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

    // Every provider in the fallback pool (see lib/llm-providers.ts) has
    // exhausted its retries for this request — check whether the whole
    // pool is now in cooldown, so the error response can tell the user
    // exactly when to come back instead of just "try again".
    const capacity = await getCapacityStatus();

    return NextResponse.json(
      {
        error: capacity.atCapacity
          ? "The Claim Checker is at capacity. Please try again later."
          : "Server capacity reached. Please try again in a few moments.",
        availableAt: capacity.availableAt,
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 502 }
    );
  }
}
