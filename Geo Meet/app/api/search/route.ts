import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const supabase = getSupabase();
    if (!q) return NextResponse.json([]);

    // Simple ILIKE search across name, industry, role and id
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .or(
        `name.ilike.%${q}%,industry.ilike.%${q}%,role.ilike.%${q}%,id.ilike.%${q}%`,
      )
      .limit(25);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e) },
      { status: 500 },
    );
  }
}




