// Backfill script: finds the original publisher image for existing articles
// that don't have one yet (image_url IS NULL). It reads the article page's
// Open Graph/Twitter metadata instead of searching stock photography, so a
// card never receives a photo unrelated to its headline.
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
//     to stay respectful of publisher websites.
//   - Per-article attempt count tracked in memory for this run only; a
//     row that fails MAX_ATTEMPTS times is skipped for the rest of this
//     run (not marked as permanently failed — eligible again next run).
//   - A row whose publisher exposes no usable image is left with image_url
//     NULL. The front end shows an intentional image-unavailable state,
//     never an unrelated stock photo.

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

const BATCH_SIZE = 15;
const CONCURRENCY = 3;
const DELAY_BETWEEN_BATCHES_MS = 3000;
const MAX_ATTEMPTS_PER_ARTICLE = 2;
const PUBLISHER_IMAGE_REQUEST_TIMEOUT_MS = 10_000;
const MAX_PUBLISHER_PAGE_BYTES = 1_500_000;
const IMAGE_META_NAMES = new Set([
  "og:image",
  "og:image:url",
  "twitter:image",
  "twitter:image:src",
]);
const IMAGE_URL_ATTRIBUTES = ["data-src", "data-lazy-src", "data-original", "data-image", "src"];
const ARTICLE_SCHEMA_TYPES = new Set(["article", "newsarticle", "reportagenewsarticle"]);
const NON_ARTICLE_IMAGE_HINTS = /(?:logo|icon|avatar|profile|author|advertisement|\/ads?\/|tracking|pixel|spacer|placeholder)/i;

function toHttpUrl(value, baseUrl) {
  if (!value) return null;

  try {
    const url = new URL(value.trim(), baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function metaAttribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(`\\b${escapedName}\\s*=\\s*(?:["']([^"']*)["']|([^\\s>]+))`, "i")
  );
  return match?.[1] ?? match?.[2] ?? null;
}

function imageUrlFromTag(tag, pageUrl) {
  for (const attribute of IMAGE_URL_ATTRIBUTES) {
    const imageUrl = toHttpUrl(metaAttribute(tag, attribute), pageUrl);
    if (imageUrl && !NON_ARTICLE_IMAGE_HINTS.test(imageUrl)) return imageUrl;
  }

  const srcSet = metaAttribute(tag, "data-srcset") ?? metaAttribute(tag, "srcset");
  if (!srcSet) return null;

  for (const candidate of srcSet.split(",").map((value) => value.trim().split(/\s+/)[0]).reverse()) {
    const imageUrl = toHttpUrl(candidate, pageUrl);
    if (imageUrl && !NON_ARTICLE_IMAGE_HINTS.test(imageUrl)) return imageUrl;
  }

  return null;
}

function imageUrlFromImageValue(value, pageUrl) {
  if (typeof value === "string") return toHttpUrl(value, pageUrl);
  if (Array.isArray(value)) {
    for (const item of value) {
      const imageUrl = imageUrlFromImageValue(item, pageUrl);
      if (imageUrl) return imageUrl;
    }
    return null;
  }
  if (value && typeof value === "object") {
    return imageUrlFromImageValue(value.url, pageUrl) ?? imageUrlFromImageValue(value.contentUrl, pageUrl);
  }
  return null;
}

function imageUrlFromArticleSchema(value, pageUrl) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const imageUrl = imageUrlFromArticleSchema(item, pageUrl);
      if (imageUrl) return imageUrl;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;

  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.some((type) => typeof type === "string" && ARTICLE_SCHEMA_TYPES.has(type.toLowerCase()))) {
    const imageUrl = imageUrlFromImageValue(value.image, pageUrl);
    if (imageUrl && !NON_ARTICLE_IMAGE_HINTS.test(imageUrl)) return imageUrl;
  }

  for (const nestedValue of Object.values(value)) {
    const imageUrl = imageUrlFromArticleSchema(nestedValue, pageUrl);
    if (imageUrl) return imageUrl;
  }
  return null;
}

function imageUrlFromJsonLd(html, pageUrl) {
  const scripts = html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json[^"']*["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const script of scripts) {
    const content = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      const imageUrl = imageUrlFromArticleSchema(JSON.parse(content), pageUrl);
      if (imageUrl) return imageUrl;
    } catch {
      // Ignore malformed publisher JSON-LD and keep checking the page.
    }
  }
  return null;
}

function imageUrlFromArticleBody(html, pageUrl) {
  const contentBlocks = html.match(/<(?:article|main|figure)\b[^>]*>[\s\S]*?<\/(?:article|main|figure)>/gi) ?? [];
  for (const block of contentBlocks) {
    const imageTags = block.match(/<img\b[^>]*>/gi) ?? [];
    for (const tag of imageTags) {
      const imageUrl = imageUrlFromTag(tag, pageUrl);
      if (imageUrl) return imageUrl;
    }
  }
  return null;
}

function publisherImageUrlFromHtml(html, pageUrl) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const metaName = metaAttribute(tag, "property") ?? metaAttribute(tag, "name");
    if (!metaName || !IMAGE_META_NAMES.has(metaName.toLowerCase())) continue;

    const imageUrl = toHttpUrl(metaAttribute(tag, "content"), pageUrl);
    if (imageUrl) return imageUrl;
  }

  return imageUrlFromJsonLd(html, pageUrl) ?? imageUrlFromArticleBody(html, pageUrl);
}

async function findPublisherImageUrl(articleUrl) {
  const safeArticleUrl = toHttpUrl(articleUrl);
  if (!safeArticleUrl) return null;

  const response = await fetch(safeArticleUrl, {
    signal: AbortSignal.timeout(PUBLISHER_IMAGE_REQUEST_TIMEOUT_MS),
    headers: {
      "User-Agent": "VerifyPH Image Backfill/1.0 (https://verify-ph.vercel.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) return null;

  const contentType = response.headers.get("content-type");
  if (contentType && !/(?:text\/html|application\/xhtml\+xml)/i.test(contentType)) return null;

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_PUBLISHER_PAGE_BYTES) return null;

  return publisherImageUrlFromHtml(await response.text(), response.url);
}

async function findImageForArticle(article) {
  return findPublisherImageUrl(article.source_url);
}

async function fetchNullImageBatch(excludeIds) {
  let query = db
    .from("articles")
    .select("id, title, source_url")
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
  let noMatch = 0; // Publisher page had no readable image metadata
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
          // Not an error — the publisher has no readable image metadata.
          // Don't retry this article again this run, but leave it eligible
          // for a future run in case the publisher adds an image later.
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
  console.log(`No publisher image found (left NULL): ${noMatch}`);
  console.log(`Skipped (attempts exhausted, ${MAX_ATTEMPTS_PER_ARTICLE} tries): ${skippedExhausted}`);
  console.log(`Failed (mid-retry, will retry next loop pass): ${failedThisRun}`);
  console.log(`Still remaining (image_url IS NULL, overall): ${stillRemaining}`);
  console.log("======================================");
  console.log(
    "\nNote: rows left NULL after this script render an intentional image-unavailable state rather than an unrelated stock photo."
  );
}

main().catch((err) => {
  console.error("Backfill script crashed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
