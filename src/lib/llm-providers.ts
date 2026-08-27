// Multi-provider fallback rotation for generateVerdict() (see gemini.ts).
//
// Gemini's free tier has tight per-minute/per-day quotas, so a handful of
// claim checks in quick succession can exhaust it. This pool lets
// generateVerdict() cascade to other providers (routed through Backboard,
// see backboard.ts) when Gemini — or any provider in the pool — is
// rate-limited, without generateVerdict()'s caller needing to know which
// provider actually answered.
//
// DETECTION STRATEGY — read this before changing isRateLimitError():
// Only Gemini's failure shape is actually confirmed: the @google/genai SDK
// throws an `ApiError` with a real `.status` field (verified by reading
// node_modules/@google/genai/dist/index.mjs — it has a dedicated `class
// ApiError extends Error { this.status = ... }`), so `err.status === 429`
// is a safe, specific check for Gemini.
//
// Backboard's failure shape is NOT confirmed to be a clean 429. Live
// testing against the real API (see chat history) produced two different
// failure shapes, neither of which was a 429:
//   1. Model-level failure: HTTP 200, with `status: "FAILED"` in the body
//      and the actual error text embedded in `content` (e.g.
//      "LLM Error: Model 'x' is not supported...").
//   2. System-level failure: HTTP 500 with a generic
//      `{"detail": "Something went wrong. Please try again later."}` body
//      — no error code, no distinguishing detail from an unrelated outage.
// A genuine upstream rate limit (e.g. OpenRouter throttling a model) could
// plausibly surface as either shape, and we have no confirmed example of
// which. Rather than hard-coding a check for an unverified 429, treat ANY
// non-200 HTTP status OR a 200 response with `status !== "COMPLETED"` as
// fallback-worthy for Backboard-routed providers. This is less precise
// than a targeted rate-limit check, but it's honest about what's actually
// been observed — a wrong guess at a specific status code would silently
// never fire on the failures we've actually seen. Revisit and tighten this
// once a real rate-limit response has been observed and confirmed.

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const backboardApiKey = process.env.BACKBOARD_API_KEY;

if (!apiKey) {
  console.warn("[llm-providers] GEMINI_API_KEY is not set.");
}
if (!backboardApiKey) {
  console.warn("[llm-providers] BACKBOARD_API_KEY is not set — Backboard fallback providers will fail closed.");
}

const ai = new GoogleGenAI({ apiKey: apiKey ?? "" });
const GEMINI_MODEL = "gemini-3.6-flash";

const BACKBOARD_BASE_URL = "https://app.backboard.io/api";

export interface ProviderCallOptions {
  /** JSON schema (Gemini responseSchema shape) describing the expected output, used only by callGeminiNative. */
  responseSchema?: object;
  temperature?: number;
}

export type ProviderCall = (prompt: string, options?: ProviderCallOptions) => Promise<string>;

export interface ProviderConfig {
  name: string;
  call: ProviderCall;
  /** How long to skip this provider after it's identified as rate-limited. */
  cooldownMs: number;
}

/** Thrown by a provider's call() when the failure looks like a rate limit
 * (as opposed to a real bug, which should propagate normally). */
export class ProviderRateLimitedError extends Error {
  constructor(public providerName: string, cause: unknown) {
    super(`Provider "${providerName}" appears to be rate-limited.`);
    this.cause = cause;
  }
}

/** Thrown when a provider returned text that isn't valid JSON. Fallback
 * providers (Backboard-routed, since they have no native schema
 * enforcement like Gemini's responseSchema) are more prone to this than
 * Gemini — treated as fallback-worthy so one model's formatting slip
 * doesn't hard-fail the whole request when other providers are available. */
export class ProviderResponseInvalidError extends Error {
  constructor(public providerName: string, cause: unknown) {
    super(`Provider "${providerName}" returned a response that isn't valid JSON.`);
    this.cause = cause;
  }
}

/**
 * Native Gemini call using the existing structured responseSchema path
 * (unchanged behavior from the original generateVerdict()/parseClaim()
 * implementation). Returns the raw JSON text.
 */
async function callGeminiNative(prompt: string, options?: ProviderCallOptions): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: options?.responseSchema,
        temperature: options?.temperature ?? 0.2,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }
    return text;
  } catch (err) {
    // Confirmed shape: @google/genai throws ApiError with a real numeric
    // `.status` (see file header comment). 429 = RESOURCE_EXHAUSTED/quota.
    const status = (err as { status?: number } | null)?.status;
    if (status === 429) {
      throw new ProviderRateLimitedError("gemini", err);
    }
    throw err;
  }
}

interface BackboardMessageResponse {
  content: string;
  status: string; // "COMPLETED" | "REQUIRES_ACTION" | "IN_PROGRESS" | "FAILED" | "CANCELLED"
}

/**
 * Calls a model through Backboard (https://app.backboard.io) — see file
 * header comment for why the rate-limit detection here is deliberately
 * broad rather than keyed to a specific status code.
 */
function callBackboard(llmProvider: string, modelName: string): ProviderCall {
  return async (prompt: string, options?: ProviderCallOptions): Promise<string> => {
    // Backboard has no native responseSchema/JSON-schema enforcement — ask
    // for JSON output via json_output plus explicit prompt instructions,
    // and parse the result into the same shape the caller expects.
    const jsonInstruction = options?.responseSchema
      ? `\n\nRespond with ONLY a raw JSON object (no markdown code fences, no commentary) matching this shape: ${JSON.stringify(options.responseSchema)}`
      : "";

    let response: Response;
    try {
      response = await fetch(`${BACKBOARD_BASE_URL}/threads/messages`, {
        method: "POST",
        headers: {
          "X-API-Key": backboardApiKey ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `${prompt}${jsonInstruction}`,
          llm_provider: llmProvider,
          model_name: modelName,
          json_output: true,
          temperature: options?.temperature ?? 0.2,
        }),
      });
    } catch (err) {
      // Network-level failure — not confirmed to be rate-limiting, but a
      // Backboard-routed provider being unreachable is treated the same
      // way as a rate limit here: skip it and cascade, don't hard-fail
      // the whole pipeline over one provider's network blip.
      throw new ProviderRateLimitedError(`backboard-${llmProvider}-${modelName}`, err);
    }

    if (!response.ok) {
      // Non-200 (e.g. the 500 observed during live testing — see file
      // header). Treated as fallback-worthy per the documented strategy.
      const body = await response.text().catch(() => "");
      throw new ProviderRateLimitedError(
        `backboard-${llmProvider}-${modelName}`,
        new Error(`Backboard HTTP ${response.status}: ${body}`)
      );
    }

    const data = (await response.json()) as BackboardMessageResponse;

    if (data.status !== "COMPLETED") {
      // 200 OK but the LLM call itself failed (confirmed shape: bad-model
      // test returned status: "FAILED" with "LLM Error: ..." in content).
      throw new ProviderRateLimitedError(
        `backboard-${llmProvider}-${modelName}`,
        new Error(`Backboard status=${data.status}: ${data.content}`)
      );
    }

    return data.content;
  };
}

/**
 * Ordered provider pool for generateVerdict(). Cascades top to bottom,
 * skipping providers currently in cooldown (see rotation logic below).
 */
export const providerPool: ProviderConfig[] = [
  {
    name: "gemini",
    call: callGeminiNative,
    cooldownMs: 90_000,
  },
  {
    name: "backboard-gpt-4o-mini",
    call: callBackboard("openai", "gpt-4o-mini"),
    cooldownMs: 90_000,
  },
  {
    name: "backboard-gpt-4.1-mini",
    call: callBackboard("openai", "gpt-4.1-mini"),
    cooldownMs: 90_000,
  },
  {
    name: "backboard-deepseek",
    // Confirmed via a live test call against GET /api/models/provider/openrouter
    // and a real successful message send — DeepSeek is only reachable
    // through Backboard's "openrouter" provider, not a native "deepseek"
    // provider (Backboard's provider list has no "deepseek" entry).
    call: callBackboard("openrouter", "deepseek/deepseek-chat"),
    cooldownMs: 90_000,
  },
];

// In-memory cooldown tracker: provider name -> timestamp (ms) when it
// becomes eligible again. Module-level state is fine here — this resets on
// server restart/redeploy, which just means providers get retried sooner
// than their cooldown after a deploy, not a correctness issue.
const cooldownUntil = new Map<string, number>();

function isInCooldown(name: string): boolean {
  const until = cooldownUntil.get(name);
  return until !== undefined && Date.now() < until;
}

function setCooldown(config: ProviderConfig): void {
  cooldownUntil.set(config.name, Date.now() + config.cooldownMs);
}

/** Strips markdown code fences some models wrap JSON in despite being
 * instructed not to (mainly relevant to Backboard-routed models, which
 * lack Gemini's hard responseSchema enforcement). */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

/**
 * Runs `prompt` through the provider pool, cascading on rate-limit-shaped
 * failures (see ProviderRateLimitedError) OR an unparseable/non-JSON
 * response (see ProviderResponseInvalidError) until one succeeds. Any
 * other error type propagates immediately — it's surfaced as a real bug,
 * not silently swallowed by moving to the next provider.
 *
 * When `options.responseSchema` is set (i.e. the caller expects JSON back,
 * as generateVerdict() does), the response is validated as parseable JSON
 * here before being accepted — a malformed response from one provider
 * cascades to the next rather than blowing up JSON.parse() downstream.
 *
 * If every provider is currently in cooldown, cooldowns are ignored and
 * the full list is tried anyway rather than hard-failing the request.
 */
export async function callWithFallback(
  prompt: string,
  options?: ProviderCallOptions
): Promise<{ text: string; providerName: string }> {
  const available = providerPool.filter((p) => !isInCooldown(p.name));
  const candidates = available.length > 0 ? available : providerPool;

  let lastError: unknown = null;

  for (const provider of candidates) {
    try {
      const rawText = await provider.call(prompt, options);

      if (options?.responseSchema) {
        const cleaned = stripCodeFences(rawText);
        try {
          JSON.parse(cleaned);
        } catch (parseErr) {
          throw new ProviderResponseInvalidError(provider.name, parseErr);
        }
        console.log(`[llm-providers] generateVerdict served by "${provider.name}"`);
        return { text: cleaned, providerName: provider.name };
      }

      console.log(`[llm-providers] generateVerdict served by "${provider.name}"`);
      return { text: rawText, providerName: provider.name };
    } catch (err) {
      if (err instanceof ProviderRateLimitedError) {
        console.warn(`[llm-providers] "${provider.name}" rate-limited/unavailable, cooling down and trying next.`, err.cause);
        setCooldown(provider);
        lastError = err;
        continue;
      }
      if (err instanceof ProviderResponseInvalidError) {
        // Deliberately NOT put in cooldown — an invalid-JSON response is a
        // one-off formatting slip, not evidence the provider is
        // rate-limited/unavailable, so it shouldn't be skipped on the next
        // unrelated request.
        console.warn(`[llm-providers] "${provider.name}" returned invalid JSON, trying next provider.`, err.cause);
        lastError = err;
        continue;
      }
      // Not a rate-limit- or invalid-JSON-shaped failure — a real bug.
      // Surface it now rather than masking it behind a fallback attempt.
      throw err;
    }
  }

  // Every provider in the pool failed.
  throw lastError instanceof Error
    ? lastError
    : new Error("All providers in the pool failed.");
}
