"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Auto-resizes a <textarea> to fit its content as the user types, mirroring
 * the autoResize() behavior from the original vanilla-JS main.js.
 */
export function useAutoResizeTextarea() {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    // Deferred to the next animation frame so the textarea has completed its
    // initial layout pass before we read scrollHeight (otherwise it can read
    // back 0 on first mount).
    const raf = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(raf);
  }, [resize]);

  return { ref, resize };
}
