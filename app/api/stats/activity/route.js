import { NextResponse } from "next/server";
import { supabase } from "../../../lib/stats-server";
export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request) {
  try {
    if (Number(request.headers.get("content-length") || 0)>1024) return new NextResponse(null,{status:413});
    const data=await request.json();
    if (!data || !uuid.test(data.page_id||"") || !uuid.test(data.session_id||"") || !Number.isSafeInteger(data.visible_ms) || data.visible_ms<0 || data.visible_ms>604800000) return new NextResponse(null,{status:400});
    if(data.visitor_id!=null&&(typeof data.visitor_id!=="string"||!uuid.test(data.visitor_id)))return new NextResponse(null,{status:400});
    const day=data.activity_date;
    if(day!==undefined){
      const time=typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)?Date.parse(day+'T00:00:00+09:00'):NaN;
      const today=Date.parse(new Date(Date.now()+9*3600000).toISOString().slice(0,10)+'T00:00:00+09:00');
      if(!Number.isFinite(time)||new Date(time+9*3600000).toISOString().slice(0,10)!==day||time>today||today-time>2*86400000||data.visible_ms>86400000)return new NextResponse(null,{status:400});
    }
    await supabase(day?(data.visitor_id?'rpc/record_chatbot_activity_v3':'rpc/record_chatbot_activity_v2'):"rpc/record_chatbot_activity",{method:"POST",body:JSON.stringify({p_page_id:data.page_id,p_session_id:data.session_id,p_visible_ms:data.visible_ms,...(day?{p_activity_date:day,...(data.visitor_id?{p_visitor_id:data.visitor_id}:{})}:{})})});
    return new NextResponse(null,{status:204});
  } catch { return new NextResponse(null,{status:503}); }
}
