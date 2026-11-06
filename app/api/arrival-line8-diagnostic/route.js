// Temporary diagnostic: public aggregate fields only; remove after investigation.
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=40;
export async function GET(){
 const key=process.env.SEOUL_SUBWAY_ARRIVAL_API_KEY?.trim();
 if(!key)return Response.json({error:'NOT_CONFIGURED'},{status:503});
 const root='http://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimeStationArrival/';
 const now=Date.now();
 const normalize=(row)=>{const raw=String(row.recptnDt||'');const at=/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(raw)?Date.parse(raw.replace(' ','T')+'+09:00'):NaN;const age=Number.isFinite(at)?Math.round((now-at)/1000):null;
  let reason=age===null?'invalid_timestamp':age>180?'too_old_180s':age< -60?'future_60s':(['0','1'].includes(String(row.arvlCd))&&age>60)?'arrived_older_than_60s':String(row.arvlCd)==='2'?'departed':'kept';
  return {age,reason,arrival:String(row.arvlCd||''),direction:String(row.updnLine||''),name:String(row.statnNm||'')};
 };
 const summarize=(rows)=>{const out={};for(const r of rows){const n=normalize(r),s=out[n.name]??={total:0,reason:{},arrivalCodes:{},ages:[]};s.total++;s.reason[n.reason]=(s.reason[n.reason]||0)+1;s.arrivalCodes[n.arrival]=(s.arrivalCodes[n.arrival]||0)+1;if(n.age!==null)s.ages.push(n.age);}
   return Object.fromEntries(Object.entries(out).map(([name,s])=>[name,{total:s.total,reason:s.reason,arrivalCodes:s.arrivalCodes,oldestAgeSeconds:Math.max(...s.ages),newestAgeSeconds:Math.min(...s.ages)}]));
 };
 const one=async(name)=>{try{const r=await fetch(root+'0/80/'+encodeURIComponent(name),{cache:'no-store',signal:AbortSignal.timeout(12000)});const j=await r.json(),list=j.realtimeArrivalList||[];return {name,http:r.status,code:j.errorMessage?.code||j.RESULT?.CODE||null,summary:summarize(list)};}catch(e){return {name,error:String(e?.name||'LOOKUP_FAILED').slice(0,25)};}};
 let all;try{const r=await fetch(root+'ALL',{cache:'no-store',signal:AbortSignal.timeout(20000)});const j=await r.json(),rows=j.realtimeArrivalList||[];all={http:r.status,code:j.errorMessage?.code||j.RESULT?.CODE||null,line8:summarize(rows.filter(x=>String(x.subwayId)==='1008')),line6Control:summarize(rows.filter(x=>String(x.subwayId)==='1006'&&x.statnNm==='광흥창'))};}catch(e){all={error:String(e?.name||'LOOKUP_FAILED').slice(0,25)};}
 return Response.json({at:new Date(now).toISOString(),all,direct:await Promise.all(['석촌','잠실','남한산성입구(성남법원,검찰청)','암사역사공원','광흥창'].map(one))},{headers:{'Cache-Control':'no-store'}});
}
