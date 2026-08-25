export const ARTICLE_CATEGORIES = [
  "News & Politics",
  "Economy",
  "Health & Safety",
  "Lifestyle",
  "General",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export interface TrustedRssSource {
  id: string;
  name: string;
  feedUrl: string;
  // Used only when an article has no useful RSS tag, URL section, or text hint.
  fallbackCategory: ArticleCategory;
}

export interface ArticleInsert {
  title: string;
  summary: string | null;
  source_url: string;
  source_name: string;
  published_at: string;
  category: ArticleCategory;
  image_url: string | null;
}

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
