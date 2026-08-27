/**
 * Client-side helper for calling the /api/claim-checker endpoint.
 */

import { formatAvailableAt } from "@/lib/useCapacityStatus";
import type { Claim, ClaimCheckerSuccessResponse } from "@/types";

export interface ClaimCheckResult {
  success: boolean;
  claim?: Claim;
  error?: string;
}

export async function submitClaim(claimText: string): Promise<ClaimCheckResult> {
  try {
    const res = await fetch("/api/claim-checker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: claimText }),
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
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}
