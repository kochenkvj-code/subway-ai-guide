/**
 * Label the official route's ordered stops with the actual ridden lines.
 * Transfer stations receive the two line labels from the official itinerary.
 * Never infer lines from a station name, as some stations serve many lines.
 */
export function buildRouteStationTimeline(route) {
 const names=Array.isArray(route?.allStations)?route.allStations:[];
 const itinerary=Array.isArray(route?.itinerary)?route.itinerary:[];
 const linesByName=new Map();
 const transferNames=new Set();
 const add=(name,line)=>{
  if(typeof name!=='string'||!name.trim()||typeof line!=='string'||!line.trim())return;
  const lines=linesByName.get(name)||[];
  if(!lines.includes(line))lines.push(line);
  linesByName.set(name,lines);
 };
 for(const step of itinerary){
  if(step?.type==='ride'){
   const visited=Array.isArray(step.stations)&&step.stations.length?step.stations:[step.from,step.to];
   for(const station of visited)add(station,step.line);
  }else if(step?.type==='transfer'){
   if(typeof step.station==='string'&&step.station.trim())transferNames.add(step.station);
   add(step.station,step.fromLine);
   add(step.station,step.toLine);
  }
 }
 return names.map((name,index)=>({
  name,
  lines:[...(linesByName.get(name)||[])],
  transfer:transferNames.has(name),
  start:index===0,
  end:index===names.length-1,
 }));
}
