import {timetableStation,serviceClock,compileTimetable,serviceMinute} from '../../../lib/timetable-lab-model';
import {stationRowMatches} from '../../../lib/station-provider';

// Read-only diagnosis of public train schedules. Fixed station, no key or secrets in responses.
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const station=timetableStation('0154');
const ENDPOINT='https://apis.data.go.kr/B553766/schedule/getTrainSch';
const days=new Set(['평일','주말','공휴일','상시']);
const directions=['상행','하행'];
const cache=new Map();
const pending=new Map();
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});

function unwrap(data) {
  const response=data?.response,header=response?.header||data?.header||{};
  const code=String(header.resultCode??data?.getTrainSch?.RESULT?.CODE??'');
  if(code==='03'||code==='INFO-200')return {rows:[],total:0,code};
  if(response&&(!['00','0','INFO-000'].includes(code)||!response.body))throw Error('PROVIDER_RESULT_'+code.slice(0,20));
  if(!response&&!data?.getTrainSch)throw Error('UNEXPECTED_FORMAT');
  const body=response?.body||data.getTrainSch;
  let rows=body?.items?.item??body?.items??body?.item??body?.row??[];
  if(!Array.isArray(rows))rows=rows&&typeof rows==='object'?[rows]:[];
  const total=Number(body?.totalCount??body?.list_total_count??rows.length);
  return {rows,total:Number.isFinite(total)?total:rows.length,code};
}
async function loadGroup(kind,day,direction,key) {
  const url=new URL(ENDPOINT);
  const params={dataType:'JSON',pageNo:'1',numOfRows:'1000',tmprTmtblYn:'N',
    upbdnbSe:direction,wkndSe:day,lineNm:'1호선'};
  params[kind==='code'?'stnCd':'stnNm']=kind==='code'?'0154':'종로5가';
  for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
  url.searchParams.set('serviceKey',key);
  const first=await loadPage(url,1);
  if(first.total>4000)throw Error('TOO_MANY_SOURCE_ROWS_'+first.total);
  const raw=[...first.rows];
  for(let n=2;n<=Math.ceil(first.total/1000);n++){
    const page=await loadPage(url,n);
    if(page.total!==first.total)throw Error('SOURCE_COUNT_CHANGED');
    raw.push(...page.rows);
  }
  const matched=raw.filter(r=>stationRowMatches(r,station));
  const seen=new Set();
  const unique=matched.filter(row=>{
    const sig=JSON.stringify(Object.keys(row).sort().map(k=>[k,row[k]]));
    if(seen.has(sig))return false;
    seen.add(sig);return true;
  });
  return {kind,direction,ok:true,code:first.code,providerTotal:first.total,
    fetched:raw.length,matched:matched.length,unique:unique.length,raw,rows:unique};
}
async function loadPage(url,n) {
  url.searchParams.set('pageNo',String(n));
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(14000)});
  if(!response.ok)throw Error('PROVIDER_HTTP_'+response.status);
  const text=await response.text();
  if(text.length>4000000)throw Error('PROVIDER_RESPONSE_LARGE');
  try{return unwrap(JSON.parse(text));}
  catch(e){throw Error(e.message?.startsWith('PROVIDER_')||e.message==='UNEXPECTED_FORMAT'?e.message:'INVALID_JSON');}
}
function minute(row){return serviceMinute(row.trainDptreTm||'');}
function valid(row,date) {
  const marker=date+'T12:00:00';
  return (!row.vldBgngDt||row.vldBgngDt<=marker)&&(!row.vldEndDt||row.vldEndDt>=marker);
}
function slim(r,direction,status){
  return {time:String(r.trainDptreTm||r.trainArvlTm||'').slice(0,18),
    number:String(r.trainno??''),to:String(r.arvlStnNm??''),
    sourceDirection:direction,station:String(r.stnNm??''),
    code:String(r.stnCd??''),line:String(r.lineNm??''),
    kind:String(r.trainKnd??''),express:String(r.etrnYn??''),
    validity:[String(r.vldBgngDt??''),String(r.vldEndDt??'')],
    status};
}
function auditSource(kind,loaded,hour,clock){
  const complete=loaded.filter(x=>x.ok);
  const groups=loaded.map(g=>g.ok?{direction:g.direction,ok:true,code:g.code,
    providerTotal:g.providerTotal,fetched:g.fetched,matched:g.matched,unique:g.unique}:
    {direction:g.direction,ok:false,error:g.error});
  const compiled=compileTimetable({groups:loaded.map(g=>({direction:g.direction,ok:g.ok,rows:g.rows||[],error:g.error}))},station,clock.businessDate);
  const visibleSet=new Set(compiled.rows.map(x=>[x.time,x.number,x.destination].join('|')));
  const shown=compiled.rows.filter(r=>Math.floor(r.minute/60)===hour);
  const sourceRows=[];
  for(const group of complete) {
    for(const row of group.raw) {
      const mi=minute(row);
      if(mi===null||Math.floor(mi/60)!==hour)continue;
      let status='방면판정 불가 또는 중복';
      if(!stationRowMatches(row,station))status='역 식별 필터 제외';
      else if(!valid(row,clock.businessDate))status='유효기간 제외';
      else if(!row.trainDptreTm)status='출발시각 없음';
      else if(visibleSet.has([row.trainDptreTm,String(row.trainno||''),String(row.arvlStnNm||'')].join('|')))status='화면 표시';
      sourceRows.push(slim(row,group.direction,status));
    }
  }
  sourceRows.sort((a,b)=>a.time.localeCompare(b.time)||a.number.localeCompare(b.number));
  return {kind,groups,counts:{raw:complete.reduce((n,g)=>n+g.fetched,0),
    matched:complete.reduce((n,g)=>n+g.matched,0),
    unique:complete.reduce((n,g)=>n+g.unique,0),
    compiled:compiled.rows.length,hourRaw:sourceRows.length,hourShown:shown.length},
    excluded:compiled.excluded,issues:compiled.issues,
    columns:compiled.columns.map(c=>({id:c.id,next:c.next,direction:c.providerDir})),
    shown:shown.map(r=>({time:r.time,number:r.number,to:r.destination,
      column:r.column,express:r.express})),rawAtHour:sourceRows.slice(0,220),
    rawAtHourTruncated:sourceRows.length>220};
}
async function diagnose(day,hour){
  const key=process.env.SEOUL_METRO_TIMETABLE_API_KEY?.trim();
  if(!key)throw Error('KEY_NOT_CONFIGURED');
  const clock=serviceClock(),requests=['code','name'].flatMap(kind=>directions.map(direction=>({kind,direction})));
  const groups=await Promise.all(requests.map(async r=>{
    try{return await loadGroup(r.kind,day,r.direction,key);}
    catch(e){return {...r,ok:false,error:String(e?.message||'UNAVAILABLE').slice(0,90)};}
  }));
  return {ok:groups.some(g=>g.ok),station:'종로5가',stationCode:'0154',day,hour,
    businessDate:clock.businessDate,checkedAt:new Date().toISOString(),
    sources:['code','name'].map(kind=>auditSource(kind,groups.filter(g=>g.kind===kind),hour,clock)),
    notice:'원본 공개 열차시간표와 현재 관리자 표시 로직의 진단 결과. 운행 실시간 도착정보가 아님.'};
}
export async function GET(request){
  const q=new URL(request.url).searchParams;
  const day=q.get('day')||'주말',hour=Number(q.get('hour')||13);
  if(!days.has(day)||!Number.isInteger(hour)||hour<5||hour>25)return reply({ok:false,error:'INVALID_QUERY'},400);
  // Fixed station and short cache to prevent repeat upstream API calls.
  const id=day+'|'+hour;
  const saved=cache.get(id);
  if(saved&&Date.now()-saved.time<300000)return reply(saved.body);
  try{
    if(!pending.has(id))pending.set(id,diagnose(day,hour).finally(()=>pending.delete(id)));
    const body=await pending.get(id);
    if(body.ok){
      cache.set(id,{body,time:Date.now()});
      if(cache.size>20)cache.delete(cache.keys().next().value);
    }
    return reply(body,body.ok?200:502);
  }catch(e){return reply({ok:false,error:String(e?.message||'UNAVAILABLE').slice(0,100)},502);}
}
