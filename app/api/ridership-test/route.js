export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

const SERVICE='getStnPsgr';
const KEY_NAME='SEOUL_SUBWAY_RIDERSHIP_API_KEY';
const PAGE_SIZE=1000;
const MAX_PAGES=12;
const TTL=10*60*1000;
const memo=new Map();
const pending=new Map();
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'}});
const dateKst=(shift=0)=>{
  const today=new Date(Date.now()+9*3600000+shift*86400000);
  return [today.getUTCFullYear(),String(today.getUTCMonth()+1).padStart(2,'0'),String(today.getUTCDate()).padStart(2,'0')].join('');
};
const cleanCode=(value)=>String(value??'').replace(/^0+(?=\d)/,'');
const asNumber=(value)=>{const n=Number(value);return Number.isFinite(n)?n:0;};
const text=(value)=>String(value??'').trim();
function safeError(error){
  const name=text(error?.message);
  return ['TIMEOUT','UPSTREAM_HTTP','UPSTREAM_JSON','UPSTREAM_RESULT','UPSTREAM_SCHEMA','UPSTREAM_LIMIT','UPSTREAM_FILTER_MISMATCH','NETWORK_ERROR','KEY_NOT_CONFIGURED'].includes(name)?name:'UPSTREAM_UNAVAILABLE';
}
function makeUrl(host,key,start,end,date,station){
  return host+'/'+encodeURIComponent(key)+'/json/'+SERVICE+'/'+start+'/'+end+'/'+date+'/'+station+'/';
}
async function fetchPage(key,date,station,start,end){
  let lastError='NETWORK_ERROR';
  for(const host of ['http://openapi.seoul.go.kr:8088','https://openapi.seoul.go.kr:8088']){
    try{
      const r=await fetch(makeUrl(host,key,start,end,date,station),{cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!r.ok){lastError='UPSTREAM_HTTP';continue;}
      let body;
      try{body=await r.json();}catch{lastError='UPSTREAM_JSON';continue;}
      const envelope=body?.response;
      if(envelope){
        const header=envelope.header||{},node=envelope.body||{};
        const code=text(header.resultCode||'');
        if(!['00','0','INFO-000'].includes(code))return {error:'UPSTREAM_RESULT',providerCode:code};
        const value=node.items?.item??node.items??node.item??[];
        const rows=Array.isArray(value)?value:value&&typeof value==='object'?[value]:[];
        const total=Math.max(0,Number(node.totalCount??0));
        if(total>0&&!rows.length){lastError='UPSTREAM_SCHEMA';continue;}
        return {rows,total};
      }
      const service=body?.[SERVICE]||Object.entries(body||{}).find(([k])=>k.toLowerCase()===SERVICE.toLowerCase())?.[1];
      const result=service?.RESULT||body?.RESULT||{};
      const code=text(result.CODE);
      if(code==='INFO-200')return {rows:[],total:0};
      if(code&&code!=='INFO-000')return {error:'UPSTREAM_RESULT',providerCode:code};
      if(!service||!Array.isArray(service.row)){
        if(Number(service?.list_total_count||0)===0)return {rows:[],total:0};
        lastError='UPSTREAM_SCHEMA';
        continue;
      }
      return {rows:service.row,total:Math.max(0,Number(service.list_total_count)||service.row.length)};
    }catch(e){lastError=e?.name==='TimeoutError'?'TIMEOUT':'NETWORK_ERROR';}
  }
  throw Error(lastError);
}
const shape=(r)=>({
  date:text(r.pasngDe||r.crtrYmd),
  hour:text(r.pasngHr).padStart(2,'0'),
  line:text(r.lineNm),
  station:text(r.stnNm),
  stationCode:text(r.stnCd),
  stationNo:text(r.stnNo),
  cardCode:text(r.trnscdSeCd),
  cardName:text(r.trnscdSeCdNm)||text(r.trnscdSeCd)||'미분류',
  userCode:text(r.trnscdUserSeCd),
  userName:text(r.trnscdUserSeCdNm)||text(r.trnscdUserSeCd)||'미분류',
  board:asNumber(r.rideNope),
  alight:asNumber(r.gffNope)
});
function summarize(rows,date,station,total){
  const hourly=Array.from({length:24},(_,hour)=>({hour:String(hour).padStart(2,'0'),board:0,alight:0}));
  const cards=new Map(),users=new Map(),lines=new Set();
  let board=0,alight=0;
  for(const row of rows){
    const hour=Number(row.hour);
    if(!Number.isInteger(hour)||hour<0||hour>23)continue;
    board+=row.board;alight+=row.alight;
    hourly[hour].board+=row.board;
    hourly[hour].alight+=row.alight;
    if(row.line)lines.add(row.line);
    for(const [map,name] of [[cards,row.cardName],[users,row.userName]]){
      const current=map.get(name)||{name,board:0,alight:0};
      current.board+=row.board;current.alight+=row.alight;
      map.set(name,current);
    }
  }
  const mapped=m=>[...m.values()].sort((a,b)=>b.board+b.alight-(a.board+a.alight));
  const peak=hourly.reduce((best,r)=>r.board+r.alight>best.board+best.alight?r:best,hourly[0]);
  return {ok:true,date,stationCode:station,stationName:rows.find(x=>x.station)?.station||'',lines:[...lines],
    board,alight,total:board+alight,net:alight-board,
    peakHour:peak.hour,peakCount:peak.board+peak.alight,hourly,cards:mapped(cards),users:mapped(users),
    rowCount:rows.length,sourceTotal:total,truncated:total>rows.length,
    sampleRows:rows.slice(0,25),receivedAt:new Date().toISOString(),
    source:'서울 열린데이터광장 · getStnPsgr',
    explanation:'시간대별 교통카드 승하차 집계이며 열차 내부 또는 승강장의 실시간 혼잡도는 아닙니다.'};
}
async function collect(key,date,station){
  let effectiveStation=station;
  let first=await fetchPage(key,date,effectiveStation,1,PAGE_SIZE);
  if(first.error)throw Error(first.error);
  if(first.total===0){
    // Some providers match station codes without leading zeroes; verify rather than assume no traffic.
    const alternate=cleanCode(station);
    if(alternate!==station){
      const retry=await fetchPage(key,date,alternate,1,PAGE_SIZE);
      if(retry.error)throw Error(retry.error);
      if(retry.total>0){effectiveStation=alternate;first=retry;}
    }
    if(first.total===0){
      // Distinguish an empty source date from a station-filter mismatch.
      const dayProbe=await fetchPage(key,date,'',1,5);
      if(dayProbe.error)throw Error(dayProbe.error);
      if(dayProbe.total>0)throw Error('UPSTREAM_FILTER_MISMATCH');
      return {...summarize([],date,station,0),sourceDiagnostic:'NO_RECORDS_FOR_DATE'};
    }
  }
  if(first.total>MAX_PAGES*PAGE_SIZE)throw Error('UPSTREAM_LIMIT');
  const raw=[...first.rows];
  const pages=Math.ceil(first.total/PAGE_SIZE);
  for(let page=2;page<=pages;page+=2){
    const n=[page,page+1].filter(x=>x<=pages);
    const data=await Promise.all(n.map(x=>fetchPage(key,date,effectiveStation,(x-1)*PAGE_SIZE+1,x*PAGE_SIZE)));
    for(const result of data){
      if(result.error)throw Error(result.error);
      raw.push(...result.rows);
    }
  }
  if(raw.some(r=>r.stnCd!==undefined&&cleanCode(r.stnCd)!==cleanCode(station)))throw Error('UPSTREAM_FILTER_MISMATCH');
  return summarize(raw.map(shape),date,station,first.total);
}
export async function GET(request){
  const q=new URL(request.url).searchParams;
  const station=text(q.get('station')||'0154');
  const date=text(q.get('date')||dateKst(-1));
  if(!/^\d{3,5}$/.test(station)||!/^\d{8}$/.test(date)||date<dateKst(-6)||date>dateKst(0))
    return response({ok:false,error:'INVALID_QUERY',detail:'최근 7일 이내 날짜 및 역코드를 선택하세요.'},400);
  const key=process.env[KEY_NAME]?.trim();
  if(!key)return response({ok:false,error:'KEY_NOT_CONFIGURED'},503);
  const id=date+'|'+station;
  const now=Date.now(),cached=memo.get(id);
  if(cached&&now-cached.at<TTL)return response({...cached.data,cached:true});
  try{
    if(!pending.has(id))pending.set(id,collect(key,date,station).finally(()=>pending.delete(id)));
    const data=await pending.get(id);
    memo.set(id,{at:Date.now(),data});
    if(memo.size>35)memo.delete(memo.keys().next().value);
    return response(data);
  }catch(e){return response({ok:false,error:safeError(e),date,stationCode:station},502);}
}
