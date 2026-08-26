"use client";

import { useEffect, useState } from "react";

/**
 * True once the viewport is at/above `breakpointPx` (default: Tailwind's
 * `md`, 768px). Starts false on the server/first paint to avoid hydration
 * mismatches, then syncs on mount and on resize.
 *
 * Used by the /about pillar "fanned card hand" layout, which needs real
 * absolute-position + rotation math on desktop but a plain stacked column
 * on mobile — a combination that's simpler to branch on in JS than to fight
 * Framer Motion's inline transform styles with Tailwind breakpoint classes.
 */
export function useIsDesktop(breakpointPx = 768): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpointPx]);

  return isDesktop;
}
