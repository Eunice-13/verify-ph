// Backfill script: computes and stores embeddings for existing articles
// that don't have one yet (embedding IS NULL).
//
// RUN THIS AFTER applying supabase/migrations/20260826102729_add_article_embeddings.sql
// (already applied to the live database as of this writing). Not part of
// the app's runtime — run manually from the command line:
//
//   node --env-file=.env.local scripts/backfill-embeddings.mjs
//
// Safe to re-run: only ever selects rows where embedding IS NULL, so it can
// be interrupted and resumed, and never overwrites an embedding that was
// already successfully computed.
//
// Behavior:
//   - Queries the actual remaining count dynamically each pass (never
//     hardcodes a total article count), so it naturally adapts as RSS
//     ingestion adds new articles between/during runs.
//   - Processes in small batches with limited concurrency (a few articles
//     embedded in parallel per batch, not all at once) to stay under
//     Gemini's embedding rate limits, plus a short delay between batches.
//   - Tracks a per-article attempt count IN MEMORY for this run only (the
//     `articles` table has no persisted attempt-count column, and this
//     script must not modify production schema without separate,
//     explicit approval). A row that fails MAX_ATTEMPTS times in this run
//     is skipped for the rest of the run rather than retried forever, so
//     one permanently-broken row (e.g. malformed text Gemini rejects)
//     cannot stall progress on every other row. It remains eligible for a
//     future run, in case the failure was transient.
//   - Prints a final report: selected, embedded, skipped (attempts
//     exhausted), failed-this-run, and how many still remain NULL overall.
//
// Never logs secret values (API keys, service-role key) — only article
// ids and Gemini/Supabase error messages.

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars. Run with --env-file=.env.local or export GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY first."
  );
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 20;
const CONCURRENCY = 4;
const DELAY_BETWEEN_BATCHES_MS = 1500;
const MAX_ATTEMPTS_PER_ARTICLE = 3;

// Same normalization used by src/lib/embeddings.ts's
// buildArticleEmbeddingInput() — duplicated here rather than imported
// because this is a plain Node script (no TS/path-alias resolution), but
// MUST stay in sync with that function so corpus embeddings computed by
// this script and by RSS ingestion (src/lib/rss.ts) remain comparable.
function buildArticleEmbeddingInput(title, summary) {
  const normalize = (s) => s.replace(/\s+/g, " ").trim();
  return `title: ${normalize(title)} | summary: ${normalize(summary ?? "")}`;
}

function normalizeVector(values) {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return values;
  return values.map((v) => v / norm);
}

async function embedArticle(article) {
  const text = buildArticleEmbeddingInput(article.title, article.summary);
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) throw new Error("No embedding returned");
  return normalizeVector(values);
}

async function fetchNullEmbeddingBatch(excludeIds) {
  let query = db
    .from("articles")
    .select("id, title, summary")
    .is("embedding", null)
    .limit(BATCH_SIZE);

  // Exclude ids we've already exhausted attempts on this run, so the same
  // permanently-failing rows don't keep getting reselected into every
  // subsequent batch ahead of rows we haven't tried yet.
  if (excludeIds.size > 0) {
    query = query.not("id", "in", `(${[...excludeIds].join(",")})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function countRemaining() {
  const { count, error } = await db
    .from("articles")
    .select("*", { count: "exact", head: true })
    .is("embedding", null);
  if (error) throw error;
  return count ?? 0;
}

/** Runs `items` through `worker` with at most `concurrency` in flight at once. */
async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    const index = nextIndex++;
    if (index >= items.length) return;
    results[index] = await worker(items[index]);
    await runNext();
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

async function main() {
  const totalSelectedIds = new Set();
  const attemptCounts = new Map(); // article id -> attempt count, this run only
  const exhaustedIds = new Set(); // ids that hit MAX_ATTEMPTS_PER_ARTICLE this run

  let embedded = 0;
  let failedThisRun = 0;
  let skippedExhausted = 0;

  console.log(`Starting embedding backfill (batch size ${BATCH_SIZE}, concurrency ${CONCURRENCY}, max ${MAX_ATTEMPTS_PER_ARTICLE} attempts/article this run).`);

  while (true) {
    const batch = await fetchNullEmbeddingBatch(exhaustedIds);
    if (batch.length === 0) break;

    for (const article of batch) totalSelectedIds.add(article.id);

    const batchResults = await runWithConcurrency(batch, CONCURRENCY, async (article) => {
      const attempts = (attemptCounts.get(article.id) ?? 0) + 1;
      attemptCounts.set(article.id, attempts);

      try {
        const embedding = await embedArticle(article);
        const { error: updateError } = await db
          .from("articles")
          .update({ embedding })
          .eq("id", article.id);

        if (updateError) throw updateError;

        console.log(`[embedded] ${article.id} (attempt ${attempts}): ${article.title.slice(0, 60)}`);
        return { id: article.id, ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[failed] ${article.id} (attempt ${attempts}/${MAX_ATTEMPTS_PER_ARTICLE}): ${message}`);

        if (attempts >= MAX_ATTEMPTS_PER_ARTICLE) {
          exhaustedIds.add(article.id);
        }
        return { id: article.id, ok: false };
      }
    });

    for (const result of batchResults) {
      if (result.ok) {
        embedded++;
      } else if (exhaustedIds.has(result.id)) {
        // Only counted as "skipped (exhausted)" once it actually stops
        // being retried, i.e. on the attempt that pushed it over the max.
        skippedExhausted++;
      } else {
        failedThisRun++;
      }
    }

    // A row that failed but hasn't exhausted attempts yet will naturally
    // be reselected on the next loop iteration since it's still NULL and
    // not yet in exhaustedIds — no special-casing needed here.

    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
  }

  const stillRemaining = await countRemaining();

  console.log("\n=== Backfill report ===");
  console.log(`Selected this run:        ${totalSelectedIds.size}`);
  console.log(`Embedded successfully:    ${embedded}`);
  console.log(`Skipped (attempts exhausted, ${MAX_ATTEMPTS_PER_ARTICLE} tries): ${skippedExhausted}`);
  console.log(`Failed (mid-retry, will retry next loop pass): ${failedThisRun}`);
  console.log(`Still remaining (embedding IS NULL, overall): ${stillRemaining}`);
  console.log("========================");

  if (skippedExhausted > 0) {
    console.log(
      `\n${skippedExhausted} article(s) failed ${MAX_ATTEMPTS_PER_ARTICLE} times this run and were skipped. Re-run this script later to retry them — they are not marked as permanently failed anywhere, just deferred.`
    );
  }
}

main().catch((err) => {
  console.error("Backfill script crashed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
