/**
 * Data layer for fetching articles.
 *
 * - Server components call `fetchArticlesServer()` (direct Supabase query).
 * - Client components call `fetchArticlesClient()` (via /api/articles).
 *
 * Both return the front-end `Article` shape used by presentation components.
 */

import type { Article, ArticleCategory, DbArticle, RealCategory } from "@/types";

// ---------------------------------------------------------------------------
// Mapping helpers: DbArticle (Supabase row) → Article (front-end shape)
//
// Both maps are keyed/valued by RealCategory (not the wider Category), since
// "GENERAL" is the "For You" home-embed slot, not a real DB category — it
// must never appear on either side of a DB category lookup. See CATEGORIES'
// doc comment in src/types/index.ts.
// ---------------------------------------------------------------------------

/** Map DB category (title-case) to the UI constant (SCREAMING_CASE). */
const DB_TO_UI_CATEGORY: Record<ArticleCategory, RealCategory> = {
  "News & Politics": "NEWS & POLITICS",
  Economy: "ECONOMY",
  "Health & Safety": "HEALTH & SAFETY",
  Lifestyle: "LIFESTYLE",
};

/** Map UI category (SCREAMING_CASE) to the DB category (title-case). */
export const UI_TO_DB_CATEGORY: Record<RealCategory, ArticleCategory> = {
  "NEWS & POLITICS": "News & Politics",
  ECONOMY: "Economy",
  "HEALTH & SAFETY": "Health & Safety",
  LIFESTYLE: "Lifestyle",
};

function describeSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);

  const details = ["message", "code", "details", "hint"]
    .map((key) => {
      const value = (error as Record<string, unknown>)[key];
      return typeof value === "string" && value.trim() ? `${key}: ${value}` : null;
    })
    .filter(Boolean);

  return details.length > 0 ? details.join("; ") : "Unknown Supabase query error";
}

function dbArticleToFrontEnd(row: DbArticle): Article {
  return {
    id: row.id,
    category: DB_TO_UI_CATEGORY[row.category],
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
    imageUrl: row.image_url,
  };
}

// ---------------------------------------------------------------------------
// Server-side: direct Supabase query (for server components / route handlers)
// ---------------------------------------------------------------------------

export async function fetchArticlesServer(options?: {
  category?: RealCategory | null;
  limit?: number;
  offset?: number;
}): Promise<Article[]> {
  try {
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
      console.warn("[articles] server fetch failed:", describeSupabaseError(error));
      return [];
    }

    return ((data ?? []) as DbArticle[]).map(dbArticleToFrontEnd);
  } catch (error) {
    console.warn("[articles] server fetch failed:", describeSupabaseError(error));
    return [];
  }
}

// ---------------------------------------------------------------------------
// Client-side: fetch via /api/articles (for client components)
// ---------------------------------------------------------------------------

export async function fetchArticlesClient(options?: {
  category?: RealCategory | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<Article[]> {
  const params = new URLSearchParams();

  if (options?.category) {
    const dbCategory = UI_TO_DB_CATEGORY[options.category];
    if (dbCategory) params.set("category", dbCategory);
  }
  if (options?.search) params.set("search", options.search);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(`/api/articles?${params.toString()}`, {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error("Unable to load articles.");
    }

    const json = await res.json();
    const rows = (json.articles ?? []) as DbArticle[];
    return rows.map(dbArticleToFrontEnd);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Article search timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
