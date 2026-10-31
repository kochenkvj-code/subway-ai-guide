import {supportsStation} from '../../../../lib/train-lost';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const cache=new Map();
const safe=v=>String(v??'').trim().slice(0,90);
export function positionReceipt(row){
  const raw=safe(row.recptnDt),date=safe(row.lastRecptnDt);
  const complete=/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d$/.test(raw)?raw:
    /^\d{4}-\d\d-\d\d$/.test(date)&&/^\d\d:\d\d:\d\d$/.test(raw)?date+' '+raw:
    /^\d{8}$/.test(date)&&/^\d\d:\d\d:\d\d$/.test(raw)?date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6)+' '+raw:'';
  return complete?Date.parse(complete.replace(' ','T')+'+09:00'):NaN;
}
export async function GET(request){
  const line=new URL(request.url).searchParams.get('line');
  if(!/^[1-9]$/.test(line))return Response.json({ok:false,error:'INVALID_LINE'},{status:400});
  const key=process.env.SEOUL_SUBWAY_ARRIVAL_API_KEY?.trim();
  if(!key)return Response.json({ok:false,error:'NOT_CONFIGURED',positions:[]},{status:503});
  const now=Date.now(),cached=cache.get(line);
  if(cached&&now-cached.at<15000)return Response.json(cached.data,{headers:{'Cache-Control':'no-store'}});
  const url='http://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimePosition/0/500/'+line+'호선';
  try{
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(11000)});
    if(!response.ok)throw Error('HTTP_ERROR');
    const json=await response.json(),code=json.RESULT?.CODE||json.errorMessage?.code||'';
    if(code&&!['INFO-000','INFO-200'].includes(code))throw Error('PROVIDER_ERROR');
    if(!Array.isArray(json.realtimePositionList)&&code!=='INFO-200')throw Error('INVALID_DATA');
    const rows=json.realtimePositionList||[];
    const positions=rows.map(row=>{
      const received=positionReceipt(row);
      return {trainNo:safe(row.trainNo),line,station:safe(row.statnNm).replace(/역$/,''),
        status:safe(row.trainSttus),direction:safe(row.updnLine),
        destination:safe(row.statnTnm),express:['1','7'].includes(safe(row.directAt)),
        receivedAt:Number.isFinite(received)?new Date(received).toISOString():null};
    }).filter(x=>x.trainNo&&x.receivedAt&&supportsStation(line,x.station)&&
      Date.now()-Date.parse(x.receivedAt)>=-60000&&Date.now()-Date.parse(x.receivedAt)<=120000);
    const data={ok:true,positions,fetchedAt:new Date().toISOString(),
      partial:Number(json.realtimePosition?.list_total_count||0)>rows.length};
    cache.set(line,{at:now,data});
    return Response.json(data,{headers:{'Cache-Control':'no-store'}});
  }catch{
    return Response.json({ok:false,error:'LIVE_UNAVAILABLE',positions:[]},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
