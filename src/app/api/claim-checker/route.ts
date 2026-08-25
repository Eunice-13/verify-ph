// POST /api/claim-checker
//
// Pipeline:
//   1. AI parses/understands the claim               -> parseClaim()
//   2. Search trusted sources/news DB for evidence    -> searchArticles()
//   3. AI compares evidence                            -> generateVerdict()
//   4. Returns a verdict plus the sources it used, and persists the result
//      in the `claims` table.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { parseClaim, generateVerdict } from "@/lib/gemini";
import type { Article, Claim, ClaimCheckerRequest } from "@/types";

const MAX_CLAIM_LENGTH = 5000;
const EVIDENCE_LIMIT = 8;

/**
 * Searches the articles table for rows relevant to the search query.
 * Uses Postgres full-text search (websearch_to_tsquery via `textSearch`)
 * over title + summary, falling back to a broader ILIKE search on the
 * original claim text if full-text search finds nothing.
 */
async function searchArticles(
  searchQuery: string,
  rawClaim: string
): Promise<Article[]> {
  const db = supabaseServer();

  const { data: ftsResults, error: ftsError } = await db
    .from("articles")
    .select("*")
    .textSearch("title", searchQuery, {
      type: "websearch",
      config: "english",
    })
    .order("published_at", { ascending: false })
    .limit(EVIDENCE_LIMIT);

  if (!ftsError && ftsResults && ftsResults.length > 0) {
    return ftsResults as Article[];
  }

  // Fallback: naive keyword ILIKE search across title + summary using the
  // first few significant words of the search query / raw claim.
  const keywords = searchQuery
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5);

  if (keywords.length === 0) {
    keywords.push(...rawClaim.split(/\s+/).filter((w) => w.length > 2).slice(0, 5));
  }

  if (keywords.length === 0) {
    return [];
  }

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

  return (likeResults ?? []) as Article[];
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

  const db = supabaseServer();

  // Create the initial pending claim row.
  const { data: insertedClaim, error: insertError } = await db
    .from("claims")
    .insert({ user_text: rawClaim, status: "pending" })
    .select()
    .single();

  if (insertError || !insertedClaim) {
    console.error("[claim-checker] failed to create claim row:", insertError);
    return NextResponse.json(
      { error: "Failed to create claim record." },
      { status: 500 }
    );
  }

  const claimId = insertedClaim.id as string;

  try {
    // Step 1: AI parses/understands the claim.
    const parsed = await parseClaim(rawClaim);

    // Step 2: Search trusted sources/news DB for related evidence.
    const evidence = await searchArticles(parsed.search_query, rawClaim);

    // Step 3 + 4: AI compares evidence and returns a verdict + sources.
    const result = await generateVerdict(parsed.normalized_claim, rawClaim, evidence);

    const { data: updatedClaim, error: updateError } = await db
      .from("claims")
      .update({
        verdict: result.verdict,
        ai_explanation: result.ai_explanation,
        sources_used: result.sources_used,
        confidence: result.confidence,
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", claimId)
      .select()
      .single();

    if (updateError || !updatedClaim) {
      console.error("[claim-checker] failed to update claim row:", updateError);
      return NextResponse.json(
        { error: "Verdict generated but failed to persist result." },
        { status: 500 }
      );
    }

    return NextResponse.json({ claim: updatedClaim as Claim }, { status: 200 });
  } catch (err) {
    console.error("[claim-checker] pipeline failed:", err);

    await db
      .from("claims")
      .update({ status: "failed", processed_at: new Date().toISOString() })
      .eq("id", claimId);

    return NextResponse.json(
      { error: "Claim checker pipeline failed. Please try again." },
      { status: 502 }
    );
  }
}
