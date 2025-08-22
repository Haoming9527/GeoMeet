import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Fetch meetups where the user participates
    const { data: meetups, error } = await supabase
      .from("meetups")
      .select("*")
      .contains("participants", [userId])
      .order("start_time", { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to fetch meetups" },
        { status: 500 },
      );
    }

    return NextResponse.json(meetups ?? []);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participants, type } = body as {
      participants: string[];
      type: string;
    };
    if (!participants || participants.length !== 2 || !type) {
      return NextResponse.json(
        { error: "Missing participants or type" },
        { status: 400 },
      );
    }

    // Mark inviter (first participant) as accepted by default
    const inviter = (participants[0] || "").toLowerCase();
    const feedback: Record<string, string> = inviter
      ? { [inviter]: "accepted" }
      : {};

    const { data, error } = await supabase
      .from("meetups")
      .insert({ participants, type, status: "pending", feedback })
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to create meetup" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetupId, userId, action, reaction } = body as {
      meetupId: string;
      userId: string;
      action: "accept" | "decline" | "complete" | "feedback";
      reaction?: "👍" | "👎";
    };

    if (!meetupId || !userId || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Load current meetup
    const { data: current, error: loadErr } = await supabase
      .from("meetups")
      .select("*")
      .eq("id", meetupId)
      .single();

    if (loadErr || !current) {
      return NextResponse.json({ error: "Meetup not found" }, { status: 404 });
    }

    // Normalize addresses
    const me = userId.toLowerCase();
    const participants = (current.participants as string[]).map((p) =>
      p.toLowerCase(),
    );
    const feedbackRaw = (current.feedback as any) || {};
    const feedback: Record<string, string> = {};
    Object.keys(feedbackRaw).forEach(
      (k) => (feedback[k.toLowerCase()] = feedbackRaw[k]),
    );

    if (action === "accept") {
      feedback[me] = "accepted";
      // If both accepted, set status ongoing
      const bothAccepted = participants.every(
        (p) => feedback[p] === "accepted",
      );
      const { error: updErr } = await supabase
        .from("meetups")
        .update({ feedback, status: bothAccepted ? "ongoing" : "pending" })
        .eq("id", meetupId);
      if (updErr) throw updErr;
      return NextResponse.json({ ok: true });
    }

    if (action === "decline") {
      feedback[me] = "declined";
      const { error: updErr } = await supabase
        .from("meetups")
        .update({ feedback, status: "declined" })
        .eq("id", meetupId);
      if (updErr) throw updErr;
      return NextResponse.json({ ok: true });
    }

    if (action === "complete") {
      const { error: updErr } = await supabase
        .from("meetups")
        .update({ status: "completed" })
        .eq("id", meetupId);
      if (updErr) throw updErr;
      return NextResponse.json({ ok: true });
    }

    if (action === "feedback") {
      if (!reaction)
        return NextResponse.json(
          { error: "Missing reaction" },
          { status: 400 },
        );
      feedback[me] = reaction;
      const { error: updErr } = await supabase
        .from("meetups")
        .update({ feedback })
        .eq("id", meetupId);
      if (updErr) throw updErr;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
