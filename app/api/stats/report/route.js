import { NextResponse } from "next/server";
import { authorized, supabase } from "../../../lib/stats-server";

export const runtime = "nodejs";
export async function GET(request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start || "") || !/^\d{4}-\d{2}-\d{2}$/.test(end || "") || start > end) return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    const from = new Date(start + "T00:00:00+09:00");
    const until = new Date(end + "T00:00:00+09:00");
    until.setUTCDate(until.getUTCDate() + 1);
    if (!Number.isFinite(+from) || !Number.isFinite(+until) || (+until - +from) / 86400000 > 93) return NextResponse.json({ error: "Maximum 93 days" }, { status: 400 });
    // PostgREST pages are limited; request in batches to avoid truncating results.
    const rows = [];
    for (let offset = 0; offset < 100000; offset += 1000) {
      const params = new URLSearchParams({ select: "created_at,event_type,event_name,language", created_at: "gte." + from.toISOString(), order: "created_at.asc", limit: "1000", offset: String(offset) });
      params.append("created_at", "lt." + until.toISOString());
      const response = await supabase("chatbot_events?" + params);
      const batch = await response.json();
      rows.push(...batch);
      if (batch.length < 1000) break;
    }
    return NextResponse.json({ rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Unable to load statistics" }, { status: 503 }); }
}
