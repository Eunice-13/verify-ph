// Google Gemini API client and helper functions used by the Claim Checker
// pipeline (see /api/claim-checker).
//
// Uses the Vertex AI backend to support AQ. auth keys (the new default
// format from Google AI Studio as of 2026).
//
// Pipeline responsibilities handled here:
//   1. parseClaim()   — understand a pasted claim (text or link) and produce
//                        a short search query / topic summary.
//   2. generateVerdict() — compare the claim against retrieved evidence
//                        articles and return one of the 5 fixed verdicts.

import { GoogleGenAI, Type } from "@google/genai";
import { VERDICT_CATEGORIES } from "@/constants";
import type { DbArticle, GeminiVerdictResult } from "@/types";

const apiKey = process.env.GEMINI_API_KEY;
const project = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";

if (!apiKey) {
  console.warn("[gemini] GEMINI_API_KEY is not set.");
}

// Use Vertex AI backend if a project is configured (required for AQ. keys).
// Falls back to the Gemini Developer API if no project is set (for AIza keys).
const ai = project
  ? new GoogleGenAI({
      vertexai: true,
      project,
      location,
      apiKey: apiKey ?? "",
    })
  : new GoogleGenAI({ apiKey: apiKey ?? "" });

const MODEL = "gemini-2.5-flash";

export interface ParsedClaim {
  /** Short, keyword-focused query suitable for full-text search against articles. */
  search_query: string;
  /** One-sentence neutral restatement of the claim being checked. */
  normalized_claim: string;
}

const PARSE_CLAIM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    search_query: {
      type: Type.STRING,
      description:
        "3-8 keywords (people, places, organizations, events, numbers) best suited for a Postgres full-text search against a news article database.",
    },
    normalized_claim: {
      type: Type.STRING,
      description:
        "A single neutral sentence restating the core factual claim being checked, stripped of social-media framing/emotion.",
    },
  },
  required: ["search_query", "normalized_claim"],
};

/**
 * Step 1: AI parses/understands the claim.
 * Accepts either raw claim text or a social media link/quote pasted by the user.
 */
export async function parseClaim(rawClaim: string): Promise<ParsedClaim> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a claim-parsing assistant for VerifyPH, a Philippine fact-checking tool.
A user pasted the following claim (it may be plain text, or text copied from a social media post/link). 
Extract a concise search query and a neutral one-sentence restatement.

Claim:
"""
${rawClaim}
"""`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: PARSE_CLAIM_SCHEMA,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response while parsing the claim.");
  }

  return JSON.parse(text) as ParsedClaim;
}

const VERDICT_RESULT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    verdict: {
      type: Type.STRING,
      enum: [...VERDICT_CATEGORIES],
      description: "Exactly one of the five fixed verdict labels.",
    },
    ai_explanation: {
      type: Type.STRING,
      description:
        "Explanation grounded only in the provided articles. Cite article titles/sources inline. If evidence is insufficient, say so explicitly.",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence in the verdict, between 0 and 1.",
    },
    sources_used: {
      type: Type.ARRAY,
      description:
        "Subset of the provided articles actually relied upon for the verdict. Empty array if none were relevant.",
      items: {
        type: Type.OBJECT,
        properties: {
          article_id: { type: Type.STRING },
          title: { type: Type.STRING },
          source_name: { type: Type.STRING },
          source_url: { type: Type.STRING },
          published_at: { type: Type.STRING },
          relevance: {
            type: Type.STRING,
            description: "One short phrase on how this article supports/contradicts the claim.",
          },
        },
        required: ["article_id", "title", "source_name", "source_url", "published_at"],
      },
    },
  },
  required: ["verdict", "ai_explanation", "confidence", "sources_used"],
};

/**
 * Step 3 + 4: AI compares the claim against retrieved evidence articles and
 * returns a verdict, explanation, confidence, and the sources it relied on.
 *
 * IMPORTANT: The model is instructed to use ONLY the provided articles as
 * evidence and never invent sources, per the DB/product rules.
 */
export async function generateVerdict(
  normalizedClaim: string,
  rawClaim: string,
  evidence: DbArticle[]
): Promise<GeminiVerdictResult> {
  const evidenceForPrompt = evidence.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    category: a.category,
    source_name: a.source_name,
    source_url: a.source_url,
    published_at: a.published_at,
  }));

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are the VerifyPH Claim Checker AI. Follow these rules strictly:

1. Use ONLY the articles listed below as evidence. Never invent sources or cite anything not present in this list.
2. Compare the claim against the title, summary, category, source_name, and published_at of each article.
3. Return exactly one of these five fixed verdict labels: ${VERDICT_CATEGORIES.join(", ")}.
4. If no retrieved article is actually relevant to the claim, you MUST return "Insufficient Evidence" and leave sources_used empty.
5. "sources_used" must be a subset of the articles provided below (same article_id/title/source_url) — only include ones you actually relied on.
6. Be neutral and evidence-first. Do not act as an arbiter of absolute truth; describe what the evidence shows or does not show.

User's original pasted claim:
"""
${rawClaim}
"""

Normalized claim to verify:
"""
${normalizedClaim}
"""

Retrieved candidate evidence articles (JSON array, may be empty):
${JSON.stringify(evidenceForPrompt, null, 2)}
`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: VERDICT_RESULT_SCHEMA,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response while generating the verdict.");
  }

  const parsed = JSON.parse(text) as GeminiVerdictResult;

  // Defensive clamp in case the model returns an out-of-range confidence.
  parsed.confidence = Math.min(1, Math.max(0, parsed.confidence));

  return parsed;
}
