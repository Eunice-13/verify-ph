// Verdict categories — fixed labels used by the Claim Checker.
export const VERDICT_CATEGORIES = [
  "Officially Confirmed",
  "Corroborated",
  "Developing",
  "Insufficient Evidence",
  "Contradicted",
] as const;

export type VerdictCategory = (typeof VERDICT_CATEGORIES)[number];
