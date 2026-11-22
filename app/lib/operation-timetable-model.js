// New operation-dataset adapter only. Production arrival/lost-property graphs are read-only.
import graph from '../data/trainLostGraph.json';
import directionMap from '../data/trainLostDirection.json';
import {serviceMinute,timetableColumnOrder} from './timetable-lab-model';
export const operationDays={'평일':'DAY','주말':'SAT','공휴일':'END'};
export function normalizeOperationStationCode(value){const s=String(value??'').trim();return /^\d{1,4}$/.test(s)?s.padStart(4,'0'):null;}
const clean=x=>String(x??'').trim().replace(/역$/,'').replace(/\s/g,'');
const display=x=>x==='당고개'?'불암산':x;
const branchLines=[{name:'성수지선',stations:['성수','용답','신답','용두','신설동'],forward:'1'},{name:'신정지선',stations:['신도림','도림천','양천구청','신정네거리','까치산'],forward:'0'}];
function stationName(station){const name=clean(station.names.ko);return graph[station.line+'호선']?.[name]?name:name==='불암산'?'당고개':name;}
function column(next,providerDir,branch=''){return {id:next+'|'+branch,next:display(next),providerDir,branch};}
export function operationTimetableColumns(station){
 const name=stationName(station),columns=Object.entries(directionMap[station.line+'호선']?.[name]||{}).map(([next,dir])=>column(next,dir));
 if(station.line==='2')for(const branch of branchLines){
  const i=branch.stations.indexOf(name);if(i<0)continue;
  for(const delta of [-1,1])if(branch.stations[i+delta])columns.push(column(branch.stations[i+delta],delta===1?branch.forward:branch.forward==='0'?'1':'0',branch.name));
 }
 return timetableColumnOrder(station,columns);
}
function reaches(network,start,destination,blocked){
 const todo=[start],seen=new Set([blocked]);while(todo.length){const node=todo.shift();if(node===destination)return true;if(seen.has(node))continue;seen.add(node);todo.push(...(network[node]||[]).filter(n=>!seen.has(n)));}return false;
}
function chooseColumn(station,row,columns){
 const dir={UP:'0',DOWN:'1',IN:'0',OUT:'1'}[row['방향']];if(dir===undefined)return null;
 const name=stationName(station),dest=clean(row['도착역']);
 if(station.line==='2'&&['UP','DOWN'].includes(row['방향'])){
  const branch=branchLines.find(b=>b.stations.includes(name));
  if(!branch)return null;
  return columns.find(c=>c.branch===branch.name&&c.providerDir===dir)||null;
 }
 if(station.line==='6'&&name==='응암'&&dir==='1'){
  const arrival=String(row['열차도착시간']||'').trim();
  const next=arrival?'새절':clean(row['출발역'])==='응암'?'역촌':null;
  return columns.find(c=>c.next===next)||null;
 }
 const candidates=columns.filter(c=>!c.branch&&c.providerDir===dir);
 if(candidates.length===1)return candidates[0];
 if(candidates.length>1&&dest&&dest!==name){
  const network=graph[station.line+'호선']||{},target=graph[station.line+'호선']?.[dest]?dest:dest==='불암산'?'당고개':dest;
  const found=candidates.filter(c=>reaches(network,c.next,target,name));if(found.length===1)return found[0];
 }
 return null;
}
export function compileOperationTimetable(rawRows,station){
 const columns=operationTimetableColumns(station),rows=[],seen=new Set(),issues=[];
 const excluded={arrivalOnly:0,invalidTime:0,unclassified:0,duplicates:0};
 for(const raw of rawRows){
  const fields=Object.keys(raw).filter(k=>k!=='고유번호').sort(),sig=JSON.stringify(fields.map(k=>[k,String(raw[k]??'').trim()]));
  if(seen.has(sig)){excluded.duplicates++;continue;}seen.add(sig);
  const departure=String(raw['열차출발시간']??'').trim();if(!departure){excluded.arrivalOnly++;continue;}
  const minute=serviceMinute(departure);if(minute===null){excluded.invalidTime++;continue;}
  let selected=chooseColumn(station,raw,columns);
  if(!selected){
   excluded.unclassified++;selected=columns.find(c=>c.unknown);
   if(!selected){selected={id:'unknown',next:'',branch:'',providerDir:null,unknown:true};columns.push(selected);}
  }
  rows.push({column:selected.id,minute,time:departure,arrival:String(raw['열차도착시간']??''),destination:display(String(raw['도착역']??'').trim()),origin:String(raw['출발역']??''),number:String(raw['열차코드']??''),express:String(raw['급행여부'])==='1',kind:'express',recordId:String(raw['고유번호']??'')});
 }
 rows.sort((a,b)=>a.minute-b.minute||a.number.localeCompare(b.number));
 if(excluded.unclassified)issues.push({type:'unclassified',count:excluded.unclassified});
 if(excluded.invalidTime)issues.push({type:'invalidTime',count:excluded.invalidTime});
 const last=rows.length?Math.floor(rows.at(-1).minute/60):25;
 return {columns:timetableColumnOrder(station,columns),rows,excluded,issues,hasExpress:rows.some(r=>r.express),hours:Array.from({length:Math.max(25,last)-4},(_,i)=>i+5)};
}
