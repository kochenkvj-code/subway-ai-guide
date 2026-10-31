import { NextResponse } from "next/server";
import { supabase } from "../../../lib/stats-server";
import { isFacilityContext } from "../../../lib/facility-stat";

export const runtime = "nodejs";
const types = {
  page_view: ["visit"],
  quick_menu: ["route", "gate", "fares", "facility", "exchange", "nearby", "staff", "live", "tour"],
  ai_question: ["request"],
  route_search: ["request", "success", "failure"],
  language_change: ["ko", "en", "ja", "zh"],
  feedback: ["solved", "not_solved"],
  gate_action: ["e01","e03","e04","e05","e06","e14","e33","e44","opposite","unknown","another","office","details_open"],
};
const deviceType = (ua) => /ipad|tablet|android(?!.*mobile)/i.test(ua) ? "태블릿" : /mobile|iphone|ipod|android/i.test(ua) ? "모바일" : "PC";
const osType = (ua) => /ipad|iphone|ipod/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /windows/i.test(ua) ? "Windows" : /macintosh|mac os x/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "기타";
const browserType = (ua) => /edg\//i.test(ua) ? "Edge" : /crios|chrome\//i.test(ua) ? "Chrome" : /fxios|firefox\//i.test(ua) ? "Firefox" : /safari\//i.test(ua) ? "Safari" : "기타";
export async function POST(request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 8192) return NextResponse.json({ error: "Invalid request" }, { status: 413 });
    const data = await request.json();
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (data?.event_id != null && (typeof data.event_id !== "string" || !uuid.test(data.event_id))) return NextResponse.json({error:"Invalid event ID"},{status:400});
    const question = data?.event_type === "ai_question" && typeof data.question === "string" ? data.question.trim().slice(0,500) : null;
    if (!data || !Object.hasOwn(types, data.event_type) || !types[data.event_type].includes(data.event_name) || !["ko","en","ja","zh"].includes(data.language)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }
    // Accept only an ephemeral UUID; do not accept user-identifying values.
    const sessionId = typeof data.session_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.session_id) ? data.session_id : null;
    const gateContext = typeof data.context === "string" && /^gate_(e01|e03|e04|e05|e06|e14|e33|e44|opposite|unknown)$/.test(data.context);
    const facilitySelection = isFacilityContext(data.context) && ((data.event_type === "quick_menu" && data.event_name === "facility") || data.event_type === "feedback");
    const context = gateContext || facilitySelection ? data.context : null;
    const clientTime=typeof data.occurred_at === "string" ? Date.parse(data.occurred_at) : NaN;
    const occurred_at=Number.isFinite(clientTime) && Math.abs(Date.now()-clientTime)<300000 ? new Date(clientTime).toISOString() : new Date().toISOString();
    // Only coarse, non-identifying request metadata. Never persist IP or full user-agent. AI question text is restricted to the admin report.
    const ua = request.headers.get("user-agent") || "";
    const countryHeader = (request.headers.get("x-vercel-ip-country") || "").toUpperCase();
    const country = /^[A-Z]{2}$/.test(countryHeader) ? countryHeader : null;
    await supabase(data.event_id ? "chatbot_events?on_conflict=event_id" : "chatbot_events", { method: "POST", headers: { Prefer: data.event_id ? "resolution=ignore-duplicates,return=minimal" : "return=minimal" }, body: JSON.stringify({
      event_type: data.event_type, event_name: data.event_name, language: data.language,
      event_id: data.event_id || null, question, session_id: sessionId, context, occurred_at, country, device_type: deviceType(ua), os_type: osType(ua), browser: browserType(ua)
    }) });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Event unavailable" }, { status: 503 });
  }
}
