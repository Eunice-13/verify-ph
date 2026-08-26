"use client";

import { useEffect, useState } from "react";

/** Status messages cycled through while a claim check request is in flight. */
const STAGES = [
  "Verifying news source…",
  "Checking news database…",
  "Cross-referencing trusted outlets…",
  "Reviewing evidence…",
];

const STAGE_INTERVAL_MS = 1800;

/**
 * Bold, vibrant progress indicator shown while a claim is being verified:
 * an animated gradient progress bar plus rotating status text.
 */
export default function ClaimProgress() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStageIndex((i) => (i + 1) % STAGES.length);
    }, STAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="max-w-md mx-auto mb-4" role="status" aria-live="polite">
      <p className="text-center text-base font-semibold text-emerald-800 font-sans mb-3">
        {STAGES[stageIndex]}
      </p>
      <div className="claim-progress-track">
        <div className="claim-progress-fill" />
      </div>
    </div>
  );
}
