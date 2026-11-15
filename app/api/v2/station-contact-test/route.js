export const runtime='nodejs';
export const dynamic='force-dynamic';
const STATIONS=[
 ['4126','언주'],['4127','선정릉'],['4128','삼성중앙'],['4129','봉은사'],['4130','종합운동장'],
 ['4131','삼전'],['4132','석촌고분'],['4133','석촌'],['4134','송파나루'],['4135','한성백제'],
 ['4136','올림픽공원'],['4137','둔촌오륜'],['4138','중앙보훈병원'],
];
const nameKey=v=>String(v??'').normalize('NFKC').replace(/\([^)]*\)/g,'').replace(/역$/,'').replace(/\s/g,'').trim();
const lineNine=v=>/^(?:0?9(?:호선)?|9호선(?:2|3)(?:단계)?|9호선2[·~\-]3단계)$/.test(String(v??'').replace(/\s/g,''));
const text=v=>String(v??'').trim();
let cache=null,inFlight=null;
async function query(){
 const key=process.env.SEOUL_METRO_STATION_CONTACT_API_KEY?.trim();
 if(!key)return {ok:false,error:'KEY_NOT_CONFIGURED'};
 let error='UPSTREAM_UNAVAILABLE';
 for(const host of ['https://openapi.seoul.go.kr:8088','http://openapi.seoul.go.kr:8088','https://openapi.seoul.go.kr']){
  try{
   const endpoint=host+'/'+encodeURIComponent(key)+'/json/StationAdresTelno/1/600/';
   const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok){error='UPSTREAM_HTTP_'+response.status;continue;}
   const data=await response.json();
   const obj=data?.StationAdresTelno;
   if(!obj||!Array.isArray(obj.row)){
    const code=text(obj?.RESULT?.CODE||data?.RESULT?.CODE);
    error=code==='INFO-100'||code==='INFO-300'||code==='ERROR-300'?'KEY_OR_PERMISSION_REJECTED':code?'API_'+code.replace(/[^A-Z0-9-]/g,'').slice(0,35):'UNEXPECTED_API_RESPONSE';
    continue;
   }
   const all=obj.row,records=all.filter(x=>lineNine(x.SBWY_ROUT_LN));
   const stations=STATIONS.map(([code,name])=>{
    const found=records.filter(x=>nameKey(x.SBWY_STNS_NM)===nameKey(name));
    return {code,name,found:found.length>0,records:found.map(x=>({
     line:text(x.SBWY_ROUT_LN),station:text(x.SBWY_STNS_NM),
     phone:text(x.TELNO),roadAddress:text(x.ROAD_NM_ADDR),oldAddress:text(x.OLD_ADDR)
    }))};
   });
   return {ok:true,source:'서울 열린데이터광장 StationAdresTelno',sourceTotal:Number(obj.list_total_count||all.length),
    loaded:all.length,ninthLineRecords:records.length,
    matched:stations.filter(s=>s.found).length,missing:stations.filter(s=>!s.found).map(s=>s.name),
    fetchedAt:new Date().toISOString(),stations};
  }catch{error='UPSTREAM_UNAVAILABLE';}
 }
 return {ok:false,error};
}
export async function GET(){
 if(cache&&Date.now()-cache.at<600000)return Response.json(cache.data,{status:cache.data.ok?200:502,headers:{'Cache-Control':'no-store'}});
 try{
  if(!inFlight)inFlight=query().finally(()=>{inFlight=null;});
  const data=await inFlight;
  if(data.ok)cache={at:Date.now(),data};
  return Response.json(data,{status:data.ok?200:502,headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({ok:false,error:'UPSTREAM_UNAVAILABLE'},{status:502,headers:{'Cache-Control':'no-store'}});}
}