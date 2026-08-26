"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

/**
 * Animates a numeric stat from 0 up to its real value once it scrolls into
 * view, then holds — it never replays on subsequent scrolls in/out.
 * Handles mixed formats like "86%", "6× Faster", "Up to 60%" by extracting
 * the leading number and re-appending whatever text surrounds it.
 */
export default function CountUpStat({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState<string>(zeroedValue(value));

  useEffect(() => {
    if (!isInView) return;

    const match = value.match(/[\d.]+/);
    if (!match) {
      setDisplay(value);
      return;
    }

    const target = parseFloat(match[0]);
    const prefix = value.slice(0, match.index);
    const suffix = value.slice((match.index ?? 0) + match[0].length);
    const duration = 1200;
    const start = performance.now();

    let frameId: number;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic for a natural deceleration.
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      const formatted = Number.isInteger(target)
        ? Math.round(current).toString()
        : current.toFixed(1);
      setDisplay(`${prefix}${formatted}${suffix}`);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isInView, value]);

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      {display}
    </motion.span>
  );
}

/** Replaces the leading number in a stat string with 0, for the initial render. */
function zeroedValue(value: string): string {
  const match = value.match(/[\d.]+/);
  if (!match) return value;
  return `${value.slice(0, match.index)}0${value.slice((match.index ?? 0) + match[0].length)}`;
}
