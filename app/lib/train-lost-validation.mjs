// Experimental cross-check only. Never treat an absent timetable row as
// proof that a train did not stop. The test UI labels the exclusion as provisional.
export const normalizeTrainNo=value=>String(value??'').trim().replace(/^0+(?=\d)/,'');
export const normalizeStop=value=>String(value??'').trim().replace(/역$/,'');
export function timetableStatus(position,timetable){
 const rows=Array.isArray(timetable?.rows)?timetable.rows:[];
 const no=normalizeTrainNo(position?.trainNo);
 const matched=no?rows.filter(row=>normalizeTrainNo(row.number)===no):[];
 if(matched.length)return {kind:'matched',matched};
 // Successful but empty/partial payloads cannot provide negative evidence.
 const usable=Boolean(timetable?.ok&&!timetable?.truncated&&
   rows.length>0&&rows.every(row=>normalizeTrainNo(row.number)));
 if(!usable)return {kind:'unknown',matched:[]};
 return {kind:'not-listed',matched:[]};
}
export function compareTimetable(positions,timetable,{excludeUnlisted=false}={}){
 const checks=(Array.isArray(positions)?positions:[]).map(position=>({
   position,...timetableStatus(position,timetable)
 }));
 return {
   checks,
   eligible:checks.filter(row=>!excludeUnlisted||row.kind!=='not-listed').map(row=>row.position),
   excluded:excludeUnlisted?checks.filter(row=>row.kind==='not-listed'):[],
   counts:{
     matched:checks.filter(row=>row.kind==='matched').length,
     notListed:checks.filter(row=>row.kind==='not-listed').length,
     unknown:checks.filter(row=>row.kind==='unknown').length
   }
 };
}
export function minuteGap(time,target){
 const a=String(time||''),b=String(target||'');
 if(!/^\d{1,2}:\d{2}$/.test(a)||!/^\d{1,2}:\d{2}$/.test(b))return null;
 const f=s=>{const [h,m]=s.split(':').map(Number);return h*60+m;};
 const d=f(a)-f(b);
 return Math.min(...[d,d-1440,d+1440].map(Math.abs));
}
export function closestSchedule(matches,alightTime){
 if(!Array.isArray(matches)||!matches.length)return null;
 return [...matches].sort((a,b)=>{
   const diff=x=>minuteGap(x.arrival||x.departure||x.time,alightTime)??100000;
   return diff(a)-diff(b);
 })[0];
}
