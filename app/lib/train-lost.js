// Station topology comes from the static subway section graph.
// This module deliberately does not use scheduled train times.
import graph from '../data/trainLostGraph.json';

const clean=value=>String(value||'').trim().replace(/역$/,'');
export const stationNeighbors=(line,station)=>graph[Number(line)+'호선']?.[clean(station)]||[];
export const supportsStation=(line,station)=>stationNeighbors(line,station).length>0;
export function followStops(line,origin,first,limit=35){
  let previous=clean(origin),current=clean(first);
  if(!stationNeighbors(line,previous).includes(current))return {stops:[],ambiguous:true};
  const visited=new Set([previous]),stops=[];
  for(let i=0;i<Math.min(limit,40);i++){
    if(visited.has(current))return {stops,ambiguous:true};
    stops.push(current);visited.add(current);
    const choices=stationNeighbors(line,current).filter(s=>s!==previous&&!visited.has(s));
    if(!choices.length)return {stops,ambiguous:false};
    if(choices.length!==1)return {stops,ambiguous:true};
    previous=current;current=choices[0];
  }
  return {stops,ambiguous:false};
}
export function futureStops(line,origin,first,where){
  const route=followStops(line,origin,first,38);
  const i=clean(where)===clean(origin)?-1:route.stops.indexOf(clean(where));
  if(i===-1&&clean(where)!==clean(origin))return {stations:[],reason:'POSITION_OFF_ROUTE'};
  const ahead=route.stops.slice(i+1,i+5);
  if(route.ambiguous&&ahead.length<4)return {stations:[],reason:'BRANCH_UNVERIFIED'};
  return ahead.length===4?{stations:ahead.slice(2,4),reason:null}:{stations:[],reason:'NOT_ENOUGH_STOPS'};
}
const trainKey=x=>String(x||'').trim().replace(/^0+(?=\d)/,'');
function minuteDate(date,time){const timestamp=Date.parse(date+'T'+time+':00+09:00');return Number.isFinite(timestamp)?timestamp:NaN;}
export function findLiveCandidates(positions,{date,time,line,station,next,now=Date.now(),arrivalEvidence=[]}){
  const alightedAt=minuteDate(date,time);
  const elapsed=now-alightedAt;
  // A snapshot cannot establish a historical train. Only recent alightings can be estimated.
  if(!Number.isFinite(elapsed)||elapsed < -120000||elapsed>30*60000)return {candidates:[],reason:'OUTSIDE_LIVE_WINDOW'};
  if(!stationNeighbors(line,station).includes(next))return {candidates:[],reason:'INVALID_DIRECTION'};
  const path=followStops(line,station,next,38);
  const expected=elapsed/120000; // Initial HEURISTIC: 2 minutes per stop, not a timetable.
  const radius=Math.max(1.5,expected*.5);
  const min=Math.max(0,Math.floor(expected-radius)),max=Math.min(30,Math.ceil(expected+radius));
  const evidence=Array.isArray(arrivalEvidence)?arrivalEvidence:[];
  const candidates=(Array.isArray(positions)?positions:[]).flatMap(p=>{
    const number=trainKey(p.trainNo);
    if(!number||Number(p.line)!==Number(line))return [];
    const distance=p.station===clean(station)?0:path.stops.indexOf(clean(p.station))+1;
    if(distance<0||distance>max)return [];
    const recv=Date.parse(p.receivedAt);
    const age=now-recv;
    if(!Number.isFinite(recv)||age< -60000||age>120000)return [];
    const minutesAtReceipt=Math.max(0,(recv-alightedAt)/60000);
    const calculated=minutesAtReceipt/2;
    const delta=Math.abs(distance-calculated);
    const within=distance>=min&&distance<=max;
    // Public position API gives a current station and directional code,
    // but the current position alone does NOT prove its past station.
    const directionEvidence=evidence.some(row=>
      trainKey(row.trainNo)===number &&
      row.line===String(line) &&
      row.station!==clean(station) &&
      Number(row.routeIndex)>distance &&
      row.directionCode===String(p.direction) &&
      row.arrivalCode!=='2'
    );
    const score=delta+(p.express?1.8:0)+(within?0:3)-(directionEvidence?0.6:0);
    return [{
      number:p.trainNo,station:p.station,live:p,stopsFromAlight:distance,
      estimatedStops:Number(expected.toFixed(1)),difference:Number(delta.toFixed(1)),
      corroborated:directionEvidence,express:Boolean(p.express),score,
      confidence:directionEvidence?'direction-supported':'position-only',
      receivedAt:p.receivedAt
    }];
  }).sort((a,b)=>a.score-b.score||a.difference-b.difference).slice(0,8);
  return {candidates,reason:candidates.length?'LIVE_CANDIDATES':'NO_LIVE_CANDIDATES',
    expectedStops:Number(expected.toFixed(1)),range:[min,max],
    routeAmbiguous:path.ambiguous};
}
