// GET /api/capacity-status
//
// Reports whether the claim-checker's LLM provider pool (see
// src/lib/llm-providers.ts) is currently fully exhausted, and if so, the
// timestamp when the soonest provider is expected to free up. Polled by
// the client-side useCapacityStatus() hook to show a site-wide "try again
// at X" banner, persisted across page loads via localStorage so a user
// who closes the tab and reopens it later still sees the same info
// without needing to submit a claim first to find out.
//
// Deliberately unauthenticated/public — this endpoint reveals no secrets,
// just a boolean and a timestamp, and needs to be callable from every page
// (including before any claim has been submitted).

import { NextResponse } from "next/server";
import { getCapacityStatus } from "@/lib/llm-providers";

export async function GET() {
  const status = await getCapacityStatus();
  return NextResponse.json(status, {
    status: 200,
    headers: {
      // Always re-check rather than letting a CDN/browser cache this —
      // the whole point is to reflect near-real-time cooldown state.
      "Cache-Control": "no-store",
    },
  });
}
