import stations from '../data/seoulMetroOfficialStations.json';

// Only exact official Korean station names can be sent to the subway route API.
const normalize=value=>String(value||'').normalize('NFKC').trim()
 .replace(/[\s·・()（）]/g,'').replace(/역$/,'').toLocaleLowerCase('ko');
const byName=new Map();
for(const st of stations){
 if(st.code==='9005'&&st.line==='GTX-A')continue;
 const key=normalize(st.ko);
 const list=byName.get(key)||[];
 list.push(st);byName.set(key,list);
}
function preferredStation(matches){
 return matches.find(s=>/^0[1-9]호선$/.test(s.line))||matches[0]||null;
}
export function resolveOfficialStop(name){
 const matches=byName.get(normalize(name))||[];
 const st=preferredStation(matches);
 return st?{code:st.code,ko:st.ko,en:st.en,ja:st.ja,zh:st.zh,lines:[...new Set(matches.map(x=>x.line))]}:null;
}
const stationMention=name=>name.endsWith('역')?name:name+'역';

// Fallback only for a standalone last line naming a verified station.
// This handles answers such as "3호선 경복궁역 5번 출구..." then "경복궁역".
// Do not turn every station mentioned in prose into a competing candidate.
function trailingStationHint(answer){
 const lines=answer.split(/\r?\n/);
 const last=lines.findLastIndex(line=>line.trim());
 if(last<=0)return null;
 const candidate=lines[last].trim().replace(/^\*{1,2}|\*{1,2}$/g,'').trim();
 if(!/^[가-힣·・\s()（）]{2,28}$/.test(candidate))return null;
 const station=resolveOfficialStop(candidate);
 if(!station)return null;
 const main=lines.slice(0,last).join('\n').replace(/\*{1,2}/g,'');
 // Must actually give subway-access advice for this exact stop.
 if(!main.includes(stationMention(station.ko))||!/(?:지하철|호선|하차|출구|역에서|station|subway|metro|駅|地铁|地鐵)/i.test(main))return null;
 return {station,answer:lines.slice(0,last).join('\n').trim()};
}
export function parsePlaceAnswer(raw,complete=true){
 const lines=String(raw||'').split(/\r?\n/);
 const visible=[],metadata=[];
 let fence=null;
 for(let i=0;i<lines.length;i++){
  const line=lines[i],trim=line.trim();
  const boundary=trim.match(/^(\x60{3,}|~{3,})/);
  if(boundary){
   if(!fence)fence=boundary[1][0];
   else if(fence===boundary[1][0])fence=null;
   visible.push(line);continue;
  }
  if(!fence&&!trim.startsWith('>')&&/^<\/?(?:route_station|menu_recommendation|walk_hint)\b/i.test(trim)){
   const route=trim.match(/^<route_station>([^<>]{1,65})<\/route_station>$/);
   const menu=trim.match(/^<menu_recommendation>(route|none)<\/menu_recommendation>$/);
   const walk=trim.match(/^<walk_hint>([^<>]{1,180})<\/walk_hint>$/);
   metadata.push({index:i,kind:route?'route':menu?'menu':walk?'walk':'invalid',value:route?.[1]?.trim()||menu?.[1]||walk?.[1]?.trim()||null});
   continue;
  }
  visible.push(line);
 }
 let answer=visible.join('\n').trim().slice(0,2000);
 const last=lines.findLastIndex(line=>line.trim());
 const routeEntries=metadata.filter(x=>x.kind==='route');
 const menuEntries=metadata.filter(x=>x.kind==='menu');
 const walkEntries=metadata.filter(x=>x.kind==='walk');
 const validMenu=menuEntries.length===0||
  (menuEntries.length===1&&menuEntries[0].index===last&&menuEntries[0].value==='route');
 const tail=menuEntries.length?last-1:last;
 const validRoute=complete&&answer&&metadata.length===routeEntries.length+menuEntries.length+walkEntries.length&&
  walkEntries.length<=1&&routeEntries.length===1&&validMenu&&routeEntries[0].index===tail&&
  (!walkEntries.length||walkEntries[0].index===tail-1);
 let station=validRoute?resolveOfficialStop(routeEntries[0].value):null;
 // Never override malformed metadata or explicit menu_recommendation=none.
 // Incomplete responses cannot initiate an official route search.
 if(!station&&complete&&metadata.length===0){
  const fallback=trailingStationHint(answer);
  if(fallback){station=fallback.station;answer=fallback.answer;}
 }
 return {status:station?'found':'unverified',answer,place:'',station,
  stations:station?[station]:[],reason:'',
  walk:station&&validRoute&&walkEntries.length===1?walkEntries[0].value:'',recommendedMenu:station?'route':null};
}
