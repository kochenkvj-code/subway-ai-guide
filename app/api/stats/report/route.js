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
      const params = new URLSearchParams({ select: "id,session_id,created_at,event_type,event_name,language,country,device_type,os_type,browser,context,occurred_at", and: "(created_at.gte." + from.toISOString() + ",created_at.lt." + until.toISOString() + ")", order: "created_at.asc,id.asc", limit: "1000", offset: String(offset) });
      const response = await supabase("chatbot_events?" + params);
      const batch = await response.json();
      rows.push(...batch);
      if (batch.length < 1000) break;
    }
    const activity={};
    const sessionIds=[...new Set(rows.map(r=>r.session_id).filter(Boolean))];
    for(let i=0;i<sessionIds.length;i+=200){
      const response=await supabase("rpc/get_chatbot_activity",{method:"POST",body:JSON.stringify({p_sessions:sessionIds.slice(i,i+200)})});
      for(const item of await response.json()) activity[item.session_id]=Number(item.visible_ms);
    }
    return NextResponse.json({ rows, activity }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[stats/report]", error);
    const message = String(error?.message || "");
    const detail = message.includes("not configured") ? "환경변수 설정을 확인해 주세요." : message.match(/request failed: (\\d+)/)?.[1] ? "Supabase 응답 코드: " + message.match(/request failed: (\\d+)/)[1] : "서버 로그에서 [stats/report] 오류를 확인해 주세요.";
    return NextResponse.json({ error: "통계 조회 실패. " + detail }, { status: 503 });
  }
}
