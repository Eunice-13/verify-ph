"use client";

import { usePathname } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Send, Loader2, X } from "lucide-react";
import { useAutoResizeTextarea } from "@/lib/useAutoResizeTextarea";
import ClaimResult from "@/components/claim/ClaimResult";
import ClaimProgress from "@/components/claim/ClaimProgress";
import { submitClaim } from "@/lib/claimChecker";
import type { Claim } from "@/types";

/**
 * Claim-checker input bar with "docking" scroll behavior:
 *
 * - A placeholder div ("dock zone") lives in normal document flow between
 *   the main content and the footer.
 * - When the dock zone is fully visible in the viewport, the bar sits
 *   inside it (position: static, normal flow — no overlap possible).
 * - When the dock zone scrolls out of view (user scrolled up away from it),
 *   the bar becomes position: fixed at the viewport bottom so it's always
 *   reachable.
 *
 * Uses IntersectionObserver with threshold: 1.0 so it only "docks" when
 * the entire placeholder is visible — prevents footer overlap entirely.
 */
export default function FloatingClaimBar() {
  const pathname = usePathname();

  if (pathname === "/claim-check" || pathname === "/about") return null;

  return <FloatingClaimBarContent key={pathname} />;
}

function FloatingClaimBarContent() {
  const [value, setValue] = useState("");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const { ref: textareaRef, resize } = useAutoResizeTextarea();

  const isExpanded = isHovered || value.trim().length > 0 || loading;

  // Neon variant when docked (near stats), default when floating
  const isNearStats = isDocked;

  // IntersectionObserver: dock when the placeholder is fully in view.
  // When docked, the bar sits in normal document flow above the footer.
  // When the dock zone scrolls out of view, the bar floats fixed at the
  // viewport bottom.
  useEffect(() => {
    const dockZone = dockRef.current;
    if (!dockZone) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsDocked(entry.isIntersecting && entry.intersectionRatio >= 0.99);
      },
      { threshold: 1.0 }
    );

    observer.observe(dockZone);
    return () => observer.disconnect();
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
    requestAnimationFrame(resize);

    const result = await submitClaim(text);

    setLoading(false);

    if (result.success && result.claim) {
      setClaim(result.claim);
      setValue("");
      requestAnimationFrame(resize);
    } else {
      setError(result.error ?? "Something went wrong.");
    }
  };

  const formClasses = isNearStats
    ? `claim-bar-glass flex items-center gap-3 rounded-3xl border-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.45)] px-5 py-3 max-w-2xl mx-auto transition-all duration-300 ${isExpanded ? "claim-bar-glass-solid" : ""}`
    : `claim-bar-glass flex items-center gap-3 rounded-3xl border-2 border-transparent px-5 py-3 max-w-2xl mx-auto transition-all duration-300 ${isExpanded ? "claim-bar-glass-solid" : ""}`;

  const barContent = (
    <>
      {loading && (
        <div className="max-w-2xl mx-auto mb-3">
          <ClaimProgress />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={formClasses}
        data-context={isNearStats ? "hero" : "default"}
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
          placeholder="Paste a claim, headline, or link to fact-check..."
          className="flex-1 bg-transparent outline-none font-sans text-sm text-neutral-700 placeholder:text-neutral-400 resize-none max-h-40 overflow-y-auto leading-normal py-0 self-center"
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
    </>
  );

  return (
    <>
      {/* Dock zone placeholder — reserves space in the layout so content
          doesn't jump when the bar docks/undocks. Matches bar height. */}
      <div
        ref={dockRef}
        id="input-dock-zone"
        className="w-full pt-0 pb-5 px-1"
        aria-hidden="true"
      >
        {isDocked && (
          <div id="floating-claim-bar" className="w-full">
            {barContent}
          </div>
        )}
        {/* Invisible spacer when floating so layout doesn't shift */}
        {!isDocked && <div className="max-w-2xl mx-auto h-[52px]" />}
      </div>

      {/* Floating version — fixed to viewport bottom when dock zone not visible */}
      {!isDocked && (
        <div
          id="floating-claim-bar"
          className="fixed bottom-6 left-0 right-0 z-40 px-6"
        >
          {barContent}
        </div>
      )}
    </>
  );
}
