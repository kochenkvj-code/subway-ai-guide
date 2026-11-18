import {unstable_cache} from 'next/cache';
import {staffAuthorized} from '../../../lib/staff-access';
import {getStationByCode} from '../../../lib/station-master';
import {congestionSlot,compactCongestionRow,selectCongestion,decodeCongestionPage} from '../../../lib/congestion-data';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const headers={'Cache-Control':'private, no-store, max-age=0'};
const reply=(body,status=200)=>Response.json(body,{status,headers});
let pending=null;
async function fetchPage(key,start,end){
 const url='http://openapi.seoul.go.kr:8088/'+encodeURIComponent(key)+'/json/subwConfusion/'+start+'/'+end+'/';
 let res;
 try{res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000),redirect:'error'});}
 catch{throw Error('UPSTREAM_NETWORK');}
 if(!res.ok)throw Error('UPSTREAM_HTTP');
 let data;try{data=await res.json();}catch{throw Error('UPSTREAM_JSON');}
 return decodeCongestionPage(data,start,end);
}
async function refreshData(){
 const key=process.env.SEOUL_CONGESTION_API_KEY?.trim();
 if(!key)throw Error('NOT_CONFIGURED');
 const first=await fetchPage(key,1,1000);
 const pages=[first];
 for(let start=1001;start<=first.total;start+=1000)pages.push(await fetchPage(key,start,Math.min(first.total,start+999)));
 if(pages.some(p=>p.total!==first.total))throw Error('UPSTREAM_PAGE');
 const rows=pages.flatMap(p=>p.rows).map(compactCongestionRow).filter(Boolean);
 if(!rows.length||!rows.some(r=>Object.keys(r.slots).length))throw Error('UPSTREAM_SCHEMA');
 console.info('[congestion-refresh]',{count:first.total,usable:rows.length,pages:pages.length});
 return {rows,fetchedAt:new Date().toISOString(),sourceCount:first.total};
}
// Persist only a successful complete dataset; daily revalidation, no key in cache or response.
// Existing station-position requests never wait on this cache or this API.
const getDataset=unstable_cache(async()=>{
 if(!pending)pending=refreshData().finally(()=>{pending=null;});
 return pending;
},['seoul-subwConfusion-v1'],{revalidate:86400});
export async function GET(request){
 if(!staffAuthorized(request))return reply({error:'FORBIDDEN'},403);
 const code=new URL(request.url).searchParams.get('station');
 const station=getStationByCode(code);
 if(!station)return reply({error:'INVALID_STATION'},400);
 const slot=congestionSlot(),startedAt=Date.now();
 if(!/^[1-8]$/.test(station.line))return reply({stationCode:code,slot,values:{}});
 if(!process.env.SEOUL_CONGESTION_API_KEY?.trim())return reply({error:'NOT_CONFIGURED'},503);
 try{
  const data=await getDataset();
  const values=selectCongestion(data.rows,station,slot);
  console.info('[congestion]',{stationCode:code,slot:slot.key,matched:Object.keys(values).length,elapsedMs:Date.now()-startedAt,sourceCount:data.sourceCount});
  return reply({stationCode:code,slot,values,fetchedAt:data.fetchedAt,sourceCount:data.sourceCount});
 }catch(error){
  const allowed=['UPSTREAM_NETWORK','UPSTREAM_HTTP','UPSTREAM_JSON','UPSTREAM_RESULT','UPSTREAM_PAGE','UPSTREAM_SCHEMA','NOT_CONFIGURED'];
  const reason=allowed.includes(error?.message)?error.message:'UNAVAILABLE';
  console.warn('[congestion]',{reason,elapsedMs:Date.now()-startedAt});
  return reply({error:reason},502);
 }
}
