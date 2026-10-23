import { NextResponse } from "next/server";
import { supabase } from "../../../lib/stats-server";

export const runtime = "nodejs";
const types = {
  page_view: ["visit"],
  quick_menu: ["route", "gate", "fares", "facility", "exchange", "nearby", "staff"],
  ai_question: ["request"],
  route_search: ["request", "success", "failure"],
  language_change: ["ko", "en", "ja", "zh"],
  feedback: ["solved", "not_solved"],
};
export async function POST(request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 2048) return NextResponse.json({ error: "Invalid request" }, { status: 413 });
    const data = await request.json();
    if (!data || !Object.hasOwn(types, data.event_type) || !types[data.event_type].includes(data.event_name) || !["ko","en","ja","zh"].includes(data.language)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }
    await supabase("chatbot_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ event_type: data.event_type, event_name: data.event_name, language: data.language }) });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Event unavailable" }, { status: 503 });
  }
}
