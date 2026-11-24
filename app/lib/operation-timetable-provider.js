import {unstable_cache} from 'next/cache';
import {normalizeOperationStationCode,operationDays} from './operation-timetable-model';
export const operationRevision='895a541f-19c4-4457-a330-99ae77b0dc4b';
const endpoint='https://api.odcloud.kr/api/15098251/v1/uddi:'+operationRevision;
const cache=new Map(),pending=new Map(),ttl=300000,maxAge=86400000;
const fields=['고유번호','호선','역사코드','역사명','주중주말','방향','급행여부','열차코드','열차도착시간','열차출발시간','출발역','도착역'];
async function validatedSource(stationCode,line,kind){
 const id=operationRevision+'|'+stationCode+'|'+line+'|'+kind;
 if(!pending.has(id))pending.set(id,(async()=>{
  const station={stationCode,line};
  let key=process.env.SEOUL_METRO_OPERATION_TIMETABLE_API_KEY?.trim();if(!key)throw Error('NOT_CONFIGURED');
  try{if(key.includes('%'))key=decodeURIComponent(key);}catch{throw Error('INVALID_KEY_ENCODING');}
  const rows=[],ids=new Set();let total=null;
  for(let page=1;page<=5;page++){
   const url=new URL(endpoint);for(const[k,v]of Object.entries({serviceKey:key,page:String(page),perPage:'1000',returnType:'JSON','cond[역사코드::EQ]':station.stationCode,'cond[주중주말::EQ]':kind,'cond[호선::EQ]':station.line}))url.searchParams.set(k,v);
   let response;try{response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw Error('UPSTREAM_NETWORK');}
   if(!response.ok)throw Error('UPSTREAM_HTTP');
   const text=await response.text();if(text.length>3000000)throw Error('UPSTREAM_SIZE');
   let data;try{data=JSON.parse(text);}catch{throw Error('UPSTREAM_JSON');}
   const count=Number(data.matchCount);
   if(!Array.isArray(data.data)||!Number.isInteger(count)||count<0||count>5000||Number(data.page)!==page||Number(data.perPage)!==1000||Number(data.currentCount)!==data.data.length||data.data.length!==Math.max(0,Math.min(1000,count-(page-1)*1000)))throw Error('UPSTREAM_PAGE');
   if(total!==null&&total!==count)throw Error('SOURCE_CHANGED');total=count;
   for(const raw of data.data){
    if(fields.some(f=>!Object.hasOwn(raw,f))||normalizeOperationStationCode(raw['역사코드'])!==station.stationCode||String(raw['호선'])!==station.line||raw['주중주말']!==kind)throw Error('UPSTREAM_FILTER');
    const recordId=String(raw['고유번호']);if(!recordId||ids.has(recordId))throw Error('UPSTREAM_DUPLICATE_PAGE');ids.add(recordId);
    rows.push(Object.fromEntries(fields.map(f=>[f,String(raw[f]??'').trim()])));
   }
   if(rows.length===total)break;
  }
  if(rows.length!==total)throw Error('UPSTREAM_PAGE');
  return {rows,total,revision:operationRevision,dataset:'15098251',fetchedAt:new Date().toISOString()};
 })().finally(()=>pending.delete(id)));
 return pending.get(id);
}
// Only a complete, newly fetched source can enter the shared cache. A failed
// refresh throws, allowing Next.js to retain its previous successful entry.
const sharedSource=unstable_cache(validatedSource,['operation-timetable-source-v1',operationRevision],{revalidate:300});
export async function loadOperationTimetable(station,day){
 const kind=operationDays[day];if(!kind)throw Error('INVALID_DAY');
 const id=operationRevision+'|'+station.stationCode+'|'+station.line+'|'+kind,cached=cache.get(id);
 if(cached&&Date.now()-cached.at<ttl)return {...cached.data,cacheState:'fresh'};
 try{
  const data=await sharedSource(station.stationCode,station.line,kind);
  const at=Date.parse(data.fetchedAt),age=Date.now()-at;
  if(!Number.isFinite(at)||age>=maxAge)throw Error('SOURCE_TOO_OLD');
  // Preserve the source timestamp: reading a shared/stale entry never starts a
  // new five-minute freshness window or renews its 24-hour fallback lifetime.
  cache.set(id,{data,at});if(cache.size>60)cache.delete(cache.keys().next().value);
  return {...data,cacheState:age>=ttl?'stale':'fresh'};
 }catch(error){
  if(cached&&Date.now()-cached.at<maxAge)return {...cached.data,cacheState:'stale',refreshError:error.message};
  throw error;
 }
}
