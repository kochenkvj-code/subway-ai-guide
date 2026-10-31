import { supportsStation } from '../../../../lib/train-lost';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const parseKst=x=>{const s=String(x||'').trim();return /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(s)?Date.parse(s.replace(' ','T')+'+09:00'):NaN;};
export async function GET(request){
 const p=new URL(request.url).searchParams,station=(p.get('station')||'').trim().replace(/역$/,''),line=p.get('line');
 if(!/^[1-9]$/.test(line)||!supportsStation(line,station))return Response.json({ok:false,error:'INVALID_STATION'},{status:400});
 const key=process.env.SEOUL_SUBWAY_ARRIVAL_API_KEY?.trim();
 if(!key)return Response.json({ok:false,error:'NOT_CONFIGURED'},{status:503});
 try{
   const url='http://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimeStationArrival/0/80/'+encodeURIComponent(station);
   const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!res.ok)throw Error('HTTP');
   const raw=await res.json(),err=raw.errorMessage?.code||raw.RESULT?.CODE||'';
   if(err&&!['INFO-000','INFO-200'].includes(err))throw Error('UPSTREAM');
   if(!Array.isArray(raw.realtimeArrivalList)&&err!=='INFO-200')throw Error('FORMAT');
   const evidence=(raw.realtimeArrivalList||[]).filter(row=>String(row.subwayId)===String(1000+Number(line))&&row.statnNm===station)
   .filter(row=>{const rec=parseKst(row.recptnDt);return Number.isFinite(rec)&&Date.now()-rec<120000&&Date.now()-rec>-60000;})
   .map(row=>({trainNo:String(row.btrainNo||'').trim(),direction:line==='2'?(row.updnLine==='상행'?'내선':row.updnLine==='하행'?'외선':row.updnLine):row.updnLine,
    label:String(row.trainLineNm||'').slice(0,90)}));
   return Response.json({ok:true,evidence},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({ok:false,error:'ARRIVAL_UNAVAILABLE'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
