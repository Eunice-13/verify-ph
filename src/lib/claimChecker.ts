/**
 * Client-side helper for calling the /api/claim-checker endpoint.
 */

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
      return { success: false, error: body.error ?? "Something went wrong." };
    }

    const data = (await res.json()) as ClaimCheckerSuccessResponse;
    return { success: true, claim: data.claim };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}
