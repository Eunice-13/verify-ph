import Parser from "rss-parser";
import type { SupabaseClient } from "@supabase/supabase-js";

import { TRUSTED_RSS_SOURCES } from "@/lib/sources";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { embedArticleAndStore } from "@/lib/embeddings";
import type {
  ArticleCategory,
  ArticleInsert,
  IngestionResult,
  SourceIngestionResult,
  TrustedRssSource,
} from "@/types";

const MAX_ARTICLES_PER_FEED = 50;
const RSS_REQUEST_TIMEOUT_MS = 15_000;

// Bound how many articles get embedded concurrently per ingestion run, to
// stay well under Gemini's embedding rate limits — RSS ingestion runs on a
// schedule (cron) and could otherwise fire dozens of embedding calls at
// once if a feed has many new articles.
const EMBEDDING_CONCURRENCY = 4;

type ParsedRssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  "content:encoded"?: string;
  "content:encodedSnippet"?: string;
  enclosure?: {
    url?: string;
  };
  categories?: string[];
  /** Media RSS (http://search.yahoo.com/mrss/) image fields — captured via
   * the parser's customFields config below since rss-parser doesn't expose
   * these by default. Value shape varies: some feeds emit an attribute
   * (`$.url`), others wrap the tag's own CDATA/text content instead. */
  "media:content"?: { $?: { url?: string }; _?: string } | string;
  "media:thumbnail"?: { $?: { url?: string }; _?: string } | string;
};

const parser = new Parser<Record<string, unknown>, ParsedRssItem>({
  customFields: {
    item: ["media:content", "media:thumbnail"],
  },
});

/** Runs `items` through `worker` with at most `concurrency` in flight at once. */
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    const index = nextIndex++;
    if (index >= items.length) return;
    await worker(items[index]);
    await runNext();
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runNext());
  await Promise.all(workers);
}

const CATEGORY_RULES: ReadonlyArray<{
  category: ArticleCategory;
  keywords: readonly string[];
}> = [
  {
    category: "Health & Safety",
    keywords: [
      "health",
      "hospital",
      "medical",
      "disease",
      "outbreak",
      "dengue",
      "leptospirosis",
      "covid",
      "mpox",
      "vaccine",
      "weather",
      "typhoon",
      "storm",
      "flood",
      "rainfall",
      "earthquake",
      "volcano",
      "disaster",
      "emergency",
      "safety",
      "scam",
      "fraud",
      "environment",
      "climate",
      "nature",
      "wildlife",
      "pollution",
      "kalusugan",
      "bagyo",
      "baha",
      "lindol",
      "sakuna",
    ],
  },
  {
    category: "Economy",
    keywords: [
      "economy",
      "economic",
      "business",
      "money",
      "market",
      "markets",
      "trade",
      "finance",
      "financial",
      "stock",
      "stocks",
      "peso",
      "bank",
      "banking",
      "corporate",
      "company",
      "industry",
      "agribusiness",
      "property",
      "ekonomiya",
    ],
  },
  {
    category: "Lifestyle",
    keywords: [
      "sports",
      "sport",
      "basketball",
      "volleyball",
      "football",
      "boxing",
      "showbiz",
      "entertainment",
      "celebrity",
      "lifestyle",
      "technology",
      "tech",
      "gadget",
      "gadgets",
      "gaming",
      "esports",
      "travel",
      "food",
      "fashion",
      "music",
      "movie",
      "film",
      "television",
      "palakasan",
    ],
  },
  {
    category: "News & Politics",
    keywords: [
      "politics",
      "political",
      "election",
      "government",
      "senate",
      "congress",
      "nation",
      "national",
      "newsinfo",
      "globalnation",
      "crime",
      "police",
      "court",
      "justice",
      "world",
      "global",
      "philippines",
      "metro",
      "region",
      "topstories",
      "halalan",
      "gobyerno",
      "krimen",
    ],
  },
];

const GENERIC_RSS_CATEGORIES = new Set(["latest", "latest news", "news", "articles", "top stories"]);

function cleanText(value: string | undefined, maxLength: number): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, maxLength).trim();
}

function toHttpUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim());

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function imageUrlFromContent(content: string | undefined): string | null {
  if (!content) {
    return null;
  }

  const match = content.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  return toHttpUrl(match?.[1]);
}

/** Extracts a usable image URL out of a Media RSS field, which rss-parser
 * may hand back either as `{ $: { url } }` (attribute form) or as a plain
 * string/CDATA blob that itself contains an `<img src="...">` tag. */
function imageUrlFromMediaField(
  field: { $?: { url?: string }; _?: string } | string | undefined,
): string | null {
  if (!field) {
    return null;
  }

  if (typeof field === "string") {
    return toHttpUrl(field) ?? imageUrlFromContent(field);
  }

  return toHttpUrl(field.$?.url) ?? imageUrlFromContent(field._);
}

function imageUrlFromItem(item: ParsedRssItem): string | null {
  return (
    toHttpUrl(item.enclosure?.url) ??
    imageUrlFromMediaField(item["media:content"]) ??
    imageUrlFromMediaField(item["media:thumbnail"]) ??
    imageUrlFromContent(item.content) ??
    imageUrlFromContent(item["content:encoded"])
  );
}

function publishedAtFromItem(item: ParsedRssItem): string | null {
  const value = item.isoDate ?? item.pubDate;

  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function normalizeCategoryText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFromText(value: string | undefined): ArticleCategory | null {
  const normalizedValue = normalizeCategoryText(value ?? "");

  if (!normalizedValue) {
    return null;
  }

  const paddedValue = ` ${normalizedValue} `;
  let bestMatch: { category: ArticleCategory; score: number } | null = null;

  for (const rule of CATEGORY_RULES) {
    const score = rule.keywords.reduce(
      (total, keyword) => total + Number(paddedValue.includes(` ${keyword} `)),
      0,
    );

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { category: rule.category, score };
    }
  }

  return bestMatch?.category ?? null;
}

function categoryFromRssCategories(categories: string[] | undefined): ArticleCategory | null {
  for (const category of categories ?? []) {
    const normalizedCategory = normalizeCategoryText(category);

    if (!normalizedCategory || GENERIC_RSS_CATEGORIES.has(normalizedCategory)) {
      continue;
    }

    const mappedCategory = categoryFromText(normalizedCategory);

    if (mappedCategory) {
      return mappedCategory;
    }
  }

  return null;
}

function categoryFromArticleUrl(sourceUrl: string): ArticleCategory | null {
  try {
    const url = new URL(sourceUrl);
    return categoryFromText(`${url.hostname} ${url.pathname}`);
  } catch {
    return null;
  }
}

function mapCategory(
  item: ParsedRssItem,
  sourceUrl: string,
  fallback: ArticleCategory,
): ArticleCategory {
  const rssCategory = categoryFromRssCategories(item.categories);
  const urlCategory = categoryFromArticleUrl(sourceUrl);
  const textCategory = categoryFromText(`${item.title ?? ""} ${item.contentSnippet ?? item.content ?? ""}`);
  const publisherCategory = rssCategory ?? urlCategory;

  // A broad publisher section such as "Nation" should not hide a clear disaster,
  // health, scam, economy, sports, or entertainment signal in the article itself.
  if (
    publisherCategory === "News & Politics" &&
    textCategory !== null &&
    textCategory !== "News & Politics"
  ) {
    return textCategory;
  }

  return publisherCategory ?? textCategory ?? fallback;
}

function normalizeItem(item: ParsedRssItem, source: TrustedRssSource): ArticleInsert | null {
  const title = cleanText(item.title, 500);
  const sourceUrl = toHttpUrl(item.link);
  const publishedAt = publishedAtFromItem(item);

  if (!title || !sourceUrl || !publishedAt) {
    return null;
  }

  return {
    title,
    summary: cleanText(
      item.contentSnippet ?? item["content:encodedSnippet"] ?? item.content ?? item["content:encoded"],
      1_000,
    ),
    source_url: sourceUrl,
    source_name: source.name,
    published_at: publishedAt,
    category: mapCategory(item, sourceUrl, source.fallbackCategory),
    image_url: imageUrlFromItem(item),
  };
}

async function fetchFeed(source: TrustedRssSource) {
  const response = await fetch(source.feedUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "VerifyPH RSS Ingestion/1.0",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(RSS_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`RSS request failed with status ${response.status}`);
  }

  return parser.parseString(await response.text());
}

async function ingestSource(
  supabase: SupabaseClient,
  source: TrustedRssSource,
): Promise<SourceIngestionResult> {
  let fetched = 0;
  let accepted = 0;

  try {
    const feed = await fetchFeed(source);
    fetched = feed.items.length;
    const articles = feed.items
      .slice(0, MAX_ARTICLES_PER_FEED)
      .map((item) => normalizeItem(item, source))
      .filter((article): article is ArticleInsert => article !== null);
    accepted = articles.length;

    if (articles.length === 0) {
      return {
        sourceId: source.id,
        sourceName: source.name,
        fetched,
        accepted: 0,
        inserted: 0,
        updated: 0,
        duplicatesIgnored: 0,
      };
    }

    const sourceUrls = [...new Set(articles.map((article) => article.source_url))];
    const { data: existingArticles, error: existingArticlesError } = await supabase
      .from("articles")
      .select("id, source_url, category, title, summary")
      .in("source_url", sourceUrls);

    if (existingArticlesError) {
      throw existingArticlesError;
    }

    const existingByUrl = new Map(
      (existingArticles ?? []).map((article) => [article.source_url, article]),
    );
    const newArticles = articles.filter((article) => !existingByUrl.has(article.source_url));
    const articlesToRecategorize = articles.filter((article) => {
      const existing = existingByUrl.get(article.source_url);
      return existing !== undefined && existing.category !== article.category;
    });

    const [insertResult, recategorizeResult] = await Promise.all([
      newArticles.length > 0
        ? supabase
            .from("articles")
            .upsert(newArticles, {
              onConflict: "source_url",
              ignoreDuplicates: true,
            })
            .select("id, source_url, title, summary")
        : Promise.resolve({ data: [], error: null }),
      articlesToRecategorize.length > 0
        ? supabase
            .from("articles")
            .upsert(articlesToRecategorize, { onConflict: "source_url" })
            .select("id, source_url, title, summary")
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (insertResult.error ?? recategorizeResult.error) {
      throw insertResult.error ?? recategorizeResult.error;
    }

    const inserted = insertResult.data?.length ?? 0;
    const updated = recategorizeResult.data?.length ?? 0;

    // Generate embeddings server-side for articles that need one:
    //   - Every newly inserted article (never embedded before).
    //   - Recategorized articles whose title/summary actually changed —
    //     a category-only change doesn't affect the embedding, so
    //     re-embedding would just waste a Gemini call for no benefit.
    // Duplicates that were ignored entirely (same source_url, same
    // category, unchanged title/summary) never appear in either upsert
    // result above, so they're naturally excluded here.
    //
    // Embedding failures are logged and otherwise ignored — per spec, an
    // embedding failure must never cause the article itself to be lost.
    // The row simply keeps embedding = NULL and will be picked up by a
    // later run of scripts/backfill-embeddings.mjs.
    const recategorizedWithTextChange = (recategorizeResult.data ?? []).filter((row) => {
      const existing = existingByUrl.get(row.source_url);
      return existing !== undefined && (existing.title !== row.title || existing.summary !== row.summary);
    });

    const articlesNeedingEmbedding = [...(insertResult.data ?? []), ...recategorizedWithTextChange];

    if (articlesNeedingEmbedding.length > 0) {
      await runWithConcurrency(articlesNeedingEmbedding, EMBEDDING_CONCURRENCY, async (article) => {
        const ok = await embedArticleAndStore(supabase, {
          id: article.id,
          title: article.title,
          summary: article.summary,
        });
        if (!ok) {
          console.warn(`[rss] embedding generation failed for article ${article.id} (will retry via backfill script)`);
        }
      });
    }

    return {
      sourceId: source.id,
      sourceName: source.name,
      fetched,
      accepted,
      inserted,
      updated,
      duplicatesIgnored: accepted - inserted - updated,
    };
  } catch (error) {
    console.error(`RSS ingestion failed for ${source.name}:`, error);

    return {
      sourceId: source.id,
      sourceName: source.name,
      fetched,
      accepted,
      inserted: 0,
      updated: 0,
      duplicatesIgnored: 0,
      error: "Unable to fetch or save this source.",
    };
  }
}

export async function ingestTrustedRssFeeds(): Promise<IngestionResult> {
  // Validate server-only configuration once before any network request begins.
  const supabase = createSupabaseServiceClient();
  const sources = await Promise.all(
    TRUSTED_RSS_SOURCES.map((source) => ingestSource(supabase, source)),
  );
  const failedSources = sources.filter((source) => source.error).length;
  const inserted = sources.reduce((total, source) => total + source.inserted, 0);
  const updated = sources.reduce((total, source) => total + source.updated, 0);

  return {
    status: failedSources === 0 ? "ok" : inserted + updated > 0 ? "partial" : "failed",
    totals: {
      fetched: sources.reduce((total, source) => total + source.fetched, 0),
      accepted: sources.reduce((total, source) => total + source.accepted, 0),
      inserted,
      updated,
      duplicatesIgnored: sources.reduce((total, source) => total + source.duplicatesIgnored, 0),
      failedSources,
    },
    sources,
  };
}
