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
// Gemini output is an answer plus optional strictly delimited metadata.
// Truncated/ambiguous answers and unsupported names may NOT open a route.
export function parsePlaceAnswer(raw,complete=true){
 const text=String(raw||'');
 const field=name=>{
  const m=text.match(new RegExp('<'+name+'>([\\s\\S]*?)<\\/'+name+'>','i'));
  return m?m[1].trim():'';
 };
 const answer=field('answer').slice(0,1300);
 const place=field('place').slice(0,150);
 const stationName=field('station').replace(/<[^>]*>/g,'').trim().slice(0,60);
 const reason=field('reason').slice(0,400);
 const walk=field('walk').slice(0,260);
 const status=field('status').toUpperCase();
 const resolved=complete&&status==='FOUND'?resolveOfficialStop(stationName):null;
 return {status:resolved?'found':status==='AMBIGUOUS'?'ambiguous':'unverified',answer,place,station:resolved,reason,walk};
}
