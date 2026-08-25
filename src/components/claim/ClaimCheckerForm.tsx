"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { useAutoResizeTextarea } from "@/lib/useAutoResizeTextarea";
import ClaimResult from "@/components/claim/ClaimResult";
import { ClaimVerdictStatus } from "@/types";

const CLAIM_VERDICT_STATES: ClaimVerdictStatus[] = ["VERIFIED", "CONTRADICTED", "INSUFFICIENT"];

/**
 * The Claim Checker page's own input form + inline verdict result.
 * Placeholder only: the real fact-check backend is not connected yet, so
 * submitting a claim cycles through the three possible presentational
 * outcomes (VERIFIED / CONTRADICTED / INSUFFICIENT) using mock content.
 */
export default function ClaimCheckerForm() {
  const [value, setValue] = useState("");
  const [verdict, setVerdict] = useState<ClaimVerdictStatus | null>(null);
  const { ref: textareaRef, resize } = useAutoResizeTextarea();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next = CLAIM_VERDICT_STATES[Math.floor(Math.random() * CLAIM_VERDICT_STATES.length)];
    setVerdict(next);
    setValue("");
    requestAnimationFrame(resize);
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 bg-white rounded-3xl border-2 border-transparent shadow-sm px-6 py-4 max-w-2xl w-full mx-auto claim-input-wrap transition-all duration-200"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            resize();
          }}
          placeholder="Paste a claim, headline, or link to fact-check…"
          className="flex-1 bg-transparent outline-none font-sans text-neutral-700 placeholder:text-neutral-400 resize-none max-h-60 overflow-y-auto leading-relaxed self-center"
        />
        <button
          type="submit"
          aria-label="Submit claim"
          className="cursor-pointer shrink-0 w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors self-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
      <div className="w-full">{verdict && <ClaimResult status={verdict} />}</div>
    </>
  );
}
