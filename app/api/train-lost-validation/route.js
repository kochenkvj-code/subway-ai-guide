// Test-only proxy: compare the existing production public JSON APIs in a
// preview build without requiring preview-scoped copies of API secrets.
// Fixed allowlist; no URL, key, or unrestricted upstream parameter is accepted.
import {supportsStation} from '../../lib/train-lost';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const UPSTREAM='https://subway-ai-guide.vercel.app';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request){
 const query=new URL(request.url).searchParams;
 const type=query.get('type')||'',line=query.get('line')||'';
 if(!['position','timetable','arrival'].includes(type)||!/^[1-9]$/.test(line))
  return reply({ok:false,error:'INVALID_REQUEST'},400);
 const path=type==='position'?'/api/v2/train-lost/position':
   type==='timetable'?'/api/v2/timetable':'/api/v2/train-lost/arrival';
 const params=new URLSearchParams({line});
 if(type!=='position'){
  const station=String(query.get('station')||'').trim().replace(/역$/,'');
  if(!supportsStation(line,station))return reply({ok:false,error:'INVALID_STATION'},400);
  params.set('station',station);
 }
 if(type==='timetable'){
  const direction=query.get('direction'),day=query.get('day');
  if(!['상행','하행','내선','외선'].includes(direction)||!['평일','주말'].includes(day)||
    ((line==='2')!==['내선','외선'].includes(direction)))
    return reply({ok:false,error:'INVALID_TIMETABLE_QUERY'},400);
  params.set('direction',direction);params.set('day',day);
 }
 try{
  const response=await fetch(UPSTREAM+path+'?'+params.toString(),{
   cache:'no-store',signal:AbortSignal.timeout(17000),redirect:'error'
  });
  const json=await response.json();
  return reply(json,response.ok?200:502);
 }catch(e){return reply({ok:false,error:e?.name==='TimeoutError'?'UPSTREAM_TIMEOUT':'UPSTREAM_UNAVAILABLE'},502);}
}
