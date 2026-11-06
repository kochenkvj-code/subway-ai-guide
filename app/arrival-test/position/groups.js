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

 // Select the latest event for each physical train before measuring distance.
 // An older, closer position must never outrank that train's newer position.
 function receipt(row){
  const raw=String(row.recptnDt||'').trim(),last=String(row.lastRecptnDt||'').trim();
  const full=[raw,last].find(x=>/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d+)?$/.test(x));
  const parse=value=>{const at=Date.parse(value);return Number.isFinite(at)?at:-Infinity;};
  if(full)return parse(full.replace(' ','T')+'+09:00');
  const date=last.match(/^(\d{4}-\d\d-\d\d|\d{8})/);
  if(date&&/^\d\d:\d\d:\d\d(?:\.\d+)?$/.test(raw)){
   const d=date[1].length===8?date[1].slice(0,4)+'-'+date[1].slice(4,6)+'-'+date[1].slice(6):date[1];
   return parse(d+'T'+raw+'+09:00');
  }
  return -Infinity;
 }
 const latest=new Map();
 rows.forEach((row,index)=>{
  if(String(row.subwayId)!=='100'+line)return;
  const no=String(row.trainNo??'').trim().replace(/^0+(?=\d)/,'');
  const id=no||'missing:'+index,at=receipt(row),previous=latest.get(id);
  if(!previous||at>previous.at)latest.set(id,{row,index,at});
 });
 const groups=(String(line)==='2'?['1','0']:['0','1']).map(dir=>{
  const next=(network[target]||[]).filter(n=>String(edges[target]?.[n])===dir);
  const trains=[];
  latest.forEach(({row,index})=>{
   if(String(row.subwayId)!=='100'+line||String(row.updnLine)!==dir)return;
   const stops=distance(key(row.statnNm),dir);
   // At the selected station, a departed train is no longer incoming.
   // Departures at earlier stations still belong in the approaching list.
   if(stops===0&&String(row.trainSttus)==='2')return;
   if(stops!==null)trains.push({row,stops,index});
  });
  // Original API order is the tie breaker. No age filters or historical ETA reuse.
  trains.sort((a,b)=>a.stops-b.stops||a.index-b.index);
  return {dir,next,trains:trains.slice(0,2),candidates:trains};
 });
 return {groups,supported};
}
