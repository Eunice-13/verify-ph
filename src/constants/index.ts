// Verdict categories — fixed labels used by the Claim Checker.
export const VERDICT_CATEGORIES = [
  "Verified",
  "Contradicted",
  "Insufficient Evidence",
] as const;

export type VerdictCategory = (typeof VERDICT_CATEGORIES)[number];
