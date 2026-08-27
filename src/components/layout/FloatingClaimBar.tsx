"use client";

import { usePathname } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { Send, Loader2, X } from "lucide-react";
import { useAutoResizeTextarea } from "@/lib/useAutoResizeTextarea";
import ClaimResult from "@/components/claim/ClaimResult";
import ClaimProgress from "@/components/claim/ClaimProgress";
import { submitClaim } from "@/lib/claimChecker";
import type { Claim } from "@/types";

/**
 * Floating / locking claim-checker input bar shown on the home and feed
 * (category) pages. Follows the viewport while scrolling, then locks in
 * place near the bottom of the document so it never overlaps the footer.
 * Hidden entirely on the dedicated Claim Checker page and the Awareness
 * ("Why Verification Matters") page, which has its own dedicated CTAs.
 */
export default function FloatingClaimBar() {
  const pathname = usePathname();

  if (pathname === "/claim-check" || pathname === "/about") return null;

  // Remount on route change via `key` so all local state resets cleanly.
  return <FloatingClaimBarContent key={pathname} />;
}

function FloatingClaimBarContent() {
  const [value, setValue] = useState("");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { ref: textareaRef, resize } = useAutoResizeTextarea();

  // Solid/opaque whenever the user is actively engaging with the bar
  // (hovering, focused inside it, has typed something, or a request is
  // in flight) — glassy/translucent only when it's sitting there idle, so
  // it never blocks reading article titles behind it, but also never
  // reverts to glass mid-typing just because the mouse moved off it.
  const isExpanded = isHovered || value.trim().length > 0 || loading;

  useEffect(() => {
    const BASE_BOTTOM = 32; // matches claim-bar-fixed's default bottom offset (2rem)
    const GAP_ABOVE_FOOTER = 32;

    const updatePosition = () => {
      const bar = document.getElementById("floating-claim-bar");
      const footer = document.getElementById("site-footer");
      if (!bar) return;

      const footerRect = footer?.getBoundingClientRect();
      const footerVisibleHeight = footerRect
        ? Math.max(0, window.innerHeight - footerRect.top)
        : 0;

      const bottomOffset = Math.max(BASE_BOTTOM, footerVisibleHeight + GAP_ABOVE_FOOTER);
      bar.style.bottom = `${bottomOffset}px`;
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  // Lock page scroll while the result modal is open.
  useEffect(() => {
    if (!claim) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [claim]);

  const closeResult = () => {
    setClaim(null);
    setError(null);
  };

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
    } else {
      setError(result.error ?? "Something went wrong.");
    }
  };

  return (
    <div id="floating-claim-bar" className="claim-bar-fixed">
      {loading && (
        <div className="max-w-2xl mx-auto mb-3">
          <ClaimProgress />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`claim-bar-glass flex items-center gap-3 rounded-3xl border-2 border-transparent px-5 py-3 max-w-2xl mx-auto claim-input-wrap transition-all duration-300 ${
          isExpanded ? "claim-bar-glass-solid" : ""
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            resize();
          }}
          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
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
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      <div className="max-w-2xl mx-auto mt-3">
        {error && (
          <p className="text-center text-sm text-red-600 font-sans">{error}</p>
        )}
      </div>

      {claim && (
        <div
          className="claim-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Claim check result"
          onClick={closeResult}
        >
          <div
            className="claim-modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close result"
              onClick={closeResult}
              className="cursor-pointer sticky top-0 z-10 ml-auto w-8 h-8 rounded-full bg-neutral-200 hover:bg-neutral-300 flex items-center justify-center text-neutral-700 transition-colors shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
            <ClaimResult claim={claim} />
          </div>
        </div>
      )}
    </div>
  );
}
