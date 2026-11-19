// Static Seoul Metro 2026-09-30 statistical categories, not live crowding.
import source from '../data/timetable-crowding.json';
export const crowdingThresholds=source.thresholds;
export const crowdingSourceDate=source.sourceDate;
export const crowdingColors=['#86cfa0','#86b8eb','#f5b64e','#ef8585','#ffffff'];
export function timetableCrowding(station,day,hour,columns,half=0){
 const sequence=source.data[station.line+':'+station.stationCode];
 const slot=(hour-source.hours[0])*2+half,dayIndex={'평일':0,'주말':1,'공휴일':2}[day];
 if(!sequence||dayIndex===undefined||!Number.isInteger(slot)||slot<0||hour>source.hours[1]||![0,1].includes(half))return columns.map(()=>null);
 const eligible=c=>c.providerDir==='0'||c.providerDir==='1';
 const ambiguous=c=>station.line==='6'&&station.names.ko==='응암'||station.line==='2'&&['성수','신도림'].includes(station.names.ko)&&c.branch;
 return columns.map(c=>{
  if(!eligible(c)||ambiguous(c)||columns.filter(other=>eligible(other)&&!ambiguous(other)&&other.providerDir===c.providerDir).length!==1)return null;
  const n=Number(sequence[(dayIndex*2+Number(c.providerDir))*42+slot]);
  return Number.isInteger(n)&&n>=0&&n<4?n:null;
 });
}
export function crowdingHalves(station,day,hour,columns){
 return [timetableCrowding(station,day,hour,columns,0),timetableCrowding(station,day,hour,columns,1)];
}
export function crowdingGradient(levels){
 if(!levels.length||levels.every(v=>v===null))return undefined;
 return 'linear-gradient(to right,'+levels.map((v,i)=>{const color=crowdingColors[v??4];return color+' '+(i*100/levels.length)+'% '+((i+1)*100/levels.length)+'%';}).join(',')+')';
}
