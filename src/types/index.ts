// Shared TypeScript types and interfaces.

/**
 * The 5 nav/URL-level category tabs. Order here drives the tab order in
 * both Header's dropdown and SubNav (they both just map over this array),
 * and also the ?category= URL param's set of valid values.
 *
 * IMPORTANT: "GENERAL" is NOT a real content category — it's the "For
 * You" home-embed slot (see FOR_YOU_CATEGORY / isForYouCategory() below).
 * It is kept in this array only so `/feed?category=GENERAL` remains a
 * valid, working URL (backward compatibility with existing links/
 * bookmarks) and so it still gets a nav tab. It intentionally has NO
 * corresponding value in the database — see ArticleCategory / RealCategory
 * further down, which are the categories articles can actually be
 * assigned. Never pass "GENERAL" anywhere a DB category is expected.
 */
export const CATEGORIES = [
  "GENERAL",
  "ECONOMY",
  "HEALTH & SAFETY",
  "LIFESTYLE",
  "NEWS & POLITICS",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** The "For You" home-embed slot's Category value — see CATEGORIES' doc
 * comment. Navigating here renders the full HomeView inline rather than a
 * category-filtered feed (see /feed/page.tsx). */
export const FOR_YOU_CATEGORY: Category = "GENERAL";

export function isForYouCategory(category: Category | null | undefined): boolean {
  return category === FOR_YOU_CATEGORY;
}

/** Type-guard counterpart of isForYouCategory() — narrows to RealCategory
 * in the negative case, so callers don't need an unsafe cast. */
export function isRealCategory(category: Category | null | undefined): category is RealCategory {
  return !!category && category !== FOR_YOU_CATEGORY;
}

/**
 * The subset of Category values that correspond to a real, DB-backed
 * content category — i.e. every tab except the "For You" slot. Use this
 * (not Category) for anything that queries/filters articles by category,
 * so "GENERAL" can never be passed where a DB category is expected.
 */
export type RealCategory = Exclude<Category, "GENERAL">;

/** REAL_CATEGORIES in on-page display order for the homepage's per-category
 * preview rows (CategoryRow) — i.e. CATEGORIES with the "For You" slot
 * removed, since the homepage itself already IS what that slot points to. */
export const REAL_CATEGORIES: readonly RealCategory[] = CATEGORIES.filter(
  (c): c is RealCategory => c !== FOR_YOU_CATEGORY
);

/**
 * Publication status of a news item. Every item rendered in the news UI
 * MUST have status "VERIFIED" — any other status (e.g. "PENDING") exists
 * only to prove the filter excludes it and is never rendered.
 */
export type ArticleStatus = "VERIFIED" | "PENDING";

/**
 * A single news article.
 *
 * NOTE ON PLACEHOLDERS: sourceUrl / providerName / featured are placeholder
 * fields only. Once the real backend/scraper is connected, these should be
 * populated with the actual article URL, the actual publisher name, and an
 * editorially-flagged "most relevant today" boolean.
 */
export interface Article {
  id: string | number;
  /** Always a real, DB-backed category — never the "For You" ("GENERAL")
   * slot, since an Article is by definition a real piece of content that
   * came from (or is shaped like it came from) the articles table. */
  category: RealCategory;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  status: ArticleStatus;
  featured?: boolean;
  sourceUrl?: string;
  providerName?: string;
  /** Real image sourced from the original publisher (via RSS enclosure/content).
   * Null/undefined when the source article has no extractable image. */
  imageUrl?: string | null;
}

/** Possible verdict states returned by the (placeholder) Claim Checker. */
export type ClaimVerdictStatus = "VERIFIED" | "CONTRADICTED" | "INSUFFICIENT";

export interface ClaimVerdict {
  status: ClaimVerdictStatus;
  badgeClass: string;
  label: string;
}

// Verdict categories — fixed labels used by the Claim Checker.
export const VERDICT_CATEGORIES = [
  "Verified",
  "Insufficient Evidence",
  "Contradicted",
] as const;

export type VerdictCategory = (typeof VERDICT_CATEGORIES)[number];

// ---- RSS ingestion types ----

/**
 * Category values stored in the database (title-case, not the UI
 * screaming-case). "General" is intentionally NOT a member — it has been
 * retired as a real content category (see CATEGORIES' doc comment in this
 * file). Every article must be assigned one of these 4 real categories;
 * the ingestion pipeline (lib/rss.ts) is written so it can never produce
 * "General", and the DB's own check constraint enforces this too (see
 * supabase/migrations/*_retire_general_category.sql).
 */
export type ArticleCategory =
  | "News & Politics"
  | "Economy"
  | "Health & Safety"
  | "Lifestyle";

/** Shape of a row to be inserted into the Supabase `articles` table. */
export interface ArticleInsert {
  title: string;
  summary: string | null;
  source_url: string;
  source_name: string;
  published_at: string;
  category: ArticleCategory;
  image_url: string | null;
}

/** A trusted RSS source used by the ingestion cron job. */
export interface TrustedRssSource {
  id: string;
  name: string;
  feedUrl: string;
  fallbackCategory: ArticleCategory;
}

/** A trusted Philippine news outlet the AI is allowed to cite when falling
 * back to a live web search (used when the claim isn't covered by any
 * article already ingested into our own database). */
export interface TrustedWebSource {
  name: string;
  domain: string;
}

/** Per-source result returned after ingesting a single feed. */
export interface SourceIngestionResult {
  sourceId: string;
  sourceName: string;
  fetched: number;
  accepted: number;
  inserted: number;
  updated: number;
  duplicatesIgnored: number;
  error?: string;
}

/** Top-level result from a full ingestion run. */
export interface IngestionResult {
  status: "ok" | "partial" | "failed";
  totals: {
    fetched: number;
    accepted: number;
    inserted: number;
    updated: number;
    duplicatesIgnored: number;
    failedSources: number;
  };
  sources: SourceIngestionResult[];
}

// ---- Database row types (Supabase `articles` / `claims` tables) ----

/** A row from the Supabase `articles` table (metadata columns only — see
 * ARTICLE_COLUMNS in src/lib/supabase.ts; excludes the `embedding` vector
 * column, which normal queries never select). */
export interface DbArticle {
  id: string;
  title: string;
  summary: string | null;
  source_url: string;
  source_name: string;
  published_at: string;
  category: ArticleCategory;
  image_url: string | null;
  created_at?: string;
}

/** Request body for POST /api/claim-checker. */
export interface ClaimCheckerRequest {
  claim: string;
}

/** A source cited by the AI in a claim-check verdict. */
export interface ClaimSource {
  article_id: string;
  title: string;
  source_name: string;
  source_url: string;
  published_at: string;
  relevance?: string;
  /** True if this source came from a live trusted-web-source search rather
   * than our own curated articles database. */
  is_external?: boolean;
}

/** A row from the Supabase `claims` table. */
export interface Claim {
  id: string;
  user_text: string;
  status: "pending" | "completed" | "failed";
  verdict?: VerdictCategory | null;
  ai_explanation?: string | null;
  sources_used?: ClaimSource[] | null;
  confidence?: number | null;
  processed_at?: string | null;
  created_at?: string;
}

/** Shape returned from generateVerdict() in gemini.ts. */
export interface GeminiVerdictResult {
  verdict: VerdictCategory;
  ai_explanation: string;
  confidence: number;
  sources_used: ClaimSource[];
}

// ---- Claim checker API response types ----

export interface ClaimCheckerSuccessResponse {
  claim: Claim;
}

export interface ClaimCheckerErrorResponse {
  error: string;
  /** ISO timestamp of when the provider pool is expected to free up, set
   * only when the failure was due to every fallback provider being in
   * cooldown at once (see getCapacityStatus() in lib/llm-providers.ts). */
  availableAt?: string | null;
}
