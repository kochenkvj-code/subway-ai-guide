import {supportsStation} from '../../../../lib/train-lost';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const receipt=x=>{const s=String(x||'').trim();return /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(s)?Date.parse(s.replace(' ','T')+'+09:00'):NaN;};
export async function GET(request){
 const q=new URL(request.url).searchParams;
 const station=(q.get('station')||'').trim().replace(/역$/,''),line=q.get('line');
 if(!/^[1-9]$/.test(line)||!supportsStation(line,station))return Response.json({ok:false,error:'INVALID_STATION'},{status:400});
 const key=process.env.SEOUL_SUBWAY_ARRIVAL_API_KEY?.trim();
 if(!key)return Response.json({ok:false,error:'NOT_CONFIGURED'},{status:503});
 try{
   const url='http://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimeStationArrival/0/80/'+encodeURIComponent(station);
   const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('HTTP');
   const json=await response.json(),code=json.errorMessage?.code||json.RESULT?.CODE||'';
   if(code&&!['INFO-000','INFO-200'].includes(code))throw Error('PROVIDER');
   if(!Array.isArray(json.realtimeArrivalList)&&code!=='INFO-200')throw Error('FORMAT');
   const evidence=(json.realtimeArrivalList||[]).filter(row=>String(row.subwayId)===String(1000+Number(line))&&row.statnNm===station)
     .filter(row=>{const t=receipt(row.recptnDt);return Number.isFinite(t)&&Date.now()-t>=-60000&&Date.now()-t<=120000;})
     .map(row=>({trainNo:String(row.btrainNo||'').trim(),line,station,
       directionCode:row.updnLine==='상행'||row.updnLine==='내선'?'0':row.updnLine==='하행'||row.updnLine==='외선'?'1':null,
       arrivalCode:String(row.arvlCd||''),receivedAt:row.recptnDt,
       label:String(row.trainLineNm||'').slice(0,100)}));
   return Response.json({ok:true,evidence},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({ok:false,error:'ARRIVAL_UNAVAILABLE'},{status:502,headers:{'Cache-Control':'no-store'});}
}
