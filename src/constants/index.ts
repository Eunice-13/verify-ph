// Re-export from types so both "@/constants" and "@/types" paths resolve
// the same array. The gemini.ts prompt references this import.
export { VERDICT_CATEGORIES, type VerdictCategory } from "@/types";
