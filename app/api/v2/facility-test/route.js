// Safe read-only test of the existing, server-side Seoul Metro facility API key.
// This route has a fixed station and a fixed official facility endpoint.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const STATION='종로5가';
const BASE='https://apis.data.go.kr/B553766/facility/getFcElvtr';
function collectItems(value,depth=0) {
  if(depth>7 || value===null || typeof value!=='object') return [];
  if(Array.isArray(value)) return value.filter(x=>x&&typeof x==='object');
  for(const k of ['item','items','row','rows','list','data','resultList']) {
    if(Object.hasOwn(value,k)){
      const result=collectItems(value[k],depth+1);
      if(result.length) return result;
    }
  }
  for(const value2 of Object.values(value)) {
    const result=collectItems(value2,depth+1);
    if(result.length) return result;
  }
  return [];
}
export async function GET() {
  const key=process.env.SEOUL_METRO_FACILITY_API_KEY?.trim();
  if(!key) return Response.json({ok:false,error:'API_KEY_MISSING'}, {status:503,headers:{'Cache-Control':'no-store'}});
  const url=new URL(BASE);
  url.searchParams.set('serviceKey',key);
  url.searchParams.set('dataType','JSON');
  url.searchParams.set('pageNo','1');
  url.searchParams.set('numOfRows','100');
  url.searchParams.set('stnNm',STATION);
  url.searchParams.set('lineNm','1호선');
  try {
    const response=await fetch(url.toString(),{cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!response.ok) return Response.json({ok:false,error:'UPSTREAM_HTTP',status:response.status},{status:502,headers:{'Cache-Control':'no-store'}});
    const body=await response.text();
    let payload;
    try {payload=JSON.parse(body);}catch {return Response.json({ok:false,error:'UPSTREAM_NON_JSON',description:'API 서버가 JSON 대신 다른 형식을 반환했습니다.'},{status:502,headers:{'Cache-Control':'no-store'}});}
    const header=payload?.response?.header||payload?.header||{};
    const code=String(header.resultCode??payload?.resultCode??'');
    const success=!code||code==='00'||code==='0'||code==='INFO-000';
    const items=success?collectItems(payload):[];
    return Response.json({
      ok:success,station:STATION,category:'엘리베이터',api:'서울교통공사_편의시설위치정보',
      endpoint:'getFcElvtr',requested:{stnNm:STATION,lineNm:'1호선',numOfRows:100},
      resultCode:code||null,resultMessage:header.resultMsg||header.resultMessage||null,
      count:items.length,fieldNames:items[0]?Object.keys(items[0]):[],items:items.slice(0,100),
      responseShape:Object.keys(payload),rawStructure:items.length?undefined:payload
    },{status:success?200:502,headers:{'Cache-Control':success?'public, s-maxage=900, stale-while-revalidate=3600':'no-store'}});
  }catch{
    return Response.json({ok:false,error:'UPSTREAM_UNAVAILABLE'}, {status:502,headers:{'Cache-Control':'no-store'}});
  }
}
