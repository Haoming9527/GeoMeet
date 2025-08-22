import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const type = searchParams.get("type");
    const industry = searchParams.get("industry") || undefined;

    if (!type)
      return NextResponse.json({ error: "Missing type" }, { status: 400 });

    let query = supabase.from("profiles").select("*").eq("availability", type);
    if (industry) {
      query = query.eq("industry", industry);
    }

    const { data: users, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Simple ~1km bounding box filter (approx; 0.01 deg ~ 1.1km latitude)
    const nearby = (users || []).filter(
      (u: any) =>
        Math.abs((u?.lat ?? 0) - lat) < 0.01 &&
        Math.abs((u?.lng ?? 0) - lng) < 0.01,
    );

    return NextResponse.json(nearby);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
