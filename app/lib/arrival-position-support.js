import graph from '../data/trainLostDirection.json';
const cache=new Map(),pending=new Map();
const normalize=name=>String(name||'').trim().replace(/역$/,'');
const number=value=>String(value||'').trim().replace(/^0+(?=\d)/,'');
function receipt(row){const raw=String(row.recptnDt||''),last=String(row.lastRecptnDt||'');const full=[raw,last].find(s=>/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d+)?$/.test(s));if(full)return Date.parse(full.slice(0,19).replace(' ','T')+'+09:00');const date=last.match(/^(\d{4}-\d\d-\d\d|\d{8})/)?.[1];if(date&&/^\d\d:\d\d:\d\d(?:\.\d+)?$/.test(raw)){const d=date.length===8?date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6):date;return Date.parse(d+'T'+raw.slice(0,8)+'+09:00');}return NaN;}
// Only a unique directed path is accepted. No loop/branch inference or ETA.
function distance(from,to,direction,limit=60){let current=normalize(from);const target=normalize(to),seen=new Set();for(let i=0;i<=limit;i++){if(current===target)return i;if(seen.has(current))return null;seen.add(current);const next=Object.entries(graph['1호선'][current]||{}).filter(([,d])=>d===direction).map(([n])=>n);if(next.length!==1)return null;current=next[0];}return null;}
export async function loadArrivalPositions(key,now=Date.now()){
 if(!key)return [];
 const hit=cache.get('1');if(hit&&now-hit.at<15000)return hit.rows;
 if(!pending.has('1'))pending.set('1',(async()=>{const response=await fetch('http://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimePosition/0/500/1%ED%98%B8%EC%84%A0',{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!response.ok)throw Error('POSITION_HTTP');const body=await response.json();if(!Array.isArray(body.realtimePositionList))throw Error('POSITION_FORMAT');const rows=body.realtimePositionList;cache.set('1',{at:Date.now(),rows});return rows;})().finally(()=>pending.delete('1')));
 return pending.get('1');
}
export function supplementArrivalPositions(data,rows,now=Date.now()){
 const target=normalize(data.station.name),latest=new Map();
 for(const row of rows){if(row.subwayId!=null&&String(row.subwayId)!=='1001')continue;const time=receipt(row);if(!Number.isFinite(time)||now-time>90000||time-now>60000)continue;const key=number(row.trainNo);if(!key)continue;const old=latest.get(key);if(!old||time>old.time)latest.set(key,{row,time});}
 if(!data.groups.length&&latest.size)data.groups=['상행','하행'].map(provider=>({id:provider,provider,nextStation:'',nextStations:[],trains:[]}));
 for(const group of data.groups){const direction=group.provider==='상행'?'0':group.provider==='하행'?'1':null;if(direction===null)continue;
  const trains=group.trains.filter(t=>{const pos=latest.get(number(t.trainNo));if(!pos||pos.time<Date.parse(t.receivedAt)||String(pos.row.updnLine)!==direction)return true;const loc=normalize(pos.row.statnNm);const passed=distance(target,loc,direction,3);return !((passed!==null&&passed>0)||(loc===target&&String(pos.row.trainSttus)==='2'));});
  for(const {row,time}of latest.values()){
   if(String(row.updnLine)!==direction)continue;const loc=normalize(row.statnNm),stops=distance(loc,target,direction,3);if(stops===null)continue;if(stops===0&&String(row.trainSttus)==='2')continue;
   const existing=trains.find(t=>number(t.trainNo)===number(row.trainNo));
   if(existing){if(time<Date.parse(existing.receivedAt))continue;existing.location=loc;existing.positionReceivedAt=new Date(time).toISOString();existing.positionDistance=stops;existing.locationOnlyAllowed=true;continue;}
   const destination=normalize(row.statnTnm);if(!destination||distance(target,destination,direction)===null)continue;
   trains.push({trainNo:String(row.trainNo),destination,destinationSource:'position',kind:['1','7'].includes(String(row.directAt))?'급행':'일반',arrivalCode:'position',receivedAt:new Date(time).toISOString(),positionReceivedAt:new Date(time).toISOString(),estimatedAt:null,message:'',location:loc,locationOnlyAllowed:true,positionDistance:stops,lastTrain:false,rank:9});
  }
  group.trains=trains.sort((a,b)=>(a.positionDistance??99)-(b.positionDistance??99)||a.rank-b.rank).slice(0,6);
 }
 const times=data.groups.flatMap(g=>g.trains).map(t=>Date.parse(t.positionReceivedAt||t.receivedAt));if(times.length){data.status='ok';data.updatedAt=new Date(Math.max(...times)).toISOString();}return data;
}
