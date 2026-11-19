// Timetable-only interpretation. Shared live-arrival/lost-property data is read, never modified.
import graph from '../data/trainLostGraph.json';
import directions from '../data/trainLostDirection.json';
import official from '../data/seoulMetroOfficialStations.json';
import {getStationByCode,stationMaster} from './station-master';
export function timetableStation(code){
 const known=getStationByCode(code);if(known)return known;
 const row=official.find(s=>s.code===code&&/^0?[1-9]호선$/.test(s.line));
 return row?{stationCode:row.code,line:String(Number(row.line.replace('호선',''))),names:{ko:row.ko,en:row.en,ja:row.ja,zh:row.zh},aliases:[]}:null;
}
export const timetableStations=[...stationMaster,...official.filter(s=>!getStationByCode(s.code)&&/^0?[1-9]호선$/.test(s.line)).map(s=>timetableStation(s.code))];
export function serviceClock(date=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
 const hour=Number(parts.hour),calendarDate=parts.year+'-'+parts.month+'-'+parts.day;
 // The operating interval includes extended 24–28h values; the next service begins at 05h.
 const noon=new Date(calendarDate+'T12:00:00+09:00');if(hour<5)noon.setUTCDate(noon.getUTCDate()-1);
 const businessDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(noon);
 return {businessDate,weekday:noon.getUTCDay(),minutes:(hour<5?hour+24:hour)*60+Number(parts.minute),hour:hour<5?hour+24:hour,calendarDate};
}
// Official 2026 calendar + 2026 additions: KASA plcyBrfNo=431; election day 2026-06-03.
const holidays2026=new Set(['01-01','02-16','02-17','02-18','03-01','03-02','05-01','05-05','05-24','05-25','06-03','06-06','07-17','08-15','08-17','09-24','09-25','09-26','10-03','10-05','10-09','12-25']);
export function defaultDay(clock){return clock.weekday===0||(clock.businessDate.startsWith('2026-')&&holidays2026.has(clock.businessDate.slice(5)))?'공휴일':clock.weekday===6?'주말':'평일';}
export function serviceMinute(value){
 const m=String(value||'').match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);if(!m||Number(m[1])>29||Number(m[2])>59)return null;
 const h=Number(m[1]);return (h<5?h+24:h)*60+Number(m[2]);
}
const branches={'성수지선':['성수','용답','신답','용두','신설동'],'신정지선':['신도림','도림천','양천구청','신정네거리','까치산']};
const clean=x=>String(x||'').replace(/역$/,'').replace(/\s/g,'');
function reaches(network,start,destination,blocked){
 const todo=[start],seen=new Set([blocked]);while(todo.length){const node=todo.shift();if(node===destination)return true;if(seen.has(node))continue;seen.add(node);todo.push(...(network[node]||[]).filter(n=>!seen.has(n)));}return false;
}
function nextStop(station,row){
 const line=station.line+'호선',name=clean(station.names.ko),dest=clean(row.arvlStnNm),branch=row.brlnNm,network=graph[line]||{};
 if(station.line==='2'&&branches[branch]){
  const chain=branches[branch],i=chain.indexOf(name),j=chain.indexOf(dest);
  return i>=0&&j>=0&&i!==j?{next:chain[i+(j>i?1:-1)],branch}:null;
 }
 const d=['상행','내선'].includes(row.upbdnbSe)?'0':['하행','외선'].includes(row.upbdnbSe)?'1':null;
 if(d===null)return null;
 // Eungam has two DOWN departures: start-of-loop (no arrival) and post-loop (arrival present).
 // Both records were verified live; never turn an arrival-only UP row into a departure.
 if(station.line==='6'&&name==='응암'&&d==='1'){
  if(!row.trainArvlTm&&clean(row.dptreStnNm)==='응암')return {next:'역촌',branch:''};
  if(row.trainArvlTm)return {next:'새절',branch:''};
  return null;
 }
 const candidates=Object.entries(directions[line]?.[name]||{}).filter(([,value])=>value===d).map(([next])=>next);
 if(candidates.length===1)return {next:candidates[0],branch:''};
 if(candidates.length>1&&dest&&dest!==name){const found=candidates.filter(next=>reaches(network,next,dest,name));if(found.length===1)return {next:found[0],branch:''};}
 return null;
}
export function compileTimetable(source,station,businessDate){
 const reference=businessDate+'T12:00:00';
 const issues=[],rows=[],columns=new Map();const excluded={expired:0,arrivalOnly:0,invalidTime:0,unclassified:0,duplicates:0};const seen=new Set();
 for(const group of source.groups||[]){
  if(!group.ok){issues.push({type:'request',direction:group.direction,error:group.error});continue;}
  for(const raw of group.rows||[]){
   if((raw.vldBgngDt&&raw.vldBgngDt>reference)||(raw.vldEndDt&&raw.vldEndDt<reference)){excluded.expired++;continue;}
   if(!raw.trainDptreTm){excluded.arrivalOnly++;continue;}
   const minute=serviceMinute(raw.trainDptreTm);if(minute===null){excluded.invalidTime++;continue;}
   const next=nextStop(station,raw);
   if(!next){excluded.unclassified++;continue;}
   const id=next.next+'|'+next.branch,kind=String(raw.trainKnd||''),express=/^(Y|1|true)$/i.test(String(raw.etrnYn))||/급행|특급/.test(kind);
   const entry={column:id,minute,time:raw.trainDptreTm,destination:String(raw.arvlStnNm||''),express,kind:/특급/.test(kind)?'limited':'express',number:String(raw.trainno||'')};
   const key=JSON.stringify([entry.column,entry.minute,entry.destination,entry.number]);if(seen.has(key)){excluded.duplicates++;continue;}seen.add(key);
   columns.set(id,{id,next:next.next,branch:next.branch});rows.push(entry);
  }
 }
 rows.sort((a,b)=>a.minute-b.minute||a.number.localeCompare(b.number));
 if(excluded.unclassified)issues.push({type:'unclassified',count:excluded.unclassified});
 if(excluded.invalidTime)issues.push({type:'invalidTime',count:excluded.invalidTime});
 return {columns:[...columns.values()].sort((a,b)=>Boolean(a.branch)-Boolean(b.branch)||a.next.localeCompare(b.next,'ko')),rows,excluded,issues,hasExpress:rows.some(r=>r.express),hours:rows.length?Array.from({length:Math.max(25,Math.floor(rows.at(-1).minute/60))-4},(_,i)=>i+5):Array.from({length:21},(_,i)=>i+5)};
}
