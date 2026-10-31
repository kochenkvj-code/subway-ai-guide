// Station topology comes from the static subway section graph.
// This module deliberately does not use scheduled train times.
import graph from '../data/trainLostGraph.json';
import directions from '../data/trainLostDirection.json';

const clean=value=>String(value||'').trim().replace(/역$/,'');
export const stationNeighbors=(line,station)=>graph[Number(line)+'호선']?.[clean(station)]||[];
export const supportsStation=(line,station)=>stationNeighbors(line,station).length>0;
// Determine the actual 0(up/inner) or 1(down/outer) live API direction for
// the passenger-selected immediate adjacent station. Missing means unsupported,
// not "include both directions".
export function expectedLiveDirection(line,station,next){
  const from=clean(station),to=clean(next);
  if(!stationNeighbors(line,from).includes(to))return null;
  const value=directions[Number(line)+'호선']?.[from]?.[to];
  return value==='0'||value==='1'?value:null;
}
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
const twoDecimals=n=>Number(n.toFixed(2));
const minuteDate=(date,time)=>{
  const timestamp=Date.parse(date+'T'+time+':00+09:00');
  return Number.isFinite(timestamp)?timestamp:NaN;
};

// All subsequent edges must agree with the operator's confirmed live API
// direction code, not just the first edge. This also models multiple branches
// instead of discarding every candidate once followStops() reaches a fork.
// A branch is a possibility, NOT proof the passenger's train took that route.
export function reachableTrainStations(line,origin,next,limit=38){
  const start=clean(origin),first=clean(next);
  const requiredDirection=expectedLiveDirection(line,start,first);
  const distances=new Map();
  if(requiredDirection===null)return {distances,ambiguous:true};
  distances.set(start,{distance:0,branched:false});
  const graphKey=Number(line)+'호선';
  const queue=[{station:first,distance:1,branched:false}];
  const visited=new Set([start]);
  let ambiguous=false;
  while(queue.length){
    const item=queue.shift();
    if(visited.has(item.station)||item.distance>limit)continue;
    visited.add(item.station);
    distances.set(item.station,{distance:item.distance,branched:item.branched});
    if(item.distance===limit)continue;
    const onward=stationNeighbors(line,item.station).filter(to=>
      !visited.has(to)&&directions[graphKey]?.[item.station]?.[to]===requiredDirection
    );
    const fork=onward.length>1;
    if(fork)ambiguous=true;
    for(const to of onward){
      queue.push({station:to,distance:item.distance+1,branched:item.branched||fork});
    }
  }
  return {distances,ambiguous};
}

// Ranked hints, never a certified journey history. No score is a probability.
// The provider reports a station, direction and receipt time, but cannot
// establish that a passenger's train passed the alighting station earlier.
export function findLiveCandidates(positions,{date,time,line,station,next,now=Date.now(),arrivalEvidence=[]}){
  const alightedAt=minuteDate(date,time);
  const elapsed=now-alightedAt;
  if(!Number.isFinite(elapsed)||elapsed< -120000||elapsed>30*60000)
    return {candidates:[],reason:'OUTSIDE_LIVE_WINDOW'};
  if(!stationNeighbors(line,station).includes(clean(next)))
    return {candidates:[],reason:'INVALID_DIRECTION'};
  const requiredDirection=expectedLiveDirection(line,station,next);
  if(requiredDirection===null)return {candidates:[],reason:'DIRECTION_UNVERIFIED'};

  const reach=reachableTrainStations(line,station,next,38);
  const observed=new Map();
  for(const p of Array.isArray(positions)?positions:[]){
    const number=trainKey(p.trainNo);
    if(!number||Number(p.line)!==Number(line)||String(p.direction)!==requiredDirection)continue;
    const received=Date.parse(p.receivedAt),age=now-received;
    if(!Number.isFinite(received)||age< -60000||age>120000)continue;
    const found=reach.distances.get(clean(p.station));
    if(!found)continue;
    // A train position reported well before the passenger left is not
    // evidence of its location AFTER alighting.
    if(received<alightedAt-45000)continue;
    const key=number+'/'+requiredDirection;
    const prior=observed.get(key);
    if(!prior||received>Date.parse(prior.p.receivedAt))
      observed.set(key,{p,received,age,found,number});
  }
  const evidence=Array.isArray(arrivalEvidence)?arrivalEvidence:[];
  const candidates=[];
  for(const {p,received,age,found,number} of observed.values()){
    const distance=found.distance;
    const elapsedAtReceipt=Math.max(0,(received-alightedAt)/60000);
    // Operational heuristic, not the exact timetable: local trains around
    // 2 min/station including dwell. Express is modeled separately with a
    // wider uncertainty band because stopping patterns are not provided.
    const minutesPerStop=p.express?1.5:2;
    const estimatedStops=elapsedAtReceipt/minutesPerStop;
    const status=String(p.status||'');
    const phase=status==='2'?0.3:status==='3'?-0.2:0;
    const effectiveStops=Math.max(0,distance+phase);
    const stopDelta=effectiveStops-estimatedStops;
    const absDelta=Math.abs(stopDelta);
    const tolerance=Math.max(p.express?3:2.25,
      1.15+estimatedStops*(p.express?.55:.38));
    // Avoid treating wildly distant trains as candidates just because they
    // share a direction. The band grows modestly with elapsed time.
    if(absDelta>tolerance)continue;
    if(distance===0&&elapsedAtReceipt>5)continue;

    const arrivals=evidence.filter(row=>{
      const evidenceAt=Date.parse(String(row.receivedAt||'').replace(' ','T')+
        (/Z|[+-]\d\d:\d\d$/.test(String(row.receivedAt||''))?'':'+09:00'));
      const target=reach.distances.get(clean(row.station));
      return trainKey(row.trainNo)===number&&Number(row.line)===Number(line)&&
        String(row.directionCode)===requiredDirection&&target&&
        target.distance>=distance&&target.distance<=distance+5&&
        Number.isFinite(evidenceAt)&&now-evidenceAt>=-60000&&now-evidenceAt<=120000;
    });
    const corroborated=arrivals.length>0;
    const timeErrorMinutes=twoDecimals(elapsedAtReceipt-effectiveStops*minutesPerStop);
    const residual=absDelta/tolerance;
    const stalePenalty=Math.max(0,age)/120000*.35;
    const branchPenalty=found.branched?.6:0;
    const expressPenalty=p.express?.45:0;
    const corroborationBonus=corroborated?.35:0;
    const score=twoDecimals(residual*3+stalePenalty+branchPenalty+
      expressPenalty-corroborationBonus);
    const matchGrade=residual<=.35?'close':residual<=.72?'possible':'check';
    candidates.push({
      number:p.trainNo,station:clean(p.station),live:p,
      stopsFromAlight:distance,
      estimatedStops:Number((elapsed/60000/minutesPerStop).toFixed(1)),
      expectedAtReceipt:Number(estimatedStops.toFixed(1)),
      difference:Number(absDelta.toFixed(1)),
      timeErrorMinutes,minutesPerStop,matchGrade,
      branched:found.branched,corroborated,express:Boolean(p.express),
      score,confidence:found.branched?'branch-uncertain':
        corroborated?'arrival-supported':'time-estimate',
      receivedAt:p.receivedAt,expectedDirection:requiredDirection,
      reasons:[matchGrade,corroborated?'arrival-observed':'position-only',
        ...(found.branched?['route-branch']:[]),...(p.express?['express-estimate']:[])]
    });
  }
  candidates.sort((a,b)=>a.score-b.score||
    Math.abs(a.timeErrorMinutes)-Math.abs(b.timeErrorMinutes)||
    String(a.number).localeCompare(String(b.number)));
  const unique=candidates.slice(0,8);
  return {candidates:unique,reason:unique.length?'LIVE_CANDIDATES':'NO_LIVE_CANDIDATES',
    expectedStops:Number((elapsed/120000).toFixed(1)),
    range:[0,38],routeAmbiguous:reach.ambiguous,
    rankingBasis:'2min-local/1.5min-express-heuristic',
    snapshotAt:new Date(now).toISOString()};
}
