// Public-fact station adjacency compiled from the Korea Seoul Subway Static Data repository (JoeYunHa, public-data-derived sections, 2025-10). Revalidate periodically against official Seoul Metro station topology.
import graph from '../data/trainLostGraph.json';
const safe = value => String(value||'').trim().replace(/역$/,'');
export const stationNeighbors = (line,station) => graph[Number(line)+'호선']?.[safe(station)]||[];
export const supportsStation = (line,station) => stationNeighbors(line,station).length>0;
export function followStops(line,origin,first,limit=25){
  let prev=safe(origin),current=safe(first);
  if(!stationNeighbors(line,prev).includes(current))return {stops:[],ambiguous:true};
  const visited=new Set([prev]),stops=[],n=Math.min(40,Math.max(1,limit));
  for(let i=0;i<n;i++){
    if(visited.has(current))return {stops,ambiguous:true};
    stops.push(current);visited.add(current);
    const choices=stationNeighbors(line,current).filter(s=>s!==prev&&!visited.has(s));
    if(choices.length===0)return {stops,ambiguous:false};
    if(choices.length!==1)return {stops,ambiguous:true};
    prev=current;current=choices[0];
  }
  return {stops,ambiguous:false};
}
export function futureStops(line,origin,first,where){
  const route=followStops(line,origin,first,38);
  const name=safe(where);
  const i=name===safe(origin)?-1:route.stops.indexOf(name);
  if(i < -1 || (name!==safe(origin)&&i===-1))return {stations:[],reason:'POSITION_OFF_ROUTE'};
  if(route.ambiguous&&route.stops.length<i+5)return {stations:[],reason:'BRANCH_UNVERIFIED'};
  const candidates=route.stops.slice(i+1,i+5);
  return candidates.length>=4?{stations:candidates.slice(2,4),reason:null}:{stations:[],reason:'NOT_ENOUGH_STOPS'};
}
export function matchCandidates(rows,positions,{time,date,line,station,next,direction}){
  const inputMinute=Number(time.slice(0,2))*60+Number(time.slice(3,5));
  const path=followStops(line,station,next);
  const allowed=new Set([safe(station),...path.stops]);
  const normalizeNo=x=>String(x||'').trim().replace(/^0+(?=\d)/,'');
  const departed=Date.parse(date+'T'+time+':00+09:00');
  const elapsed=Date.now()-departed;
  // A train number from yesterday must never be mistaken for today's running train.
  const liveEligible=Number.isFinite(departed)&&elapsed>=-180000&&elapsed<=7200000;
  return rows.filter(r=>r.number&&/^\d\d:\d\d$/.test(r.arrival||r.time))
    .map(r=>{
      const schedule=r.arrival||r.time;
      const mins=Number(schedule.slice(0,2))*60+Number(schedule.slice(3,5));
      const delta=Math.abs(mins-inputMinute);
      // A small correction for service-day entries after midnight.
      const diff=Math.min(delta,Math.abs((mins-1440)-inputMinute),Math.abs((mins+1440)-inputMinute));
      const live=liveEligible?positions.find(p=>normalizeNo(p.trainNo)===normalizeNo(r.number)&&Number(p.line)===Number(line)):null;
      const directionConflict=Boolean(direction&&r.direction!==direction);
      const locationValid=Boolean(live&&allowed.has(safe(live.station)));
      const age=live?Date.now()-Date.parse(live.receivedAt):Infinity;
      const fresh=age>=-60000&&age<=120000;
      const expected=r.direction==='상행'||r.direction==='내선'?'0':r.direction==='하행'||r.direction==='외선'?'1':null;
      const liveDirectionOk=Boolean(live&&expected!==null&&String(live.direction)===expected);
      const realMatch=Boolean(live&&fresh&&locationValid&&liveDirectionOk&&!directionConflict);
      const confidence=realMatch?(diff<=3?'live-and-schedule':'live-number'):'schedule-only';
      return {...r,diff,live:realMatch?live:null,locationValid:realMatch,confidence,score:diff+(realMatch?-15:0)+(directionConflict?30:0),directionConflict};
    })
    .filter(r=>r.diff<=12&&!r.directionConflict)
    .sort((a,b)=>a.score-b.score||a.diff-b.diff).slice(0,8);
}
