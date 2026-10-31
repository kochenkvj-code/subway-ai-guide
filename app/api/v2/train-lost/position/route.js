import { supportsStation } from '../../../../lib/train-lost';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const cache=new Map();
const clean=v=>String(v??'').trim().slice(0,70);
function parseKst(x){const s=String(x||'').trim();return /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(s)?Date.parse(s.replace(' ','T')+'+09:00'):NaN;}
export async function GET(request){
  const p=new URL(request.url).searchParams,line=p.get('line');
  if(!/^[1-9]$/.test(line))return Response.json({ok:false,error:'INVALID_LINE'},{status:400});
  const key=process.env.SEOUL_SUBWAY_ARRIVAL_API_KEY?.trim();
  if(!key)return Response.json({ok:false,error:'NOT_CONFIGURED',positions:[]},{status:503});
  const now=Date.now(),cached=cache.get(line);
  if(cached&&now-cached.at<15000)return Response.json(cached.data,{headers:{'Cache-Control':'no-store'}});
  const url='http://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimePosition/0/500/'+line+'호선';
  try{
    const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(11000)});
    if(!res.ok)throw Error('UPSTREAM_HTTP');
    const raw=await res.json(),message=raw.RESULT?.CODE||raw.errorMessage?.code||'';
    if(message&&!['INFO-000','INFO-200'].includes(message))throw Error('UPSTREAM_'+message);
    if(!Array.isArray(raw.realtimePositionList)&&message!=='INFO-200')throw Error('INVALID_DATA');
    const all=raw.realtimePositionList||[];
    const positions=all.map(x=>{
      const received=parseKst(x.recptnDt);
      return {trainNo:clean(x.trainNo),line:line,station:clean(x.statnNm).replace(/역$/,''),
        status:clean(x.trainSttus),direction:clean(x.updnLine),destination:clean(x.statnTnm),
        express:clean(x.directAt)==='1'||clean(x.directAt)==='7',
        receivedAt:Number.isFinite(received)?new Date(received).toISOString():null};
    }).filter(x=>x.trainNo&&x.receivedAt&&supportsStation(line,x.station)&&Date.now()-Date.parse(x.receivedAt)>=-60000&&Date.now()-Date.parse(x.receivedAt)<=120000);
    const data={ok:true,positions,fetchedAt:new Date().toISOString(),partial:Number(raw.realtimePosition?.list_total_count||0)>all.length};
    cache.set(line,{at:now,data});
    return Response.json(data,{headers:{'Cache-Control':'no-store'}});
  }catch(e){return Response.json({ok:false,error:'LIVE_UNAVAILABLE',positions:[]},{status:502,headers:{'Cache-Control':'no-store'}});}
}
