// Multi-provider fallback rotation for parseClaim() and generateVerdict()
// (see gemini.ts). NOT used by searchTrustedWebSources() — that call
// depends on Gemini's built-in Google Search grounding tool, which has no
// equivalent contract through Backboard-routed models, so it's left
// calling Gemini directly.
//
// Gemini's free tier has tight per-minute AND per-day quotas, so a handful
// of claim checks in quick succession can exhaust it. This pool lets
// callWithFallback() cascade to other providers (routed through Backboard,
// see callBackboard() below) when Gemini — or any provider in the pool —
// is rate-limited, without the caller needing to know which provider
// actually answered.
//
// DETECTION STRATEGY — read this before changing the rate-limit checks:
// Only Gemini's failure shape is actually confirmed: the @google/genai SDK
// throws an `ApiError` with a real `.status` field AND the parsed error
// body on `.error` (verified by reading node_modules/@google/genai/dist/
// index.mjs — `class ApiError extends Error { this.status = ...}`, and
// the SDK's own APIError.generate()/streaming-error path constructs it
// with `new ApiError({ message: JSON.stringify(errorBody), status })`).
// A real observed 429 body (see chat history) looked like:
//   {
//     "error": {
//       "code": 429, "status": "RESOURCE_EXHAUSTED",
//       "details": [
//         { "@type": ".../QuotaFailure", "violations": [{
//             "quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
//             ...
//         }]},
//         { "@type": ".../RetryInfo", "retryDelay": "16s" }
//       ]
//     }
//   }
// `err.status === 429` is a safe, specific check for "Gemini is
// rate-limited in some way". Distinguishing a DAILY quota (retrying soon
// is guaranteed to fail again) from a PER-MINUTE throttle (retrying soon
// will likely work) requires inspecting the quotaId string for "PerDay" —
// see classifyGeminiRateLimit() below.
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
// Rather than hard-coding a check for an unverified 429, treat ANY
// non-200 HTTP status OR a 200 response with `status !== "COMPLETED"` as
// fallback-worthy for Backboard-routed providers, and always use the
// SHORT cooldown for them (no confirmed signal to detect a Backboard-side
// daily-vs-per-minute distinction — see classifyGeminiRateLimit()'s doc
// comment on why guessing wrong here is worse than defaulting short).

import { GoogleGenAI } from "@google/genai";
import { supabaseServer } from "@/lib/supabase";

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

// Short cooldown: for throttle-shaped failures where retrying soon is
// expected to work (per-minute rate limits, transient network/500s, or any
// Backboard-routed failure — see file header for why Backboard always uses
// this one).
const SHORT_COOLDOWN_MS = 90_000; // 90s

// Long cooldown: for a CONFIRMED daily-quota exhaustion, where retrying
// within the same day is guaranteed to fail again (see the quotaId check
// in classifyGeminiRateLimit()). Computing the exact UTC/Pacific midnight
// reset is unnecessary precision for how this is used — a flat 12h means
// worst case we retry Gemini a bit before it's technically reset, get one
// more 429, and re-cooldown; that's a single wasted call, not a real cost.
const LONG_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12h

export interface ProviderCallOptions {
  /** JSON schema (Gemini responseSchema shape) describing the expected output, used only by callGeminiNative. */
  responseSchema?: object;
  temperature?: number;
}

export type ProviderCall = (prompt: string, options?: ProviderCallOptions) => Promise<string>;

export interface ProviderConfig {
  name: string;
  call: ProviderCall;
}

/** Thrown by a provider's call() when the failure looks like a rate limit
 * (as opposed to a real bug, which should propagate normally). */
export class ProviderRateLimitedError extends Error {
  constructor(
    public providerName: string,
    cause: unknown,
    /** How long to cool this provider down for. Defaults to the short
     * cooldown at the throw site if not specified — see classification
     * helpers below for how a caller decides which duration applies. */
    public cooldownMs: number = SHORT_COOLDOWN_MS
  ) {
    super(`Provider "${providerName}" appears to be rate-limited.`);
    this.cause = cause;
  }
}

/** Thrown when a provider returned text that isn't valid JSON, OR valid
 * JSON that's missing one or more fields the schema marks as required
 * (see hasAllRequiredFields()). Fallback providers (Backboard-routed,
 * since they have no native schema enforcement like Gemini's
 * responseSchema) are more prone to both than Gemini — treated as
 * fallback-worthy so one model's formatting/completeness slip doesn't
 * hard-fail the whole request when other providers are available. */
export class ProviderResponseInvalidError extends Error {
  constructor(public providerName: string, cause: unknown) {
    super(`Provider "${providerName}" returned a response that isn't valid JSON.`);
    this.cause = cause;
  }
}

/**
 * Inspects a Gemini ApiError to decide whether this is a confirmed DAILY
 * quota exhaustion (long cooldown — retrying soon is guaranteed to fail)
 * or anything else, including a per-minute throttle (short cooldown —
 * retrying soon is expected to eventually work).
 *
 * DEFAULT-SHORT ON AMBIGUITY: if the error body doesn't parse or doesn't
 * contain a recognizable quotaId, this defaults to the short cooldown.
 * Wrongly guessing "long" would lock out Gemini for 12 hours based on a
 * misread; wrongly guessing "short" just means we eat one extra wasted
 * call before the real cooldown kicks in on the next 429. The asymmetric
 * cost is why ambiguous cases lean short, per the agreed approach.
 */
function classifyGeminiRateLimit(err: unknown): number {
  // The SDK's ApiError stores the raw parsed error body on `.error` when
  // available (see APIError.generate() in the SDK source), but some throw
  // sites only set `.message` to the stringified body — check both.
  const asRecord = err as { error?: unknown; message?: unknown } | null;
  const rawBody = asRecord?.error ?? asRecord?.message;

  let bodyText: string;
  if (typeof rawBody === "string") {
    bodyText = rawBody;
  } else if (rawBody && typeof rawBody === "object") {
    bodyText = JSON.stringify(rawBody);
  } else {
    return SHORT_COOLDOWN_MS;
  }

  // Confirmed real shape: quotaId "GenerateRequestsPerDayPerProjectPerModel-FreeTier".
  // Match on "PerDay" specifically rather than the full string, since the
  // exact quotaId could vary by model/tier.
  if (/quotaId["\s:]+["']?[^"'\n]*PerDay/i.test(bodyText)) {
    return LONG_COOLDOWN_MS;
  }

  return SHORT_COOLDOWN_MS;
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
      throw new ProviderRateLimitedError("gemini", err, classifyGeminiRateLimit(err));
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
 * broad rather than keyed to a specific status code, and why it always
 * uses the short cooldown (no confirmed daily-vs-per-minute signal).
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
 * Ordered provider pool for callWithFallback(). Cascades top to bottom,
 * skipping providers currently in cooldown (see rotation logic below).
 */
export const providerPool: ProviderConfig[] = [
  {
    name: "gemini",
    call: callGeminiNative,
  },
  {
    name: "backboard-gpt-4o-mini",
    call: callBackboard("openai", "gpt-4o-mini"),
  },
  {
    name: "backboard-gpt-4.1-mini",
    call: callBackboard("openai", "gpt-4.1-mini"),
  },
  {
    name: "backboard-deepseek",
    // Confirmed via a live test call against GET /api/models/provider/openrouter
    // and a real successful message send — DeepSeek is only reachable
    // through Backboard's "openrouter" provider, not a native "deepseek"
    // provider (Backboard's provider list has no "deepseek" entry).
    call: callBackboard("openrouter", "deepseek/deepseek-chat"),
  },
];

// ---------------------------------------------------------------------------
// Cooldown persistence (Supabase-backed, with an in-memory fallback if the
// table is missing or the DB is briefly unreachable — see file header on
// why an in-memory-only map isn't sufficient on its own for Vercel).
// ---------------------------------------------------------------------------

// In-memory mirror: avoids a DB round-trip on every single provider call
// within one request (multiple providers may be checked per call), and
// acts as a same-process fallback if Supabase is unreachable or the
// provider_cooldowns table hasn't been migrated in yet.
const cooldownUntilMemory = new Map<string, number>();

let cooldownTableConfirmedMissing = false;

async function readCooldownFromDb(name: string): Promise<number | null> {
  if (cooldownTableConfirmedMissing) return null;
  try {
    const db = supabaseServer();
    const { data, error } = await db
      .from("provider_cooldowns")
      .select("cooldown_until")
      .eq("provider_name", name)
      .maybeSingle();

    if (error) {
      // Table likely doesn't exist yet (migration not applied) — degrade
      // to in-memory-only for the rest of this process's lifetime rather
      // than re-querying a missing table on every call.
      cooldownTableConfirmedMissing = true;
      console.warn(
        `[llm-providers] provider_cooldowns table unavailable, falling back to in-memory-only cooldowns for this process: ${error.message}`
      );
      return null;
    }

    return data ? new Date(data.cooldown_until).getTime() : null;
  } catch (err) {
    console.warn("[llm-providers] readCooldownFromDb threw:", err);
    return null;
  }
}

async function writeCooldownToDb(name: string, untilMs: number, reason: string): Promise<void> {
  if (cooldownTableConfirmedMissing) return;
  try {
    const db = supabaseServer();
    const { error } = await db.from("provider_cooldowns").upsert({
      provider_name: name,
      cooldown_until: new Date(untilMs).toISOString(),
      reason,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      cooldownTableConfirmedMissing = true;
      console.warn(
        `[llm-providers] could not persist cooldown for "${name}", falling back to in-memory-only for this process: ${error.message}`
      );
    }
  } catch (err) {
    console.warn("[llm-providers] writeCooldownToDb threw:", err);
  }
}

/**
 * Checks whether `name` is currently in cooldown. Prefers the persisted
 * (Supabase) value so cooldowns survive across serverless invocations and
 * redeploys; falls back to the in-memory mirror if the DB read fails or
 * the table isn't migrated in yet.
 */
async function isInCooldown(name: string): Promise<boolean> {
  const dbUntil = await readCooldownFromDb(name);
  if (dbUntil !== null) {
    cooldownUntilMemory.set(name, dbUntil); // keep the mirror in sync
    return Date.now() < dbUntil;
  }

  const memUntil = cooldownUntilMemory.get(name);
  return memUntil !== undefined && Date.now() < memUntil;
}

function setCooldown(name: string, cooldownMs: number, reason: string): void {
  const until = Date.now() + cooldownMs;
  cooldownUntilMemory.set(name, until);
  // Fire-and-forget: don't block the fallback cascade on the DB write
  // completing, but do surface a warning if it fails (handled inside).
  void writeCooldownToDb(name, until, reason);
}

export interface CapacityStatus {
  /** True only when EVERY provider in the pool is currently in cooldown —
   * i.e. the next real request would have to cascade through the whole
   * pool and still fail. As long as at least one provider is available,
   * the claim checker keeps working (just possibly via a fallback), so
   * this is deliberately NOT true just because Gemini specifically is
   * rate-limited. */
  atCapacity: boolean;
  /** ISO timestamp of the earliest point at which capacity is expected to
   * free up (the soonest of all providers' cooldown_until) — the moment
   * atCapacity should flip back to false. Null when atCapacity is false. */
  availableAt: string | null;
}

/**
 * Computes whether the whole provider pool is currently exhausted, and if
 * so, when the soonest provider is expected to become available again.
 * Used by GET /api/capacity-status (for the site-wide banner — see
 * useCapacityStatus.ts) and by the claim-checker route's error response
 * when every provider in a single request's cascade fails.
 *
 * Reads the same persisted (Supabase) + in-memory cooldown state
 * isInCooldown() uses, so this reflects the real, current cooldown state
 * rather than a separate/duplicated source of truth.
 */
export async function getCapacityStatus(): Promise<CapacityStatus> {
  const untilTimestamps = await Promise.all(
    providerPool.map(async (p) => {
      const dbUntil = await readCooldownFromDb(p.name);
      if (dbUntil !== null) {
        cooldownUntilMemory.set(p.name, dbUntil);
        return dbUntil;
      }
      return cooldownUntilMemory.get(p.name) ?? null;
    })
  );

  const now = Date.now();
  const activeCooldowns = untilTimestamps.filter(
    (until): until is number => until !== null && until > now
  );

  // At least one provider has no active cooldown -> the pool can still
  // serve a request right now.
  if (activeCooldowns.length < providerPool.length) {
    return { atCapacity: false, availableAt: null };
  }

  const soonest = Math.min(...activeCooldowns);
  return { atCapacity: true, availableAt: new Date(soonest).toISOString() };
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
 * Validates that a parsed JSON response actually contains every field
 * listed in the schema's top-level `required` array, with a defined
 * (non-undefined, non-null) value.
 *
 * WHY THIS EXISTS: Gemini's native responseSchema hard-enforces this
 * shape server-side, so it was never a concern for the original
 * Gemini-only pipeline. Backboard has no such enforcement — it only gets
 * a prompt instruction asking for the shape (see callBackboard()'s
 * jsonInstruction). A real observed failure: parseClaim() fell back to
 * backboard-gpt-4o-mini, which returned syntactically valid JSON that
 * nonetheless omitted the required `search_query` field, and the missing
 * field wasn't caught until it crashed downstream in
 * route.ts's normalize(undefined). Catching that here — before the
 * response is accepted — lets it cascade to the next provider instead.
 */
function hasAllRequiredFields(parsed: unknown, schema: object): boolean {
  const required = (schema as { required?: unknown }).required;
  if (!Array.isArray(required) || required.length === 0) return true;
  if (typeof parsed !== "object" || parsed === null) return false;

  const record = parsed as Record<string, unknown>;
  return required.every((key) => typeof key === "string" && record[key] !== undefined && record[key] !== null);
}

/**
 * Runs `prompt` through the provider pool, cascading on rate-limit-shaped
 * failures (see ProviderRateLimitedError) OR an unparseable/non-JSON
 * response (see ProviderResponseInvalidError) until one succeeds. Any
 * other error type propagates immediately — it's surfaced as a real bug,
 * not silently swallowed by moving to the next provider.
 *
 * Used by both parseClaim() and generateVerdict() in gemini.ts (NOT by
 * searchTrustedWebSources() — see file header). When
 * `options.responseSchema` is set (both current callers set it), the
 * response is validated as parseable JSON here before being accepted — a
 * malformed response from one provider cascades to the next rather than
 * blowing up JSON.parse() downstream in gemini.ts.
 *
 * If every provider is currently in cooldown, cooldowns are ignored and
 * the full list is tried anyway rather than hard-failing the request.
 */
export async function callWithFallback(
  prompt: string,
  options?: ProviderCallOptions
): Promise<{ text: string; providerName: string }> {
  const cooldownFlags = await Promise.all(
    providerPool.map((p) => isInCooldown(p.name))
  );
  const available = providerPool.filter((_, i) => !cooldownFlags[i]);
  const candidates = available.length > 0 ? available : providerPool;

  let lastError: unknown = null;

  for (const provider of candidates) {
    try {
      const rawText = await provider.call(prompt, options);

      if (options?.responseSchema) {
        const cleaned = stripCodeFences(rawText);
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(cleaned);
        } catch (parseErr) {
          throw new ProviderResponseInvalidError(provider.name, parseErr);
        }
        if (!hasAllRequiredFields(parsedJson, options.responseSchema)) {
          throw new ProviderResponseInvalidError(
            provider.name,
            new Error(`Response is missing one or more required fields: ${cleaned}`)
          );
        }
        console.log(`[llm-providers] request served by "${provider.name}"`);
        return { text: cleaned, providerName: provider.name };
      }

      console.log(`[llm-providers] request served by "${provider.name}"`);
      return { text: rawText, providerName: provider.name };
    } catch (err) {
      if (err instanceof ProviderRateLimitedError) {
        const cooldownMinutes = Math.round(err.cooldownMs / 60_000);
        console.warn(
          `[llm-providers] "${provider.name}" rate-limited/unavailable, cooling down for ~${cooldownMinutes}min and trying next.`,
          err.cause
        );
        setCooldown(provider.name, err.cooldownMs, err.message);
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
