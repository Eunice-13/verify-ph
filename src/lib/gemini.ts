// Google Gemini API client and helper functions used by the Claim Checker
// pipeline (see /api/claim-checker).
//
// Pipeline responsibilities handled here:
//   1. parseClaim()   — understand a pasted claim (text or link) and produce
//                        a short search query / topic summary.
//   2. generateVerdict() — compare the claim against retrieved evidence
//                        articles and return one of the 5 fixed verdicts.

import { GoogleGenAI, Type } from "@google/genai";
import { VERDICT_CATEGORIES } from "@/constants";
import { TRUSTED_WEB_SOURCES } from "@/lib/sources";
import type { DbArticle, GeminiVerdictResult } from "@/types";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("[gemini] GEMINI_API_KEY is not set.");
}

const ai = new GoogleGenAI({ apiKey: apiKey ?? "" });

const MODEL = "gemini-3.6-flash";

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
        "3-8 plain keywords (people, places, organizations, events, bare numbers) best suited for a Postgres full-text search against a news article database. Write numbers as plain digits without currency symbols or units glued on (e.g. '7.5 billion' not 'P7.5-billion' or '₱7.5B'). Do not include punctuation like hyphens or slashes within a keyword. Expand common Philippine abbreviations to their full form (e.g. 'PH' or 'RP' -> 'Philippines', 'DOE' -> 'Department of Energy', 'DOF' -> 'Department of Finance').",
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

/**
 * A single piece of evidence found via a live trusted-web-source search,
 * shaped so it can be merged directly into the same evidence list used for
 * our own DB articles when calling generateVerdict().
 */
export interface ExternalEvidence {
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  published_at: string | null;
}

/**
 * Step 2b (fallback): if the article database has no strong match for the
 * claim, search the live web — but restricted to a fixed allowlist of
 * reputable Philippine news outlets (see src/lib/sources.ts) — for the
 * exact same story. This lets VerifyPH correctly verify claims that are
 * genuinely true and reported by a trusted outlet, even if that specific
 * article hasn't been ingested into our own database yet (e.g. an outlet
 * not yet in the RSS pipeline, or an article published before ingestion
 * started).
 *
 * Uses Gemini's built-in Google Search grounding tool. The allowlist is
 * enforced two ways: (1) the prompt instructs the model to only trust and
 * cite the listed outlets, and (2) every returned citation URL is checked
 * against the allowlist domains server-side before being used as evidence
 * — any citation from an untrusted domain is discarded.
 */
export async function searchTrustedWebSources(
  normalizedClaim: string,
  rawClaim: string
): Promise<ExternalEvidence[]> {
  const outletList = TRUSTED_WEB_SOURCES.map((s) => `${s.name} (${s.domain})`).join(", ");
  const allowedDomains = new Set(TRUSTED_WEB_SOURCES.map((s) => s.domain));

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a fact-checking research assistant for VerifyPH, a Philippine news
verification tool. Search the live web to find a real, currently published
news article that reports on the exact same specific event/facts as the
claim below.

STRICT RULES:
1. Only trust and cite articles published on these outlets: ${outletList}.
2. Ignore and never cite results from any other website, blog, forum, or
   social media post, even if they appear relevant.
3. The article you cite must report the same specific event, figures, or
   facts as the claim — not just the same general topic.
4. If you cannot find a matching article on one of the listed outlets,
   say so plainly. Do not invent or guess at an article.

Claim to research:
"""
${rawClaim}
"""

Normalized claim:
"""
${normalizedClaim}
"""

If you find a matching article, respond with a short summary of what it
reports and include its exact URL. If you find nothing matching on the
listed outlets, say "No matching article found on trusted outlets."`,
          },
        ],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.1,
    },
  });

  const candidate = response.candidates?.[0];
  const groundingChunks = candidate?.groundingMetadata?.groundingChunks ?? [];
  const text = response.text ?? "";

  const evidence: ExternalEvidence[] = [];

  for (const chunk of groundingChunks) {
    const uri = chunk.web?.uri;
    const title = chunk.web?.title;
    if (!uri || !title) continue;

    let hostname: string;
    try {
      hostname = new URL(uri).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }

    const matchedSource = TRUSTED_WEB_SOURCES.find(
      (s) => hostname === s.domain || hostname.endsWith(`.${s.domain}`)
    );

    // Enforce the allowlist server-side — discard anything not on it,
    // regardless of what the model claims to have found.
    if (!matchedSource || !allowedDomains.has(matchedSource.domain)) continue;

    evidence.push({
      title,
      summary: text.slice(0, 500),
      source_name: matchedSource.name,
      source_url: uri,
      published_at: null,
    });
  }

  return evidence;
}

const VERDICT_RESULT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    verdict: {
      type: Type.STRING,
      enum: [...VERDICT_CATEGORIES],
      description: "Exactly one of the three fixed verdict labels.",
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
          published_at: {
            type: Type.STRING,
            description:
              "ISO date if known. If this is an external web source with an unknown publish date, use an empty string.",
          },
          relevance: {
            type: Type.STRING,
            description: "One short phrase on how this article supports/contradicts the claim.",
          },
          is_external: {
            type: Type.BOOLEAN,
            description:
              "true if this source came from a live trusted-web-source search rather than our own articles database.",
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
 * `evidence` may include both our own DB articles and, when the DB has no
 * strong match, live results from searchTrustedWebSources() (see above).
 * Both are passed to the model in the same shape so it can treat them as
 * equally valid evidence, as long as they came from a trusted PH outlet.
 *
 * IMPORTANT: The model is instructed to use ONLY the provided articles as
 * evidence and never invent sources, per the DB/product rules.
 */
export async function generateVerdict(
  normalizedClaim: string,
  rawClaim: string,
  evidence: DbArticle[],
  externalEvidence: ExternalEvidence[] = []
): Promise<GeminiVerdictResult> {
  const evidenceForPrompt = [
    ...evidence.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary,
      category: a.category,
      source_name: a.source_name,
      source_url: a.source_url,
      published_at: a.published_at,
      is_external: false,
    })),
    ...externalEvidence.map((a, i) => ({
      id: `external-${i}`,
      title: a.title,
      summary: a.summary,
      category: null,
      source_name: a.source_name,
      source_url: a.source_url,
      published_at: a.published_at,
      is_external: true,
    })),
  ];

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
3. Some articles have "is_external": true — these came from a live search of trusted Philippine news outlets rather than our own database, but they are equally valid evidence. Treat them the same as any other article.
4. Return exactly one of these three fixed verdict labels: ${VERDICT_CATEGORIES.join(", ")}.
5. If no retrieved article is actually relevant to the claim, you MUST return "Insufficient Evidence" and leave sources_used empty.
6. "sources_used" must be a subset of the articles provided below (same id/title/source_url) — only include ones you actually relied on. Carry over "is_external" for each source you include.
7. Be neutral and evidence-first. Do not act as an arbiter of absolute truth; describe what the evidence shows or does not show.

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
