import {NextResponse} from 'next/server';
import {FEEDBACK_STATIONS} from '../../../../lib/feedback-config';
import {stationPin,verifyPin,issueFeedbackToken,rateAllowed,sameOrigin,readFeedbackBody} from '../../../../lib/feedback-server';
export const runtime='nodejs';
export async function POST(request){
 const json=(data,status)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 try{
  if(!sameOrigin(request))return json({error:'origin'},403);
  const data=await readFeedbackBody(request);if(!Object.hasOwn(FEEDBACK_STATIONS,data?.station))return json({error:'invalid'},400);
  if(!stationPin(data.station))return json({error:'not_configured'},503);
  if(!await rateAllowed(request,data.station,'auth',10))return json({error:'limited'},429);
  if(!verifyPin(data.station,data.pin))return json({error:'incorrect'},401);
  return json({token:issueFeedbackToken(data.station)},200);
 }catch(e){return json({error:'unavailable'},e.status||503);}
}
