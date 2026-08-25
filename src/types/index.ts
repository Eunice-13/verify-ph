// Shared TypeScript types and interfaces.

/** The 5 fixed news categories used across the feed. */
export const CATEGORIES = [
  "NEWS & POLITICS",
  "ECONOMY",
  "HEALTH & SAFETY",
  "LIFESTYLE",
  "GENERAL",
] as const;

export type Category = (typeof CATEGORIES)[number];

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
  id: number;
  category: Category;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  status: ArticleStatus;
  featured?: boolean;
  sourceUrl?: string;
  providerName?: string;
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

/** Category values stored in the database (title-case, not the UI screaming-case). */
export type ArticleCategory =
  | "News & Politics"
  | "Economy"
  | "Health & Safety"
  | "Lifestyle"
  | "General";

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

/** A row from the Supabase `articles` table (as returned by select("*")). */
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
}
