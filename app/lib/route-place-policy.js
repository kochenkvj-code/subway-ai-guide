import stations from '../data/seoulMetroOfficialStations.json';

// AI suggests only a Korean station NAME. The server maps it to an official
// station code, never trusting a model-generated code or foreign station name.
const normalize=value=>String(value||'').normalize('NFKC').trim()
 .replace(/[\s·・()（）]/g,'').replace(/역$/,'').toLocaleLowerCase('ko');
const byName=new Map();
for(const st of stations){
 if(st.code==='9005'&&st.line==='GTX-A')continue;
 const name=normalize(st.ko);
 const list=byName.get(name)||[];
 list.push(st);byName.set(name,list);
}
function preferredStation(matches){
 return matches.find(s=>/^0[1-9]호선$/.test(s.line))||matches[0]||null;
}
export function resolveOfficialStop(name){
 const matches=byName.get(normalize(name))||[];
 const st=preferredStation(matches);
 return st?{code:st.code,ko:st.ko,en:st.en,ja:st.ja,zh:st.zh,lines:[...new Set(matches.map(x=>x.line))]}:null;
}
// The route model now produces a NORMAL V2 chat answer and optional final
// metadata lines; unlike the old XML schema, missing metadata is not a failed
// natural-language answer. Metadata must be complete and at the tail.
export function parsePlaceAnswer(raw,complete=true){
 const lines=String(raw||'').split(/\r?\n/);
 const visible=[],metadata=[];
 let fence=null;
 for(let i=0;i<lines.length;i++){
  const line=lines[i],trim=line.trim();
  const boundary=trim.match(/^(`{3,}|~{3,})/);
  if(boundary){
   if(!fence)fence=boundary[1][0];
   else if(fence===boundary[1][0])fence=null;
   visible.push(line);continue;
  }
  // A quoted or fenced example of route_station is part of the answer.
  if(!fence&&!trim.startsWith('>')&&/^<\/?(?:route_station|menu_recommendation)\b/i.test(trim)){
   const route=trim.match(/^<route_station>([^<>]{1,65})<\/route_station>$/);
   const menu=trim.match(/^<menu_recommendation>(route|none)<\/menu_recommendation>$/);
   metadata.push({index:i,kind:route?'route':menu?'menu':'invalid',value:route?.[1]?.trim()||menu?.[1]||null});
   continue;
  }
  visible.push(line);
 }
 const answer=visible.join('\n').trim().slice(0,2000);
 const last=lines.findLastIndex(line=>line.trim());
 const routeEntries=metadata.filter(e=>e.kind==='route');
 const menuEntries=metadata.filter(e=>e.kind==='menu');
 const validMenu=menuEntries.length===0||(menuEntries.length===1&&menuEntries[0].index===last&&menuEntries[0].value==='route');
 const validRoute=complete&&answer&&metadata.length===routeEntries.length+menuEntries.length&&
  routeEntries.length===1&&validMenu&&
  routeEntries[0].index===(menuEntries.length?last-1:last);
 const station=validRoute?resolveOfficialStop(routeEntries[0].value):null;
 return {status:station?'found':'unverified',answer,place:'',station,reason:'',walk:'',
  recommendedMenu:station?'route':null};
}
