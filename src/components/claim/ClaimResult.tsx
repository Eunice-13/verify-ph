import { Check, X, TriangleAlert } from "lucide-react";
import { ClaimVerdictStatus } from "@/types";

const CLAIM_RESULT_STATES: Record<
  ClaimVerdictStatus,
  { badgeClass: string; label: string; Icon: typeof Check }
> = {
  VERIFIED: {
    badgeClass: "bg-emerald-700 border-emerald-800",
    label: "TRUE / CORRECT — THIS INFORMATION IS VERIFIED",
    Icon: Check,
  },
  CONTRADICTED: {
    badgeClass: "bg-red-700 border-red-800",
    label: "FALSE / CONTRADICTED — THIS INFORMATION IS INACCURATE",
    Icon: X,
  },
  INSUFFICIENT: {
    badgeClass: "bg-neutral-500 border-neutral-600",
    label: "INSUFFICIENT EVIDENCE — UNABLE TO VERIFY THIS CLAIM",
    Icon: TriangleAlert,
  },
};

/**
 * Renders a claim verdict badge + placeholder evidence card.
 * Placeholder only: the real fact-check backend is not connected yet.
 */
export default function ClaimResult({ status }: { status: ClaimVerdictStatus }) {
  const state = CLAIM_RESULT_STATES[status] ?? CLAIM_RESULT_STATES.INSUFFICIENT;
  const Icon = state.Icon;

  return (
    <div className="mt-10 flex flex-col items-center">
      <div
        className={`inline-flex items-center gap-3 rounded-full ${state.badgeClass} border-2 text-white font-sans font-bold text-sm md:text-base px-6 py-3 shadow-[0_6px_16px_rgba(0,0,0,0.18)]`}
      >
        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" strokeWidth={2.5} />
        </span>
        {state.label}
      </div>
      <div className="mt-8 max-w-2xl bg-white rounded-2xl shadow-[0_6px_18px_rgba(0,0,0,0.12)] p-6">
        <p className="font-sans text-neutral-700 leading-relaxed">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
          dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </p>
      </div>
    </div>
  );
}
