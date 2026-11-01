import {NextResponse} from 'next/server';
import {supabase} from '../../../lib/stats-server';
import {FEEDBACK_STATIONS,FEEDBACK_TYPES,validateFeedback} from '../../../lib/feedback-config';
import {feedbackAccess,feedbackCount,rateKey,sameOrigin,readFeedbackBody,stationPin} from '../../../lib/feedback-server';
export const runtime='nodejs';
const json=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request){
 try{
  if(!sameOrigin(request))return json({error:'origin'},403);
  const data=validateFeedback(await readFeedbackBody(request));if(!data)return json({error:'invalid'},400);
  const result=await (await supabase('rpc/submit_station_feedback',{method:'POST',body:JSON.stringify({p_data:data,p_rate_key:rateKey(request,data.station_id,'submit')})})).json();
  if(result==='limited')return json({error:'limited'},429);
  if(result==='conflict')return json({error:'conflict'},409);
  if(!['created','duplicate'].includes(result))throw Error('Unexpected result');
  return json({ok:true},result==='created'?201:200);
 }catch(e){return json({error:'unavailable'},e.status||503);}
}
export async function GET(request){
 try{
  const q=new URL(request.url).searchParams,station=q.get('station');if(!Object.hasOwn(FEEDBACK_STATIONS,station))return json({error:'station'},400);
  const access=feedbackAccess(request,station);if(!access.allowed)return json({error:'unauthorized',pinConfigured:!!stationPin(station)},401);
  const page=Number(q.get('page')||0),type=q.get('type'),stars=q.get('stars');
  if(!Number.isInteger(page)||page<0||page>10000||(type&&!FEEDBACK_TYPES.includes(type)))return json({error:'invalid'},400);
  const params=new URLSearchParams({select:'id,type,location,location_detail,content,created_at,starred,language',station_id:'eq.'+station,hidden:'eq.false',order:'created_at.desc,id.desc',limit:'10',offset:String(page*10)});
  if(type)params.set('type','eq.'+type);if(stars==='1')params.set('starred','eq.true');
  const [r,count]=await Promise.all([supabase('station_feedback?'+params,{headers:{Prefer:'count=exact'}}),feedbackCount(station)]);
  return json({rows:await r.json(),total:Number(r.headers.get('content-range')?.split('/')[1]||0),recent:count,admin:access.admin});
 }catch(e){return json({error:'unavailable'},e.status||503);}
}
export async function PATCH(request){
 try{
  if(!sameOrigin(request))return json({error:'origin'},403);
  const data=await readFeedbackBody(request),station=data?.station;if(!Object.hasOwn(FEEDBACK_STATIONS,station))return json({error:'station'},400);
  const access=feedbackAccess(request,station);if(!access.allowed)return json({error:'unauthorized',pinConfigured:!!stationPin(station)},401);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id||'') || !['starred','hidden'].includes(data.field) || typeof data.value!=='boolean')return json({error:'invalid'},400);
  if(data.field==='hidden'&&!access.admin)return json({error:'forbidden'},403);
  const params=new URLSearchParams({id:'eq.'+data.id,station_id:'eq.'+station,hidden:'eq.false',select:'id'});
  const r=await supabase('station_feedback?'+params,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({[data.field]:data.value})});
  if(!(await r.json()).length)return json({error:'not_found'},404);
  return json({ok:true});
 }catch(e){return json({error:'unavailable'},e.status||503);}
}
