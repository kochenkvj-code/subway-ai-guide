// Distance is a count of track edges, never an ETA. Provider rows stay intact.
export function positionGroups(rows,line,station,graph,directions){
 const network=graph[line+'호선']||{},edges=directions[line+'호선']||{};
 const key=value=>{
  let name=String(value||'').trim().replace(/역$/,'');
  if(String(line)==='4')name=({'불암산':'당고개','총신대입구':'이수','총신대입구(이수)':'이수'})[name]||name;
  return network[name]?name:Object.keys(network).find(n=>n===name.replace(/\([^)]*\)/g,'').trim())||name;
 };
 const target=key(station),supported=Boolean(network[target]);
 function distance(origin,dir){
  if(!supported||!network[origin])return null;
  const queue=[[origin,0]],seen=new Set([origin]);
  for(let i=0;i<queue.length;i++){
   const [at,count]=queue[i];if(at===target)return count;
   for(const next of network[at]||[])if(String(edges[at]?.[next])===dir&&!seen.has(next)){seen.add(next);queue.push([next,count+1]);}
  }
  return null;
 }
 const groups=(String(line)==='2'?['1','0']:['0','1']).map(dir=>{
  const next=(network[target]||[]).filter(n=>String(edges[target]?.[n])===dir);
  const trains=[];
  rows.forEach((row,index)=>{
   if(String(row.subwayId)!=='100'+line||String(row.updnLine)!==dir)return;
   const stops=distance(key(row.statnNm),dir);
   if(stops!==null)trains.push({row,stops,index});
  });
  // Original API order is the tie breaker. No time/status filters or history.
  trains.sort((a,b)=>a.stops-b.stops||a.index-b.index);
  return {dir,next,trains:trains.slice(0,2),candidates:trains};
 });
 return {groups,supported};
}
