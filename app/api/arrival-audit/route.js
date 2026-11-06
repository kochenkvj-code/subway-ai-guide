// Temporary read-only public-data diagnostic. Remove after verifying provider aliases.
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(){
 const key=process.env.SEOUL_SUBWAY_ARRIVAL_API_KEY?.trim();
 if(!key)return Response.json({error:'KEY_MISSING'},{status:503});
 const root='http://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimeStationArrival/';
 const names=['응암','응암순환(상선)','새절','새절(신사)','증산','증산(명지대앞)','대흥','대흥(서강대)','구산','광흥창'];
 const inspect=async name=>{
  try{
   const res=await fetch(root+'0/80/'+encodeURIComponent(name),{cache:'no-store',signal:AbortSignal.timeout(10000)});
   const j=await res.json(),rows=Array.isArray(j.realtimeArrivalList)?j.realtimeArrivalList:[];
   return {name,status:res.status,code:j.errorMessage?.code||j.RESULT?.CODE||null,rowCount:rows.length,stationLabels:[...new Set(rows.map(r=>String(r.statnNm)))].slice(0,12),lines:[...new Set(rows.map(r=>String(r.subwayId)))],ages:rows.slice(0,2).map(r=>r.recptnDt)};
  }catch(e){return {name,error:e.name||'failure'};}
 };
 let all={};
 try{
   const res=await fetch(root+'ALL',{cache:'no-store',signal:AbortSignal.timeout(18000)});
   const j=await res.json(),rows=Array.isArray(j.realtimeArrivalList)?j.realtimeArrivalList:[];
   const byLine={};
   for(const r of rows){const line=String(r.subwayId),name=String(r.statnNm||'');if(!byLine[line])byLine[line]={};byLine[line][name]=(byLine[line][name]||0)+1;}
   all={status:res.status,code:j.errorMessage?.code||j.RESULT?.CODE||null,total:rows.length,byLine};
 }catch(e){all={error:e.name||'failure'};}
 return Response.json({time:new Date().toISOString(),all,samples:await Promise.all(names.map(inspect))},{headers:{'Cache-Control':'no-store'}});
}
