import {createHash,timingSafeEqual} from 'node:crypto';
import {staffAuthorized} from '../../lib/staff-access';
import {timetableStation,serviceClock} from '../../lib/timetable-lab-model';
import {normalizeOperationStationCode,operationDays,compileOperationTimetable} from '../../lib/operation-timetable-model';
import {loadOperationTimetable} from '../../lib/operation-timetable-provider';

// Isolated read-only probe. Existing timetable providers and screens do not import it.
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const revision='895a541f-19c4-4457-a330-99ae77b0dc4b';
const probeHash='ce06f6760dccd5627821d4acd05f4e45b1321db503ce731e49979315ddae7d27';
const probeExpires=1795338925169;
const columns=['고유번호','호선','역사코드','역사명','주중주말','방향','급행여부','열차코드','열차도착시간','열차출발시간','출발역','도착역'];
let lastStarted=0;
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
function probeAuthorized(request){
 if(Date.now()>probeExpires)return false;
 const raw=request.headers.get('authorization')?.replace(/^Bearer /,'')||new URL(request.url).searchParams.get('probe')||'';
 if(!/^[a-f0-9]{64}$/.test(raw))return false;
 return timingSafeEqual(Buffer.from(createHash('sha256').update(raw).digest('hex')),Buffer.from(probeHash));
}
const count=value=>value!=null&&Number.isFinite(Number(value))?Number(value):null;
export async function GET(request){
 if(!staffAuthorized(request)&&!probeAuthorized(request))return reply({ok:false,error:'FORBIDDEN'},403);
 const q=new URL(request.url).searchParams,mode=q.get('mode')||'station-day',day=q.get('day')||'DAY';
 const page=Number(q.get('page')||1),perPage=Number(q.get('perPage')||20);
 const rev=q.get('revision')||revision;
 if(!['none','station','station-day','day','impossible','schema','compiled'].includes(mode)||!['DAY','SAT','END'].includes(day)||!Number.isInteger(page)||page<1||page>20||!Number.isInteger(perPage)||perPage<1||perPage>1000||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(rev))return reply({ok:false,error:'INVALID_QUERY'},400);
 let key=process.env.SEOUL_METRO_OPERATION_TIMETABLE_API_KEY?.trim();
 // Accept either portal key representation without double URL-encoding it.
 try{if(key?.includes('%'))key=decodeURIComponent(key);}catch{return reply({ok:false,error:'INVALID_KEY_ENCODING'},503);}
 if(!key)return reply({ok:false,error:'NOT_CONFIGURED'},503);
 if(Date.now()-lastStarted<1500)return reply({ok:false,error:'SLOW_DOWN'},429);
 lastStarted=Date.now();const started=Date.now();
 const selectedCode=normalizeOperationStationCode(q.get('stationCode')||'0154'),selectedStation=timetableStation(selectedCode);
 if(!selectedStation)return reply({ok:false,error:'INVALID_STATION'},400);
 const station=mode==='impossible'?'9999':selectedCode;
 if(mode==='compiled'){
  try{
   const label=Object.keys(operationDays).find(k=>operationDays[k]===day),source=await loadOperationTimetable(selectedStation,label);
   return reply({ok:true,stationCode:selectedCode,day:label,businessDate:serviceClock().businessDate,...compileOperationTimetable(source.rows,selectedStation),source:{dataset:source.dataset,revision:source.revision,total:source.total,fetchedAt:source.fetchedAt,cacheState:source.cacheState}});
  }catch(error){const allowed=['NOT_CONFIGURED','INVALID_KEY_ENCODING','UPSTREAM_NETWORK','UPSTREAM_HTTP','UPSTREAM_SIZE','UPSTREAM_JSON','UPSTREAM_PAGE','SOURCE_CHANGED','UPSTREAM_FILTER','UPSTREAM_DUPLICATE_PAGE'];return reply({ok:false,error:'COMPILED_PROBE_FAILED',reason:allowed.includes(error.message)?error.message:'UNAVAILABLE'},502);}
 }
 const hasStation=['station','station-day','impossible'].includes(mode),hasDay=['station-day','day'].includes(mode);
 const url=mode==='schema'?new URL('https://infuser.odcloud.kr/oas/docs?namespace=15098251/v1'):new URL('https://api.odcloud.kr/api/15098251/v1/uddi:'+rev);
 if(mode!=='schema'){
  url.searchParams.set('serviceKey',key);url.searchParams.set('page',String(page));url.searchParams.set('perPage',String(perPage));url.searchParams.set('returnType','JSON');
  if(hasStation)url.searchParams.set('cond[역사코드::EQ]',station);
  if(hasDay)url.searchParams.set('cond[주중주말::EQ]',day);
 }
 try{
  const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(18000)});
  const elapsedMs=Date.now()-started;
  // Never return upstream error bodies or exception messages: they may echo credentials.
  if(!response.ok)return reply({ok:false,error:'UPSTREAM_HTTP',upstreamStatus:response.status,elapsedMs},502);
  const text=await response.text();if(text.length>3000000)return reply({ok:false,error:'RESPONSE_TOO_LARGE'},502);
  let data;try{data=JSON.parse(text);}catch{return reply({ok:false,error:'UPSTREAM_NOT_JSON',elapsedMs},502);}
  if(mode==='schema')return reply({ok:true,mode,elapsedMs,paths:Object.keys(data.paths||{}),info:{title:String(data.info?.title||'').slice(0,150),version:String(data.info?.version||'').slice(0,80)}});
  if(!Array.isArray(data.data))return reply({ok:false,error:'UNEXPECTED_SCHEMA',fields:Object.keys(data).filter(k=>/^(page|perPage|totalCount|currentCount|matchCount|data|code|msg|message)$/.test(k)),elapsedMs},502);
  if(data.data.length>1000)return reply({ok:false,error:'ROW_LIMIT_EXCEEDED'},502);
  const rows=data.data.map(r=>Object.fromEntries(columns.filter(c=>Object.hasOwn(r,c)).map(c=>[c,String(r[c]??'').slice(0,120)])));
  const signature=r=>JSON.stringify(columns.map(c=>r[c]??''));
  return reply({ok:true,dataset:'15098251',revision:rev,checkedAt:new Date().toISOString(),elapsedMs,query:{mode,station:hasStation?station:null,day:hasDay?day:null,page,perPage},
   provider:{page:count(data.page),perPage:count(data.perPage),totalCount:count(data.totalCount),matchCount:count(data.matchCount),currentCount:count(data.currentCount)},
   columns:Object.keys(data.data[0]||{}).slice(0,30),returned:rows.length,
   matches:{station:rows.filter(r=>normalizeOperationStationCode(r['역사코드'])===station).length,day:rows.filter(r=>r['주중주말']===day).length},
   duplicatesInPage:rows.length-new Set(rows.map(signature)).size,rows});
 }catch(error){return reply({ok:false,error:error?.name==='TimeoutError'?'UPSTREAM_TIMEOUT':'UPSTREAM_UNAVAILABLE',elapsedMs:Date.now()-started},502);}
}
