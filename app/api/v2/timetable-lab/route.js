import {providerStation,stationRowMatches} from '../../../lib/station-provider';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const cache=new Map(),pending=new Map();
const endpoint='https://apis.data.go.kr/B553766/schedule/getTrainSch';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function unpack(data){
 const header=data?.response?.header||data?.header||{},body=data?.response?.body||data?.body;
 const code=String(header.resultCode??'');
 if(['03','INFO-200'].includes(code))return {rows:[],total:0};
 if(!['00','0','INFO-000'].includes(code)||!body)throw Error('UPSTREAM_RESULT');
 const items=body.items?.item??body.items??body.item??[];
 return {rows:Array.isArray(items)?items:items&&typeof items==='object'?[items]:[],total:Number(body.totalCount??0)};
}
async function loadDirection(station,day,direction,key){
 const url=new URL(endpoint);
 for(const[k,v]of Object.entries({serviceKey:key,dataType:'JSON',pageNo:'1',numOfRows:'1000',tmprTmtblYn:'N',upbdnbSe:direction,wkndSe:day,lineNm:station.line+'호선',stnCd:station.stationCode}))url.searchParams.set(k,v);
 async function page(n){url.searchParams.set('pageNo',String(n));const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('UPSTREAM_HTTP');return unpack(await response.json());}
 const first=await page(1);let raw=first.rows;
 if(first.total>4000)throw Error('TOO_MANY_ROWS');
 for(let n=2;n<=Math.ceil(first.total/1000);n++)raw.push(...(await page(n)).rows);
 const rows=raw.filter(row=>stationRowMatches(row,station)).map(row=>Object.fromEntries(Object.entries(row).filter(([k])=>!/key|secret|token/i.test(k))));
 const seen=new Set();return {direction,ok:true,total:first.total,rows:rows.filter(row=>{const k=JSON.stringify(Object.keys(row).sort().map(key=>[key,row[key]]));if(seen.has(k))return false;seen.add(k);return true;})};
}
export async function GET(request){
 const q=new URL(request.url).searchParams,station=providerStation(q.get('stationCode'));
 const day=q.get('day')||'평일';
 if(!station||!['평일','주말','공휴일','상시'].includes(day))return json({ok:false,error:'INVALID_QUERY'},400);
 const key=process.env.SEOUL_METRO_TIMETABLE_API_KEY?.trim();if(!key)return json({ok:false,error:'NOT_CONFIGURED'},503);
 const id=station.stationCode+'|'+day,cached=cache.get(id);if(cached&&Date.now()-cached.at<300000)return json(cached.data);
 try{
 if(!pending.has(id))pending.set(id,(async()=>{
 const requested=station.line==='2'?['내선','외선','상행','하행']:['상행','하행'];
 const groups=await Promise.all(requested.map(async direction=>{try{return await loadDirection(station,day,direction,key);}catch(e){return {direction,ok:false,error:['UPSTREAM_HTTP','UPSTREAM_RESULT','TOO_MANY_ROWS'].includes(e.message)?e.message:e.name==='TimeoutError'?'TIMEOUT':'UPSTREAM_UNAVAILABLE',rows:[]};}}));
 const data={ok:groups.some(g=>g.ok),stationCode:station.stationCode,station:station.names.ko,line:station.line,day,groups,updatedAt:new Date().toISOString()};
 if(groups.every(g=>g.ok)){cache.set(id,{at:Date.now(),data});if(cache.size>60)cache.delete(cache.keys().next().value);}return data;
 })().finally(()=>pending.delete(id)));
 const data=await pending.get(id);return json(data,data.ok?200:502);
 }catch{return json({ok:false,error:'UNAVAILABLE'},503);}
}
