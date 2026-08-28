/**
 * Client-side helper for calling the /api/claim-checker endpoint.
 */

import { formatAvailableAt } from "@/lib/useCapacityStatus";
import type { Claim, ClaimCheckerSuccessResponse } from "@/types";

const CLAIM_CHECK_TIMEOUT_MS = 45_000;

export interface ClaimCheckResult {
  success: boolean;
  claim?: Claim;
  error?: string;
}

export async function submitClaim(claimText: string): Promise<ClaimCheckResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), CLAIM_CHECK_TIMEOUT_MS);

  try {
    const res = await fetch("/api/claim-checker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: claimText }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const baseError: string = body.detail ?? body.error ?? "Something went wrong.";
      // When the whole provider pool is in cooldown (see
      // getCapacityStatus() in lib/llm-providers.ts), the API includes
      // exactly when it's expected to recover — surface that directly in
      // this specific failure's message, in addition to the persistent
      // site-wide CapacityBanner.
      const error: string = body.availableAt
        ? `${baseError} Try again after ${formatAvailableAt(body.availableAt)}.`
        : baseError;
      return { success: false, error };
    }

    const data = (await res.json()) as ClaimCheckerSuccessResponse;
    return { success: true, claim: data.claim };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        success: false,
        error: "Claim check timed out. Please try again in a moment.",
      };
    }
    return { success: false, error: "Network error. Please try again." };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
