import {supportsStation} from '../../../../lib/train-lost';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const cache=new Map();
const safe=v=>String(v??'').trim().slice(0,90);
export function positionReceipt(row){
  const raw=safe(row.recptnDt),last=safe(row.lastRecptnDt);
  const pattern=/^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d:\d\d)(?:\.\d+)?$/;
  const full=[raw,last].find(x=>pattern.test(x));
  if(full){const m=full.match(pattern);return Date.parse(m[1]+'T'+m[2]+'+09:00');}
  const date=last.match(/^(\d{4}-\d\d-\d\d|\d{8})/);
  const time=raw.match(/^(\d\d:\d\d:\d\d)(?:\.\d+)?$/);
  if(date&&time){
    const d=date[1].length===8?date[1].slice(0,4)+'-'+date[1].slice(4,6)+'-'+date[1].slice(6):date[1];
    return Date.parse(d+'T'+time[1]+'+09:00');
  }
  return NaN;
}
export async function GET(request){
  const line=new URL(request.url).searchParams.get('line');
  if(!/^[1-9]$/.test(line))return Response.json({ok:false,error:'INVALID_LINE'},{status:400});
  const key=process.env.SEOUL_SUBWAY_POSITION_API_KEY?.trim();
  if(!key)return Response.json({ok:false,error:'NOT_CONFIGURED',positions:[]},{status:503});
  const now=Date.now(),cached=cache.get(line);
  if(cached&&now-cached.at<15000)return Response.json(cached.data,{headers:{'Cache-Control':'no-store'}});
  const url='http://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimePosition/0/500/'+line+'호선';
  try{
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(11000)});
    if(!response.ok)throw Error('HTTP_ERROR');
    const json=await response.json(),code=json.realtimePosition?.RESULT?.CODE||json.RESULT?.CODE||json.errorMessage?.code||'';
    if(code&&!['INFO-000','INFO-200'].includes(code))throw Error('PROVIDER_ERROR');
    if(!Array.isArray(json.realtimePositionList)&&code!=='INFO-200')throw Error('INVALID_DATA');
    const rows=json.realtimePositionList||[];
    const parsed=rows.map(row=>{
      const received=positionReceipt(row);
      return {trainNo:safe(row.trainNo),line,station:safe(row.statnNm).replace(/역$/,''),
        status:safe(row.trainSttus),direction:safe(row.updnLine),
        destination:safe(row.statnTnm),express:['1','7'].includes(safe(row.directAt)),
        receivedAt:Number.isFinite(received)?new Date(received).toISOString():null};
    });
    const validTime=parsed.filter(x=>x.receivedAt&&now-Date.parse(x.receivedAt)>=-60000&&now-Date.parse(x.receivedAt)<=180000);
    const positions=validTime.filter(x=>x.trainNo&&supportsStation(line,x.station));
    const data={ok:true,positions,fetchedAt:new Date().toISOString(),
      diagnostics:{providerRows:rows.length,validTimestamps:parsed.filter(x=>x.receivedAt).length,recentRows:validTime.length,usableRows:positions.length},
      partial:Number(json.realtimePosition?.list_total_count||0)>rows.length};
    cache.set(line,{at:now,data});
    return Response.json(data,{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    return Response.json({ok:false,error:String(error?.message||'LIVE_UNAVAILABLE').slice(0,60),positions:[]},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
