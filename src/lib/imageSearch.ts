// Headline-relevant fallback image search for articles that have no
// extractable image from their RSS feed (see imageUrlFromItem() in
// lib/rss.ts). Used both by the live RSS ingestion pipeline (for newly
// ingested articles) and by scripts/backfill-article-images.mjs (for
// existing rows already in the DB with image_url IS NULL).
//
// Uses the Openverse API (https://openverse.org, operated by WordPress.org
// / Creative Commons) — a search index over openly-licensed images from
// Flickr, Wikimedia Commons, museums, etc. Chosen specifically because:
//   - No API key required (works fully anonymously).
//   - Results can be filtered to CC0 ("no rights reserved") and PDM
//     (Public Domain Mark) licenses only, both of which require NO
//     attribution — important since none of VerifyPH's article cards
//     have a credit-line UI. If this is ever broadened to other CC
//     licenses (e.g. BY, BY-SA), an attribution UI would need to be added
//     first to stay compliant.
//
// Rate limits (anonymous, unauthenticated): 20 requests/minute burst,
// 200/day sustained (per Openverse's published docs). Ingestion only
// searches for genuinely NEW articles per run (see rss.ts), which is
// normally a small number, but a shared, small concurrency gate below
// keeps this well under the burst limit regardless of how many RSS
// sources are being ingested in parallel.

const OPENVERSE_SEARCH_URL = "https://api.openverse.org/v1/images/";
const REQUEST_TIMEOUT_MS = 8_000;

// Global (module-level) concurrency gate — shared across every caller in
// this process, regardless of how many RSS sources are ingesting in
// parallel (see ingestSource() in lib/rss.ts, which runs once per source
// via Promise.all). Keeps simultaneous Openverse requests low enough to
// stay comfortably under the 20/min anonymous burst limit even under a
// large ingestion run.
const MAX_CONCURRENT_SEARCHES = 3;
let activeSearches = 0;
const waitQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeSearches < MAX_CONCURRENT_SEARCHES) {
    activeSearches++;
    return;
  }
  await new Promise<void>((resolve) => waitQueue.push(resolve));
  activeSearches++;
}

function releaseSlot(): void {
  activeSearches--;
  const next = waitQueue.shift();
  if (next) next();
}

interface OpenverseImageResult {
  url?: string;
  thumbnail?: string;
}

interface OpenverseSearchResponse {
  results?: OpenverseImageResult[];
}

/** Strips punctuation and caps query length — Openverse's own full-text
 * search handles ranking, this just avoids sending an overly long or
 * punctuation-heavy string built from a raw headline. */
function cleanQuery(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 10)
    .join(" ");
}

/**
 * Runs a single Openverse search and returns the first result's thumbnail
 * URL (preferred — a served, appropriately sized image on Openverse's own
 * domain, good for a small article card) or its full-size url as a
 * fallback. Returns null on any failure (network error, non-200, zero
 * results) — callers must never treat this as fatal.
 */
async function searchOpenverse(query: string): Promise<string | null> {
  const cleaned = cleanQuery(query);
  if (!cleaned) return null;

  try {
    const url = `${OPENVERSE_SEARCH_URL}?${new URLSearchParams({
      q: cleaned,
      // CC0 + Public Domain Mark only — see file header on why these two
      // specific licenses were chosen (no attribution required).
      license: "cc0,pdm",
      category: "photograph",
      mature: "false",
      page_size: "1",
    })}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "User-Agent": "VerifyPH-ImageFallback/1.0 (https://verify-ph.vercel.app)",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("[imageSearch] Openverse rate limit hit — skipping fallback image for this article.");
      }
      return null;
    }

    const data = (await response.json()) as OpenverseSearchResponse;
    const first = data.results?.[0];
    return first?.thumbnail ?? first?.url ?? null;
  } catch (err) {
    console.warn("[imageSearch] Openverse search failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Finds a real, headline-relevant photo for an article that has no
 * extractable image of its own. Tries the article's headline first; if
 * that yields nothing (common for very specific proper nouns Openverse's
 * index doesn't cover), falls back to a broader, category-based query so
 * the article at least gets a topically relevant photo rather than
 * nothing. Returns null (never throws) if both attempts fail — the caller
 * should keep using its existing generic placeholder in that case.
 */
export async function findFallbackImageForHeadline(
  headline: string,
  category?: string | null
): Promise<string | null> {
  await acquireSlot();
  try {
    const primary = await searchOpenverse(headline);
    if (primary) return primary;

    if (category) {
      const broadened = await searchOpenverse(`${category} Philippines news`);
      if (broadened) return broadened;
    }

    return null;
  } finally {
    releaseSlot();
  }
}
