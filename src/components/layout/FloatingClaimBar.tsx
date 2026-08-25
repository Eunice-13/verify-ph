"use client";

import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAutoResizeTextarea } from "@/lib/useAutoResizeTextarea";
import ClaimResult from "@/components/claim/ClaimResult";
import { ClaimVerdictStatus } from "@/types";

const CLAIM_VERDICT_STATES: ClaimVerdictStatus[] = ["VERIFIED", "CONTRADICTED", "INSUFFICIENT"];

/**
 * Floating / locking claim-checker input bar shown on the home and feed
 * (category) pages. Follows the viewport while scrolling, then locks in
 * place near the bottom of the document so it never overlaps the footer.
 * Hidden entirely on the dedicated Claim Checker page.
 */
export default function FloatingClaimBar() {
  const pathname = usePathname();

  if (pathname === "/claim-check") return null;

  // Remount on route change via `key` so all local state (input value,
  // verdict, scroll-lock position) resets cleanly instead of needing an
  // effect that synchronously calls setState on every navigation.
  return <FloatingClaimBarContent key={pathname} />;
}

function FloatingClaimBarContent() {
  const [value, setValue] = useState("");
  const [verdict, setVerdict] = useState<ClaimVerdictStatus | null>(null);
  const [positionClass, setPositionClass] = useState("claim-bar-fixed");
  const { ref: textareaRef, resize } = useAutoResizeTextarea();

  useEffect(() => {
    const lockThreshold = () =>
      document.documentElement.scrollHeight - window.innerHeight - 160;

    const updatePosition = () => {
      if (verdict) return; // showing a verdict: stay in normal document flow
      const shouldLock = window.scrollY >= lockThreshold();
      setPositionClass(shouldLock ? "claim-bar-locked" : "claim-bar-fixed");
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [verdict]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next = CLAIM_VERDICT_STATES[Math.floor(Math.random() * CLAIM_VERDICT_STATES.length)];
    setVerdict(next);
    setValue("");
    setPositionClass("claim-bar-result");
    requestAnimationFrame(resize);
  };

  return (
    <div id="floating-claim-bar" className={positionClass}>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 bg-white rounded-3xl border-2 border-transparent shadow-[0_6px_18px_rgba(0,0,0,0.15)] px-5 py-3 max-w-2xl mx-auto claim-input-wrap transition-all duration-200"
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
          className="flex-1 bg-transparent outline-none font-sans text-sm text-neutral-700 placeholder:text-neutral-400 resize-none max-h-40 overflow-y-auto leading-relaxed self-center"
        />
        <button
          type="submit"
          aria-label="Submit claim"
          className="cursor-pointer shrink-0 w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors self-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
      <div className="max-w-2xl mx-auto mt-3">
        {verdict && <ClaimResult status={verdict} />}
      </div>
    </div>
  );
}
