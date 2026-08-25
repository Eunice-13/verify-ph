// POST /api/claim-checker
//
// Pipeline:
//   1. AI parses/understands the claim               -> parseClaim()
//   2. Search trusted sources/news DB for evidence    -> searchArticlesFromDb()
//   3. AI compares evidence                            -> generateVerdict()
//   4. Returns a verdict plus the sources it used, and optionally persists
//      the result in the `claims` table.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { parseClaim, generateVerdict } from "@/lib/gemini";
import type { DbArticle, Claim, ClaimCheckerRequest } from "@/types";

const MAX_CLAIM_LENGTH = 5000;
const EVIDENCE_LIMIT = 8;

/**
 * Searches the articles table for rows relevant to the search query.
 * Uses Postgres full-text search (websearch_to_tsquery via `textSearch`)
 * over title + summary, falling back to a broader ILIKE search on the
 * original claim text if full-text search finds nothing.
 */
async function searchArticlesFromDb(
  searchQuery: string,
  rawClaim: string
): Promise<DbArticle[]> {
  try {
    const db = supabaseServer();

    // Try full-text search first.
    const { data: ftsResults, error: ftsError } = await db
      .from("articles")
      .select("*")
      .textSearch("title", searchQuery, { type: "websearch", config: "english" })
      .order("published_at", { ascending: false })
      .limit(EVIDENCE_LIMIT);

    if (!ftsError && ftsResults && ftsResults.length > 0) {
      return ftsResults as DbArticle[];
    }

    // Fallback: naive keyword ILIKE search across title + summary using the
    // first few significant words of the search query / raw claim.
    const keywords = searchQuery.split(/\s+/).filter((w) => w.length > 2).slice(0, 5);
    if (keywords.length === 0) {
      keywords.push(...rawClaim.split(/\s+/).filter((w) => w.length > 2).slice(0, 5));
    }
    if (keywords.length === 0) return [];

    const orFilter = keywords
      .map((kw) => {
        const escaped = kw.replace(/[%_]/g, "").replace(/,/g, "");
        return `title.ilike.%${escaped}%,summary.ilike.%${escaped}%`;
      })
      .join(",");

    const { data: likeResults, error: likeError } = await db
      .from("articles")
      .select("*")
      .or(orFilter)
      .order("published_at", { ascending: false })
      .limit(EVIDENCE_LIMIT);

    if (likeError) {
      console.error("[claim-checker] article search fallback failed:", likeError);
      return [];
    }

    return (likeResults ?? []) as DbArticle[];
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

    // Step 3 + 4: AI compares evidence and returns a verdict + sources.
    const result = await generateVerdict(parsed.normalized_claim, rawClaim, evidence);

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
