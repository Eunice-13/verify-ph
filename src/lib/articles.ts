/**
 * Data layer for fetching articles.
 *
 * - Server components call `fetchArticlesServer()` (direct Supabase query).
 * - Client components call `fetchArticlesClient()` (via /api/articles).
 *
 * Both return the front-end `Article` shape used by presentation components.
 */

import type { Article, ArticleCategory, Category, DbArticle } from "@/types";

// ---------------------------------------------------------------------------
// Mapping helpers: DbArticle (Supabase row) → Article (front-end shape)
// ---------------------------------------------------------------------------

/** Map DB category (title-case) to the UI constant (SCREAMING_CASE). */
const DB_TO_UI_CATEGORY: Record<ArticleCategory, Category> = {
  "News & Politics": "NEWS & POLITICS",
  Economy: "ECONOMY",
  "Health & Safety": "HEALTH & SAFETY",
  Lifestyle: "LIFESTYLE",
  General: "GENERAL",
};

/** Map UI category (SCREAMING_CASE) to the DB category (title-case). */
export const UI_TO_DB_CATEGORY: Record<Category, ArticleCategory> = {
  "NEWS & POLITICS": "News & Politics",
  ECONOMY: "Economy",
  "HEALTH & SAFETY": "Health & Safety",
  LIFESTYLE: "Lifestyle",
  GENERAL: "General",
};

function dbArticleToFrontEnd(row: DbArticle): Article {
  return {
    id: typeof row.id === "string" ? parseInt(row.id, 10) || 0 : Number(row.id),
    category: DB_TO_UI_CATEGORY[row.category] ?? "GENERAL",
    title: row.title,
    excerpt: row.summary ?? "",
    body: "",
    date: row.published_at
      ? new Date(row.published_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "",
    status: "VERIFIED",
    sourceUrl: row.source_url,
    providerName: row.source_name,
  };
}

// ---------------------------------------------------------------------------
// Server-side: direct Supabase query (for server components / route handlers)
// ---------------------------------------------------------------------------

export async function fetchArticlesServer(options?: {
  category?: Category | null;
  limit?: number;
  offset?: number;
}): Promise<Article[]> {
  // Dynamic import to avoid bundling the service-role key in client bundles.
  const { createSupabaseServiceClient, ARTICLE_COLUMNS } = await import("@/lib/supabase");
  const supabase = createSupabaseServiceClient();

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from("articles")
    .select(ARTICLE_COLUMNS)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.category) {
    const dbCategory = UI_TO_DB_CATEGORY[options.category];
    if (dbCategory) {
      query = query.eq("category", dbCategory);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[articles] server fetch failed:", error);
    return [];
  }

  return ((data ?? []) as DbArticle[]).map(dbArticleToFrontEnd);
}

// ---------------------------------------------------------------------------
// Client-side: fetch via /api/articles (for client components)
// ---------------------------------------------------------------------------

export async function fetchArticlesClient(options?: {
  category?: Category | null;
  limit?: number;
  offset?: number;
}): Promise<Article[]> {
  const params = new URLSearchParams();

  if (options?.category) {
    const dbCategory = UI_TO_DB_CATEGORY[options.category];
    if (dbCategory) params.set("category", dbCategory);
  }
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));

  const res = await fetch(`/api/articles?${params.toString()}`);

  if (!res.ok) return [];

  const json = await res.json();
  const rows = (json.articles ?? []) as DbArticle[];
  return rows.map(dbArticleToFrontEnd);
}
