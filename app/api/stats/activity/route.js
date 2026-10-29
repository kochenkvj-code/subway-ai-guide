import { NextResponse } from "next/server";
import { supabase } from "../../../lib/stats-server";
export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request) {
  try {
    if (Number(request.headers.get("content-length") || 0)>1024) return new NextResponse(null,{status:413});
    const data=await request.json();
    if (!data || !uuid.test(data.page_id||"") || !uuid.test(data.session_id||"") || !Number.isSafeInteger(data.visible_ms) || data.visible_ms<0 || data.visible_ms>604800000) return new NextResponse(null,{status:400});
    await supabase("rpc/record_chatbot_activity",{method:"POST",body:JSON.stringify({p_page_id:data.page_id,p_session_id:data.session_id,p_visible_ms:data.visible_ms})});
    return new NextResponse(null,{status:204});
  } catch { return new NextResponse(null,{status:503}); }
}
