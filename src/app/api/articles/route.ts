import { NextResponse } from "next/server";
import { createSupabaseServiceClient, ARTICLE_COLUMNS } from "@/lib/supabase";
import type { ArticleCategory, DbArticle } from "@/types";

export const dynamic = "force-dynamic";

// "General" is intentionally NOT in this list — it's been retired as a
// real, DB-filterable category (see ArticleCategory / CATEGORIES' doc
// comment in src/types/index.ts). A request for category=General now
// correctly 400s here, same as any other invalid category value — the
// "GENERAL" tab's UI (the "For You" home-embed slot) never calls this
// route with that value; see ForYouView.tsx / /feed/page.tsx.
const VALID_CATEGORIES: ArticleCategory[] = [
  "News & Politics",
  "Economy",
  "Health & Safety",
  "Lifestyle",
];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const SEARCH_CANDIDATE_LIMIT = 250;

/**
 * Normalise text before comparing it so a search such as "rene" can also
 * match the same name when a publisher writes it with an accent. The final
 * comparison still requires whole words, so it never treats "renewable" as
 * a match for "rene".
 */
function normaliseSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase();
}

function getSearchTerms(search: string): string[] {
  return Array.from(
    new Set(normaliseSearchText(search).match(/[\p{L}\p{N}]+/gu) ?? []),
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Return true only when every searched term occurs as a complete word. */
function articleContainsSearchTerms(article: DbArticle, terms: string[]): boolean {
  const searchableText = normaliseSearchText(
    `${article.title} ${article.summary ?? ""}`,
  );

  return terms.every((term) => {
    const wholeWord = new RegExp(
      `(?:^|[^\\p{L}\\p{N}])${escapeRegex(term)}(?=$|[^\\p{L}\\p{N}])`,
      "u",
    );
    return wholeWord.test(searchableText);
  });
}

/**
 * GET /api/articles
 *
 * Query params:
 *   category  — one of the ArticleCategory values (optional; omit for all)
 *   search    — free-text keyword search across title/summary (optional)
 *   limit     — number of articles to return (default 20, max 100)
 *   offset    — pagination offset (default 0)
 *   featured  — "true" to return only the single most recent article (hero)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const categoryParam = url.searchParams.get("category");
  const searchParam = url.searchParams.get("search");
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  const featuredParam = url.searchParams.get("featured");

  const limit = Math.min(
    Math.max(1, parseInt(limitParam ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    MAX_LIMIT,
  );
  const offset = Math.max(0, parseInt(offsetParam ?? "0", 10) || 0);

  // Validate category if provided.
  let category: ArticleCategory | null = null;
  if (categoryParam) {
    const matched = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === categoryParam.toLowerCase(),
    );
    if (!matched) {
      return NextResponse.json(
        { error: `Invalid category. Valid options: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 },
      );
    }
    category = matched;
  }

  const supabase = createSupabaseServiceClient();

  const search = searchParam?.trim();
  if (search) {
    const terms = getSearchTerms(search);

    // A punctuation-only query has no searchable words. Treat it as an
    // empty result instead of sending invalid full-text syntax to Supabase.
    if (terms.length === 0) {
      return NextResponse.json({
        articles: [],
        pagination: { total: 0, limit, offset },
      });
    }

    // Full-text search keeps this request narrow in Supabase. We then apply
    // the stricter whole-word check below: full-text search can stem words,
    // which is useful for candidates but too loose for the results shown to
    // a reader (for example, "rene" should not show "renewable").
    const makeSearchQuery = (column: "title" | "summary") => {
      let searchQuery = supabase
        .from("articles")
        .select(ARTICLE_COLUMNS)
        .textSearch(column, search, { config: "english", type: "websearch" })
        .order("published_at", { ascending: false })
        .limit(SEARCH_CANDIDATE_LIMIT);

      if (category) {
        searchQuery = searchQuery.eq("category", category);
      }

      return searchQuery;
    };

    const [titleResult, summaryResult] = await Promise.all([
      makeSearchQuery("title"),
      makeSearchQuery("summary"),
    ]);

    if (titleResult.error || summaryResult.error) {
      console.error("[api/articles] search query failed:", titleResult.error ?? summaryResult.error);
      return NextResponse.json(
        { error: "Failed to search articles." },
        { status: 500 },
      );
    }

    const uniqueArticles = new Map<string, DbArticle>();
    for (const article of [...(titleResult.data ?? []), ...(summaryResult.data ?? [])] as DbArticle[]) {
      uniqueArticles.set(article.id, article);
    }

    const matchedArticles = Array.from(uniqueArticles.values())
      .filter((article) => articleContainsSearchTerms(article, terms))
      .sort(
        (left, right) =>
          new Date(right.published_at).getTime() - new Date(left.published_at).getTime(),
      );

    const articles = featuredParam === "true"
      ? matchedArticles.slice(0, 1)
      : matchedArticles.slice(offset, offset + limit);

    return NextResponse.json({
      articles,
      pagination: {
        total: matchedArticles.length,
        limit,
        offset,
      },
    });
  }

  let query = supabase
    .from("articles")
    .select(ARTICLE_COLUMNS, { count: "exact" })
    .order("published_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  if (featuredParam === "true") {
    // Return only the single latest article.
    query = query.limit(1);
  } else {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[api/articles] query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles." },
      { status: 500 },
    );
  }

  const articles = (data ?? []) as DbArticle[];

  return NextResponse.json({
    articles,
    pagination: {
      total: count ?? 0,
      limit,
      offset,
    },
  });
}
