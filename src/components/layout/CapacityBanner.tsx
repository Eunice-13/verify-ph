"use client";

import { CircleAlert } from "lucide-react";
import { useCapacityStatus, formatAvailableAt } from "@/lib/useCapacityStatus";

/**
 * Site-wide banner shown whenever the claim-checker's whole provider pool
 * (Gemini + Backboard fallbacks — see src/lib/llm-providers.ts) is
 * currently exhausted, telling the user when to expect it back. Persisted
 * across page loads via useCapacityStatus()'s localStorage cache, so a
 * user who left and comes back later sees this immediately rather than
 * only finding out by submitting a claim that fails.
 *
 * Renders nothing when capacity is available — this is not a permanent
 * fixture of the layout.
 */
export default function CapacityBanner() {
  const { atCapacity, availableAt } = useCapacityStatus();

  if (!atCapacity) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900">
      <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-center gap-2 text-center">
        <CircleAlert className="w-4 h-4 shrink-0" strokeWidth={2} />
        <p className="font-sans text-sm">
          The Claim Checker is at capacity.
          {availableAt && (
            <>
              {" "}Please try again after{" "}
              <span className="font-semibold">{formatAvailableAt(availableAt)}</span>.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
