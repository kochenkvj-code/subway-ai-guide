import { NextResponse } from "next/server";
import { supabase } from "../../../lib/stats-server";
import { isFacilityContext } from "../../../lib/facility-stat";
import { estimateIpRegion } from "../../../lib/ip-region.mjs";
import seoulGuGeo from "../../../v2/lost-found-demo/seoul-gu-geo.json";

export const runtime = "nodejs";
const types = {
  page_view: ["visit", "station_change"],
  quick_menu: ["route", "gate", "fares", "facility", "exchange", "nearby", "staff", "live", "tour", "timetable", "found", "lost", "feedback"],
  ai_question: ["request"],
  route_search: ["request", "success", "failure"],
  language_change: ["ko", "en", "ja", "zh"],
  feedback: ["solved", "not_solved"],
  gate_action: ["e01","e03","e04","e05","e06","e14","e33","e44","opposite","unknown","another","office","details_open","location_diagram_open"],
};
const deviceType = (ua) => /ipad|tablet|android(?!.*mobile)/i.test(ua) ? "태블릿" : /mobile|iphone|ipod|android/i.test(ua) ? "모바일" : "PC";
const osType = (ua) => /ipad|iphone|ipod/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /windows/i.test(ua) ? "Windows" : /macintosh|mac os x/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "기타";
const browserType = (ua) => /edg\//i.test(ua) ? "Edge" : /crios|chrome\//i.test(ua) ? "Chrome" : /fxios|firefox\//i.test(ua) ? "Firefox" : /safari\//i.test(ua) ? "Safari" : "기타";
export async function POST(request) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let diagnostic={event_id:null};
  const reject=(reason,status=400)=>{
    console.warn("[stats/event]",{stage:"validation",reason,status,...diagnostic});
    return NextResponse.json({error:"Invalid event"},{status});
  };
  try {
    if (Number(request.headers.get("content-length") || 0) > 8192) return reject("body_too_large",413);
    let data;
    try {data=await request.json();}catch{return reject("invalid_json");}
    diagnostic={event_id:typeof data?.event_id==="string"&&uuid.test(data.event_id)?data.event_id:null};
    if (data?.event_id != null && (typeof data.event_id !== "string" || !uuid.test(data.event_id))) return reject("invalid_event_id");
    const question = (data?.event_type === "ai_question" || data?.event_type === "route_search" && data?.event_name === "request") && typeof data.question === "string" ? data.question.trim().slice(0,500) : null;
    if (!data || !Object.hasOwn(types, data.event_type) || !types[data.event_type].includes(data.event_name) || !["ko","en","ja","zh"].includes(data.language)) {
      return reject("unsupported_event_or_language");
    }
    diagnostic={...diagnostic,event_type:data.event_type,event_name:data.event_name};
    // Accept only an ephemeral UUID; do not accept user-identifying values.
    const sessionId = typeof data.session_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.session_id) ? data.session_id : null;
    const gateContext = typeof data.context === "string" && /^gate_(e01|e03|e04|e05|e06|e14|e33|e44|opposite|unknown)$/.test(data.context);
    const facilitySelection = isFacilityContext(data.context) && ((data.event_type === "quick_menu" && data.event_name === "facility") || data.event_type === "feedback");
    const stationContext = data.event_type === "page_view" && /^station:[0-9]{4}$/.test(data.context || "");
    const context = gateContext || facilitySelection || stationContext ? data.context : null;
    const clientTime=typeof data.occurred_at === "string" ? Date.parse(data.occurred_at) : NaN;
    const occurred_at=Number.isFinite(clientTime) && Date.now()-clientTime<35*60*1000 && clientTime-Date.now()<300000 ? new Date(clientTime).toISOString() : new Date().toISOString();
    // Only coarse, non-identifying request metadata. Never persist IP or full user-agent. AI question text is restricted to the admin report.
    const ua = request.headers.get("user-agent") || "";
    const countryHeader = (request.headers.get("x-vercel-ip-country") || "").toUpperCase();
    const country = /^[A-Z]{2}$/.test(countryHeader) ? countryHeader : null;
    const ip_region = estimateIpRegion(request.headers, seoulGuGeo);
    await supabase(data.event_id ? "chatbot_events?on_conflict=event_id" : "chatbot_events", { method: "POST", signal:AbortSignal.timeout(8000), headers: { Prefer: data.event_id ? "resolution=ignore-duplicates,return=minimal" : "return=minimal" }, body: JSON.stringify({
      event_type: data.event_type, event_name: data.event_name, language: data.language,
      event_id: data.event_id || null, question, session_id: sessionId, context, occurred_at, country, ip_region, device_type: deviceType(ua), os_type: osType(ua), browser: browserType(ua)
    }) });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Do not log question text, IP, full UA, cookies or credential-bearing URLs.
    const status=String(error?.message||"").match(/request failed: (\d{3})/)?.[1];
    console.error("[stats/event]",{stage:"database",...diagnostic,status:status?Number(status):503,reason:error?.name==="TimeoutError"?"timeout":"storage_unavailable"});
    return NextResponse.json({ error: "Event unavailable" }, { status: 503 });
  }
}
