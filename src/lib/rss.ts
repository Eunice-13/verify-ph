import Parser from "rss-parser";
import type { SupabaseClient } from "@supabase/supabase-js";

import { TRUSTED_RSS_SOURCES } from "@/lib/sources";
import { createSupabaseServiceClient } from "@/lib/supabase";
import type {
  ArticleCategory,
  ArticleInsert,
  IngestionResult,
  SourceIngestionResult,
  TrustedRssSource,
} from "@/types";

const MAX_ARTICLES_PER_FEED = 50;
const RSS_REQUEST_TIMEOUT_MS = 15_000;

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
};

const parser = new Parser();

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

function imageUrlFromItem(item: ParsedRssItem): string | null {
  return (
    toHttpUrl(item.enclosure?.url) ??
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
      .select("source_url, category")
      .in("source_url", sourceUrls);

    if (existingArticlesError) {
      throw existingArticlesError;
    }

    const existingCategories = new Map(
      (existingArticles ?? []).map((article) => [article.source_url, article.category]),
    );
    const newArticles = articles.filter((article) => !existingCategories.has(article.source_url));
    const articlesToRecategorize = articles.filter((article) => {
      const existingCategory = existingCategories.get(article.source_url);
      return existingCategory !== undefined && existingCategory !== article.category;
    });

    const [insertResult, recategorizeResult] = await Promise.all([
      newArticles.length > 0
        ? supabase
            .from("articles")
            .upsert(newArticles, {
              onConflict: "source_url",
              ignoreDuplicates: true,
            })
            .select("id")
        : Promise.resolve({ data: [], error: null }),
      articlesToRecategorize.length > 0
        ? supabase
            .from("articles")
            .upsert(articlesToRecategorize, { onConflict: "source_url" })
            .select("id")
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (insertResult.error ?? recategorizeResult.error) {
      throw insertResult.error ?? recategorizeResult.error;
    }

    const inserted = insertResult.data?.length ?? 0;
    const updated = recategorizeResult.data?.length ?? 0;

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
