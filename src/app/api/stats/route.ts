import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { TRUSTED_RSS_SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServiceClient();

  const { count, error } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("[api/stats] query failed:", error);

    return NextResponse.json(
      { error: "Failed to fetch stats." },
      { status: 500 },
    );
  }

  const activeSourceIds = new Set(TRUSTED_RSS_SOURCES.map((source) => source.id));
  const articleCount = count ?? 0;

  return NextResponse.json({
    claimsReported: articleCount,
    claimsVerified: articleCount,
    sourcesTracked: activeSourceIds.size,
  });
}
