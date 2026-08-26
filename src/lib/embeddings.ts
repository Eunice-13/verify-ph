// Semantic/embedding search helpers for the claim-checker.
//
// Complements the keyword-based search in src/app/api/claim-checker/route.ts
// (full-text search + scored ILIKE fallback). Keyword matching has a hard
// ceiling: it cannot handle paraphrase. A claim like "DOH warns of dengue
// surge in Metro Manila" will never keyword-match an article titled "Cases
// of the mosquito-borne illness spike in NCR, health department says" no
// matter how many synonyms are hardcoded. Embeddings solve this by
// comparing meaning (vector similarity) rather than literal words.
//
// REQUIRES: the `embedding vector(768)` column added by migration
// supabase/migrations/20260826102729_add_article_embeddings.sql. If that
// migration hasn't been applied yet to the live database, every function
// here degrades gracefully (returns empty results / null) rather than
// throwing, so semantic search is additive and never blocks the existing
// keyword pipeline.

import { GoogleGenAI } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase";
import type { DbArticle } from "@/types";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey ?? "" });

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

/**
 * Builds the exact text embedded for an article: normalized title +
 * summary. Must be used identically by the backfill script
 * (scripts/backfill-embeddings.mjs) and RSS ingestion (src/lib/rss.ts) so
 * corpus embeddings stay comparable — a divergence here (e.g. one path
 * adding a label prefix the other doesn't) would silently degrade cosine
 * similarity quality for every article embedded on the inconsistent path.
 *
 * Article text passed in is already HTML/whitespace-cleaned by rss.ts's
 * cleanText() before being stored, but this additionally collapses
 * whitespace and trims defensively in case this is ever called on
 * un-cleaned text (e.g. a future manual re-embed of an old row).
 */
export function buildArticleEmbeddingInput(title: string, summary: string | null): string {
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
  const normalizedTitle = normalize(title);
  const normalizedSummary = normalize(summary ?? "");
  return `title: ${normalizedTitle} | summary: ${normalizedSummary}`;
}

/**
 * Embeds a single piece of text using Gemini's embedding model.
 * `taskType` should be "RETRIEVAL_QUERY" for a user's claim/search query,
 * or "RETRIEVAL_DOCUMENT" for an article being indexed — using matched
 * asymmetric task types significantly improves retrieval quality over
 * embedding both sides the same way.
 */
export async function embedText(
  text: string,
  taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT" | "FACT_VERIFICATION"
): Promise<number[] | null> {
  try {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: {
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) return null;

    // gemini-embedding-001 requires manual normalization for non-3072
    // dimensions (gemini-embedding-2 does this automatically, but we're
    // intentionally on the -001 model for its lower per-call cost and
    // RETRIEVAL_QUERY/RETRIEVAL_DOCUMENT/FACT_VERIFICATION task_type support).
    const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) return values;
    return values.map((v) => v / norm);
  } catch (err) {
    console.error("[embeddings] embedText failed:", err);
    return null;
  }
}

/**
 * Embeds one article's title/summary and writes the resulting vector to
 * its row via the service-role client. Used by RSS ingestion (src/lib/rss.ts)
 * so new/changed articles get an embedding as part of ingestion, and by
 * scripts/backfill-embeddings.mjs for existing rows.
 *
 * Never throws — returns a boolean so callers (ingestion in particular)
 * can log a failure without losing the article itself. On failure the
 * row's embedding is simply left as NULL (or unchanged), to be picked up
 * by a later backfill run.
 */
export async function embedArticleAndStore(
  db: SupabaseClient,
  article: { id: string; title: string; summary: string | null }
): Promise<boolean> {
  try {
    const text = buildArticleEmbeddingInput(article.title, article.summary);
    const embedding = await embedText(text, "RETRIEVAL_DOCUMENT");
    if (!embedding) {
      console.warn(`[embeddings] embedText returned null for article ${article.id}`);
      return false;
    }

    const { error } = await db
      .from("articles")
      .update({ embedding })
      .eq("id", article.id);

    if (error) {
      console.warn(`[embeddings] failed to store embedding for article ${article.id}:`, error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[embeddings] embedArticleAndStore threw for article ${article.id}:`, err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Semantic search: embeds the claim/query and finds the nearest articles by
 * cosine similarity via pgvector. Returns an empty array (never throws) if
 * the embedding column doesn't exist yet (migration not applied) or if
 * embedding the query fails for any reason — callers should treat this as
 * "no semantic results available" and rely on keyword search alone.
 */
export async function searchArticlesBySemanticSimilarity(
  claimText: string,
  limit: number
): Promise<DbArticle[]> {
  const queryEmbedding = await embedText(claimText, "FACT_VERIFICATION");
  if (!queryEmbedding) return [];

  try {
    const db = supabaseServer();

    // Uses a Postgres function (see migration file for the `match_articles`
    // function this depends on — included below) because pgvector's
    // cosine-distance operator (<=>) isn't expressible through the
    // PostgREST query builder directly.
    const { data, error } = await db.rpc("match_articles", {
      query_embedding: queryEmbedding,
      match_count: limit,
    });

    if (error) {
      // Most likely cause: the embedding column/function doesn't exist yet
      // because the migration hasn't been applied. Degrade silently.
      console.warn("[embeddings] semantic search unavailable:", error.message);
      return [];
    }

    return (data ?? []) as DbArticle[];
  } catch (err) {
    console.error("[embeddings] semantic search threw:", err);
    return [];
  }
}

/**
 * Reciprocal Rank Fusion: combines a keyword-search ranked list and a
 * semantic-search ranked list into one ranking, without needing the two
 * scores to be on comparable scales (keyword match-count vs. cosine
 * similarity are not directly comparable, so simple score-averaging would
 * be misleading — RRF instead combines based on each item's *rank position*
 * in each list, which is scale-independent and simple to reason about).
 *
 * Formula: for each article, score = sum over each list it appears in of
 * 1 / (k + rank), where rank is its 1-based position in that list. k=60 is
 * the commonly used constant from the original RRF paper (Cormack et al.)
 * and works well without tuning for small result sets like this.
 */
export function reciprocalRankFusion(
  rankedLists: DbArticle[][],
  limit: number
): DbArticle[] {
  const K = 60;
  const scores = new Map<string, { article: DbArticle; score: number }>();

  for (const list of rankedLists) {
    list.forEach((article, index) => {
      const rank = index + 1;
      const existing = scores.get(article.id);
      const contribution = 1 / (K + rank);
      if (existing) {
        existing.score += contribution;
      } else {
        scores.set(article.id, { article, score: contribution });
      }
    });
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.article);
}
