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
  "Officially Confirmed",
  "Corroborated",
  "Developing",
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
