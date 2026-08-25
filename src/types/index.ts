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
