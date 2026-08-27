// Backfill script: finds a real, headline-relevant photo (via the
// Openverse API) for existing articles that don't have an image yet
// (image_url IS NULL) — e.g. articles ingested before the RSS pipeline
// started searching for fallback images automatically (see
// findFallbackImageForHeadline() in src/lib/imageSearch.ts, now called
// from src/lib/rss.ts for every newly-ingested article).
//
// RUN MANUALLY from the command line — not part of the app's runtime:
//
//   node --env-file=.env.local scripts/backfill-article-images.mjs
//
// Safe to re-run: only ever selects rows where image_url IS NULL, so it
// can be interrupted and resumed, and never overwrites an image that was
// already found (by this script, by RSS ingestion, or manually).
//
// Mirrors scripts/backfill-embeddings.mjs's structure/behavior:
//   - Queries the actual remaining count dynamically each pass.
//   - Small batches with limited concurrency + a delay between batches,
//     to stay under Openverse's anonymous rate limit (20/min burst,
//     200/day sustained).
//   - Per-article attempt count tracked in memory for this run only; a
//     row that fails MAX_ATTEMPTS times is skipped for the rest of this
//     run (not marked as permanently failed — eligible again next run).
//   - A row where Openverse genuinely has no matching image is left with
//     image_url NULL rather than writing a fake/placeholder URL into the
//     database — the front-end's existing placeholderImage() fallback
//     already covers that case at render time.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars. Run with --env-file=.env.local or export NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY first."
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OPENVERSE_SEARCH_URL = "https://api.openverse.org/v1/images/";
const BATCH_SIZE = 15;
const CONCURRENCY = 3; // matches MAX_CONCURRENT_SEARCHES in lib/imageSearch.ts
const DELAY_BETWEEN_BATCHES_MS = 3000; // conservative: stays well under 20 req/min even at full concurrency
const MAX_ATTEMPTS_PER_ARTICLE = 2;
const REQUEST_TIMEOUT_MS = 8000;

// Duplicated from lib/imageSearch.ts (plain Node script, no TS/path-alias
// resolution) — MUST stay in sync with that file's query-building logic.
function cleanQuery(raw) {
  return raw
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 10)
    .join(" ");
}

async function searchOpenverse(query) {
  const cleaned = cleanQuery(query);
  if (!cleaned) return null;

  const url = `${OPENVERSE_SEARCH_URL}?${new URLSearchParams({
    q: cleaned,
    license: "cc0,pdm",
    category: "photograph",
    mature: "false",
    page_size: "1",
  })}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { "User-Agent": "VerifyPH-ImageBackfill/1.0 (https://verify-ph.vercel.app)" },
  });

  if (!response.ok) {
    throw new Error(`Openverse HTTP ${response.status}`);
  }

  const data = await response.json();
  const first = data.results?.[0];
  return first?.thumbnail ?? first?.url ?? null;
}

async function findImageForArticle(article) {
  const primary = await searchOpenverse(article.title);
  if (primary) return primary;

  if (article.category) {
    const broadened = await searchOpenverse(`${article.category} Philippines news`);
    if (broadened) return broadened;
  }

  return null; // Openverse genuinely has nothing relevant — leave NULL.
}

async function fetchNullImageBatch(excludeIds) {
  let query = db
    .from("articles")
    .select("id, title, category")
    .is("image_url", null)
    .limit(BATCH_SIZE);

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
    .is("image_url", null);
  if (error) throw error;
  return count ?? 0;
}

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
  const attemptCounts = new Map();
  const exhaustedIds = new Set();

  let found = 0;
  let noMatch = 0; // Openverse ran successfully but had nothing relevant
  let failedThisRun = 0;
  let skippedExhausted = 0;

  console.log(
    `Starting article-image backfill (batch size ${BATCH_SIZE}, concurrency ${CONCURRENCY}, max ${MAX_ATTEMPTS_PER_ARTICLE} attempts/article this run).`
  );

  while (true) {
    const batch = await fetchNullImageBatch(exhaustedIds);
    if (batch.length === 0) break;

    for (const article of batch) totalSelectedIds.add(article.id);

    const batchResults = await runWithConcurrency(batch, CONCURRENCY, async (article) => {
      const attempts = (attemptCounts.get(article.id) ?? 0) + 1;
      attemptCounts.set(article.id, attempts);

      try {
        const imageUrl = await findImageForArticle(article);

        if (!imageUrl) {
          console.log(`[no-match] ${article.id}: ${article.title.slice(0, 60)}`);
          // Not an error — Openverse just has nothing relevant. Don't
          // retry this article again this run (retrying won't change the
          // outcome), but don't treat it as a failure either.
          exhaustedIds.add(article.id);
          return { id: article.id, outcome: "no-match" };
        }

        const { error: updateError } = await db
          .from("articles")
          .update({ image_url: imageUrl })
          .eq("id", article.id);

        if (updateError) throw updateError;

        console.log(`[found] ${article.id} (attempt ${attempts}): ${article.title.slice(0, 60)}`);
        return { id: article.id, outcome: "found" };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[failed] ${article.id} (attempt ${attempts}/${MAX_ATTEMPTS_PER_ARTICLE}): ${message}`);

        if (attempts >= MAX_ATTEMPTS_PER_ARTICLE) {
          exhaustedIds.add(article.id);
        }
        return { id: article.id, outcome: "failed" };
      }
    });

    for (const result of batchResults) {
      if (result.outcome === "found") {
        found++;
      } else if (result.outcome === "no-match") {
        noMatch++;
      } else if (exhaustedIds.has(result.id)) {
        skippedExhausted++;
      } else {
        failedThisRun++;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
  }

  const stillRemaining = await countRemaining();

  console.log("\n=== Article image backfill report ===");
  console.log(`Selected this run:        ${totalSelectedIds.size}`);
  console.log(`Image found & saved:      ${found}`);
  console.log(`No relevant image found (left NULL): ${noMatch}`);
  console.log(`Skipped (attempts exhausted, ${MAX_ATTEMPTS_PER_ARTICLE} tries): ${skippedExhausted}`);
  console.log(`Failed (mid-retry, will retry next loop pass): ${failedThisRun}`);
  console.log(`Still remaining (image_url IS NULL, overall): ${stillRemaining}`);
  console.log("======================================");
  console.log(
    "\nNote: rows left NULL after this script (either 'no-match' or exhausted) still render fine — ArticleCard/ArticleSideCard fall back to a generic seeded placeholder image at render time."
  );
}

main().catch((err) => {
  console.error("Backfill script crashed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
