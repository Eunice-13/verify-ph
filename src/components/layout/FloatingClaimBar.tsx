"use client";

import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useAutoResizeTextarea } from "@/lib/useAutoResizeTextarea";
import ClaimResult from "@/components/claim/ClaimResult";
import { submitClaim } from "@/lib/claimChecker";
import type { Claim } from "@/types";

/**
 * Floating / locking claim-checker input bar shown on the home and feed
 * (category) pages. Follows the viewport while scrolling, then locks in
 * place near the bottom of the document so it never overlaps the footer.
 * Hidden entirely on the dedicated Claim Checker page.
 */
export default function FloatingClaimBar() {
  const pathname = usePathname();

  if (pathname === "/claim-check") return null;

  // Remount on route change via `key` so all local state resets cleanly.
  return <FloatingClaimBarContent key={pathname} />;
}

function FloatingClaimBarContent() {
  const [value, setValue] = useState("");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positionClass, setPositionClass] = useState("claim-bar-fixed");
  const { ref: textareaRef, resize } = useAutoResizeTextarea();

  useEffect(() => {
    const lockThreshold = () =>
      document.documentElement.scrollHeight - window.innerHeight - 160;

    const updatePosition = () => {
      if (claim) return; // showing a verdict: stay in normal document flow
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
  }, [claim]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setClaim(null);
    setValue("");
    requestAnimationFrame(resize);

    const result = await submitClaim(text);

    setLoading(false);

    if (result.success && result.claim) {
      setClaim(result.claim);
      setPositionClass("claim-bar-result");
    } else {
      setError(result.error ?? "Something went wrong.");
    }
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
          disabled={loading}
        />
        <button
          type="submit"
          aria-label="Submit claim"
          disabled={loading}
          className="cursor-pointer shrink-0 w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors self-center disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
      </form>

      <div className="max-w-2xl mx-auto mt-3">
        {loading && (
          <p className="text-center text-sm text-neutral-500 font-sans animate-pulse">
            Checking claim against trusted sources…
          </p>
        )}
        {error && (
          <p className="text-center text-sm text-red-600 font-sans">{error}</p>
        )}
        {claim && <ClaimResult claim={claim} />}
      </div>
    </div>
  );
}
