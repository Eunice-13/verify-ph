// Shared TypeScript types and interfaces, mirrored from the Supabase schema
// (see /supabase/migrations and "dbms context.md").

import type { VerdictCategory } from "@/constants";

export type ArticleCategory =
  | "News & Politics"
  | "Economy"
  | "Health & Safety"
  | "Lifestyle"
  | "General";

export interface Article {
  id: string;
  title: string;
  summary: string | null;
  source_url: string;
  source_name: string;
  published_at: string;
  created_at: string;
  category: ArticleCategory;
  image_url: string | null;
}

export type ClaimStatus = "pending" | "completed" | "failed";

/** A single evidence entry recorded in claims.sources_used (jsonb). */
export interface SourceUsed {
  article_id: string;
  title: string;
  source_name: string;
  source_url: string;
  published_at: string;
  relevance?: string;
}

export interface Claim {
  id: string;
  user_text: string;
  verdict: VerdictCategory | null;
  ai_explanation: string | null;
  sources_used: SourceUsed[];
  created_at: string;
  status: ClaimStatus;
  confidence: number | null;
  processed_at: string | null;
}

/** Structured output requested from Gemini for a single claim-check run. */
export interface GeminiVerdictResult {
  verdict: VerdictCategory;
  ai_explanation: string;
  confidence: number;
  sources_used: SourceUsed[];
}

/** Request body accepted by POST /api/claim-checker. */
export interface ClaimCheckerRequest {
  claim: string;
}

/** Response body returned by POST /api/claim-checker. */
export interface ClaimCheckerResponse {
  claim: Claim;
}
