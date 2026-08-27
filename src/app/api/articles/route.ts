import { NextResponse } from "next/server";
import { createSupabaseServiceClient, ARTICLE_COLUMNS } from "@/lib/supabase";
import type { ArticleCategory, DbArticle } from "@/types";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES: ArticleCategory[] = [
  "News & Politics",
  "Economy",
  "Health & Safety",
  "Lifestyle",
  "General",
];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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

  let query = supabase
    .from("articles")
    .select(ARTICLE_COLUMNS, { count: "exact" })
    .order("published_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  // Free-text keyword search across title and summary.
  const search = searchParam?.trim();
  if (search) {
    const escaped = search.replace(/[%_,]/g, (m) => `\\${m}`);
    query = query.or(`title.ilike.%${escaped}%,summary.ilike.%${escaped}%`);
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
