import {arrivalStationConfig} from '../../lib/station-arrivals';
import { normalizeArrivals, CURRENT_STATION } from '../../lib/train-arrivals';
import { loadArrivalDestinations } from '../../lib/train-arrival-destinations';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cached=new Map(), pending=new Map();
const CACHE_MS = 15000;
async function load(key,config,cacheKey) {
  const station=config?.station||CURRENT_STATION;
  // Official Seoul real-time subway API uses this HTTP service endpoint.
  // The browser only calls our HTTPS route; the key never reaches client code.
  // Reference: https://data.seoul.go.kr/dataList/OA-12764/A/1/datasetView.do
  const url = `http://swopenapi.seoul.go.kr/api/subway/${encodeURIComponent(key)}/json/realtimeStationArrival/0/${config?80:40}/${encodeURIComponent(station.name)}`;
  const destinationsPromise = config ? loadArrivalDestinations(process.env.SEOUL_SUBWAY_POSITION_API_KEY?.trim(), config.line) : Promise.resolve({});
  let response;
  try { response = await fetch(url, { cache:'no-store', signal:AbortSignal.timeout(10000) }); }
  catch { throw { code:'UPSTREAM_NETWORK', status:502 }; }
  if (!response.ok) throw { code:'UPSTREAM_HTTP', status:502 };
  let payload;
  try { payload = await response.json(); } catch { throw { code:'UPSTREAM_FORMAT', status:502 }; }
  const code = String(payload.errorMessage?.code || payload.RESULT?.CODE || payload.code || '');
  if (code && !['INFO-000','INFO-200'].includes(code)) throw { code:'UPSTREAM_API', providerCode:/^[A-Z]+-\d+$/.test(code)?code:undefined, status:502 };
  if (!code && !Array.isArray(payload.realtimeArrivalList)) throw { code:'UPSTREAM_FORMAT', status:502 };
  const destinations = await destinationsPromise;
  const data = normalizeArrivals(payload,Date.now(),config,{previousData:cached.get(cacheKey)?.data,destinations});
  cached.set(cacheKey,{at:Date.now(),data});if(cached.size>300)cached.delete(cached.keys().next().value);
  return data;
}
export async function GET(request) {
  let code=null;try{if(request?.url)code=new URL(request.url).searchParams.get('station');}catch{return Response.json({code:'INVALID_STATION'},{status:400});}
  const config=code===null?null:arrivalStationConfig(code);
  if(code!==null&&!config)return Response.json({error:'지원하지 않는 역코드입니다.',code:'INVALID_STATION'},{status:400,headers:{'Cache-Control':'no-store'}});
  const cacheKey=code===null?'legacy':code;
  const key = process.env.SEOUL_SUBWAY_ARRIVAL_API_KEY?.trim();
  if (!key) return Response.json({ error:'도착정보 API 환경변수가 설정되지 않았습니다.', code:'NOT_CONFIGURED' }, { status:503, headers:{'Cache-Control':'no-store'} });
  try {
    let data;
    const hit=cached.get(cacheKey);
    if (hit && Date.now()-hit.at < CACHE_MS) data=hit.data;
    else {
      if(!pending.has(cacheKey))pending.set(cacheKey,load(key,config,cacheKey).finally(()=>pending.delete(cacheKey)));
      data=await pending.get(cacheKey);
    }
    return Response.json(data, { headers:{'Cache-Control':'public, max-age=0, s-maxage=15'} });
  } catch (error) {
    // Never log/return provider URLs: authentication is embedded in their paths.
    return Response.json({ error:'실시간 도착정보를 불러오지 못했습니다.', code:error?.code||'ARRIVAL_ERROR', ...(error?.providerCode?{providerCode:error.providerCode}:{}) }, { status:error?.status||502, headers:{'Cache-Control':'no-store'} });
  }
}
