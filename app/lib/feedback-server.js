import {createHmac,timingSafeEqual} from 'node:crypto';
import {supabase,authorized} from './stats-server';
const secret=()=>process.env.FEEDBACK_AUTH_SECRET || process.env.STATS_ADMIN_PASSWORD || '';
const digest=value=>createHmac('sha256',secret()).update(value).digest('hex');
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
export function stationPin(station){
  try{const pin=JSON.parse(process.env.FEEDBACK_STATION_PINS || '{}')[station];return typeof pin==='string' && /^\d{4}$/.test(pin)?pin:null;}catch{return null;}
}
export function verifyPin(station,pin){const expected=stationPin(station);return !!secret() && !!expected && typeof pin==='string' && /^\d{4}$/.test(pin) && equal(digest(pin),digest(expected));}
export function issueFeedbackToken(station){
 const expires=Date.now()+8*60*60*1000;const payload=station+'.'+expires;
 return payload+'.'+digest(payload+'.'+stationPin(station));
}
export function feedbackAccess(request,station){
 if(authorized(request))return {allowed:true,admin:true};
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'') || '';
 const [id,expires,sig,...rest]=token.split('.');
 if(!secret() || !stationPin(station) || rest.length || id!==station || !/^\d{13}$/.test(expires||'') || Number(expires)<Date.now())return {allowed:false,admin:false};
 return {allowed:equal(sig,digest(id+'.'+expires+'.'+stationPin(station))),admin:false};
}
export function rateKey(request,station,action){
 if(!secret())throw Error('Feedback secret not configured');
 // On Vercel only use the platform-overwritten IP header; never store raw IP.
 const ip=process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local';
 return digest([action,station,new Date().toISOString().slice(0,10),ip].join('|'));
}
export async function rateAllowed(request,station,action,max){
 return await (await supabase('rpc/feedback_rate_limit',{method:'POST',body:JSON.stringify({p_key:rateKey(request,station,action),p_max:max})})).json();
}
export async function feedbackCount(station){
 const params=new URLSearchParams({select:'id',station_id:'eq.'+station,hidden:'eq.false',created_at:'gte.'+new Date(Date.now()-30*86400000).toISOString(),limit:'1'});
 const r=await supabase('station_feedback?'+params,{headers:{Prefer:'count=exact'}});
 return Number(r.headers.get('content-range')?.split('/')[1] || 0);
}
export function sameOrigin(request){const origin=request.headers.get('origin');return !origin || origin===new URL(request.url).origin;}
export async function readFeedbackBody(request){
 const reader=request.body?.getReader();if(!reader)throw Object.assign(Error('body'),{status:400});
 const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();throw Object.assign(Error('body'),{status:413});}chunks.push(Buffer.from(value));}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(Error('body'),{status:400});}
}
