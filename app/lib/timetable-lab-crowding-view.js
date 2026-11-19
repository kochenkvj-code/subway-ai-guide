// UI helpers: the protected server page supplies the statistical dataset.
import {crowdingSources} from './congestion-data.js';
export const crowdingColors=['#86cfa0','#86b8eb','#f5b64e','#ef8585','#ffffff'];
export function createCrowdingModel(source){
 const crowdingThresholds=source.thresholds,crowdingSourceDate=source.sourceDate;
 function timetableCrowding(station,day,hour,columns,half=0){
 const slot=(hour-source.hours[0])*2+half,dayIndex={'평일':0,'주말':1,'공휴일':2}[day];
 if(dayIndex===undefined||!Number.isInteger(slot)||slot<0||hour>source.hours[1]||![0,1].includes(half))return columns.map(()=>null);
 const special=crowdingSources(station);
 const eligible=c=>c.providerDir==='0'||c.providerDir==='1';
 const ambiguous=c=>station.line==='2'&&station.names.ko==='신도림'&&c.branch;
 const identity=c=>{
  if(special)return special.find(s=>s.next===c.next&&s.dir===c.providerDir)||null;
  return eligible(c)&&!ambiguous(c)&&columns.filter(other=>eligible(other)&&!ambiguous(other)&&other.providerDir===c.providerDir).length===1?{code:station.stationCode,dir:c.providerDir}:null;
 };
 return columns.map(c=>{
  const match=identity(c);
  if(!match)return null;
  const sequence=source.data[station.line+':'+match.code];
  const n=Number(sequence?.[(dayIndex*2+Number(match.dir))*42+slot]);
  return Number.isInteger(n)&&n>=0&&n<4?n:null;
 });
}
function crowdingHalves(station,day,hour,columns){
 return [timetableCrowding(station,day,hour,columns,0),timetableCrowding(station,day,hour,columns,1)];
}
 return {timetableCrowding,crowdingHalves,crowdingThresholds,crowdingSourceDate};
}
export function crowdingGradient(levels,singleSide='left'){
 if(!levels.length||levels.every(v=>v===null))return undefined;
 if(levels.length===1)levels=singleSide==='right'?[null,levels[0]]:[levels[0],null];
 return 'linear-gradient(to right,'+levels.map((v,i)=>{const color=crowdingColors[v??4];return color+' '+(i*100/levels.length)+'% '+((i+1)*100/levels.length)+'%';}).join(',')+')';
}
