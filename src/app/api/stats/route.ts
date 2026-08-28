import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServiceClient();

  const [checkedResult, verifiedResult, contradictedResult] = await Promise.all([
    supabase.from("claims").select("id", { count: "exact", head: true }),
    supabase
      .from("claims")
      .select("id", { count: "exact", head: true })
      .eq("verdict", "Verified"),
    supabase
      .from("claims")
      .select("id", { count: "exact", head: true })
      .eq("verdict", "Contradicted"),
  ]);

  const errors = [checkedResult.error, verifiedResult.error, contradictedResult.error].filter(
    Boolean,
  );

  if (errors.length > 0) {
    console.error("[api/stats] claims query failed:", errors);

    return NextResponse.json(
      { error: "Failed to fetch stats." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    claimsChecked: checkedResult.count ?? 0,
    claimsVerified: verifiedResult.count ?? 0,
    contradictedClaims: contradictedResult.count ?? 0,
  });
}
