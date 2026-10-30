// Seoul Metro published train timetable (not real-time arrival predictions).
export const runtime='nodejs';
export const dynamic='force-dynamic';
const ENDPOINT='https://apis.data.go.kr/B553766/schedule/getTrainSch';
const ROW_LIMIT=1000;
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'public, max-age=60, s-maxage=300, stale-while-revalidate=900','X-Content-Type-Options':'nosniff'}});
function dateTime(txt){
  const t=String(txt??'').trim();
  const m=t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)||t.match(/^(\d{2})(\d{2})(?:\d{2})?$/);
  if(!m)return '';
  const h=Number(m[1]),mi=Number(m[2]);
  return h<=29&&mi<60?String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0'):'';
}
function safe(x,max=120){return String(x??'').trim().slice(0,max);}
function unwrap(json){
  if(json?.response){
    const head=json.response.header||{};
    const code=String(head.resultCode||'00');
    if(!['00','0','INFO-000'].includes(code))return {error:code==='03'||code==='INFO-200'?'NO_DATA':'UPSTREAM_ERROR'};
    const body=json.response.body||{};
    let raw=body.items?.item??body.items??body.item??[];
    if(!Array.isArray(raw))raw=raw&&typeof raw==='object'?[raw]:[];
    return {rows:raw,total:Number(body.totalCount??raw.length)};
  }
  if(json?.getTrainSch){
    const g=json.getTrainSch;
    const code=String(g.RESULT?.CODE||'INFO-000');
    if(!['INFO-000','00'].includes(code))return {error:code==='INFO-200'?'NO_DATA':'UPSTREAM_ERROR'};
    return {rows:g.row||[],total:Number(g.list_total_count||0)};
  }
  return {error:'UNEXPECTED_RESPONSE'};
}
function row(a){
  const time=dateTime(a.trainDptreTm||a.dptreTm||a.trainArvlTm||a.arvlTm);
  if(!time)return null;
  const express=safe(a.etrnYn,20),kind=safe(a.trainKnd,60);
  const isExpress=['Y','1','true'].includes(express.toLowerCase())||/급행|특급/.test(kind);
  return {time,arrival:dateTime(a.trainArvlTm||a.arvlTm),departure:dateTime(a.trainDptreTm||a.dptreTm),
    destination:safe(a.arvlStnNm||a.destStnNm||a.destNm||''),
    origin:safe(a.dptreStnNm||''),number:safe(a.trainno,30),
    kind,express:isExpress,expressFlag:express,
    direction:safe(a.upbdnbSe,30),station:safe(a.stnNm,80),
    temporary:safe(a.tmprTmtblYn,10)};
}
export async function GET(request){
  const q=new URL(request.url).searchParams;
  const station=(q.get('station')||'종로5가').replace(/역$/,'').trim();
  const line=q.get('line')||'1';
  const day=q.get('day')||'평일';
  const direction=q.get('direction')||'상행';
  if(!/^[가-힣0-9A-Za-z·.()\s-]{2,48}$/.test(station)|| !/^[1-9]$/.test(line) ||
    !['평일','주말'].includes(day)||!['상행','하행','내선','외선'].includes(direction)||
    ((line==='2')!==['내선','외선'].includes(direction)))
    return reply({ok:false,error:'INVALID_QUERY',message:'역·호선·방향·요일을 확인해 주세요.'},400);
  const key=process.env.SEOUL_METRO_TIMETABLE_API_KEY?.trim();
  if(!key)return reply({ok:false,error:'NOT_CONFIGURED',message:'시간표 API 키가 설정되지 않았습니다.'},503);
  const url=new URL(ENDPOINT);
  url.searchParams.set('serviceKey',key);
  for(const [k,v] of Object.entries({dataType:'JSON',pageNo:'1',numOfRows:String(ROW_LIMIT),
    tmprTmtblYn:'N',upbdnbSe:direction,wkndSe:day,lineNm:line+'호선',stnNm:station})) url.searchParams.set(k,v);
  try{
    const response=await fetch(url,{next:{revalidate:300},signal:AbortSignal.timeout(12500)});
    if(!response.ok)return reply({ok:false,error:'UPSTREAM_HTTP',message:'시간표 제공기관 연결에 실패했습니다.'},502);
    const text=await response.text();
    if(text.length>4000000)return reply({ok:false,error:'TOO_LARGE',message:'시간표 응답이 너무 큽니다.'},502);
    if(!text.trim().startsWith('{'))return reply({ok:false,error:'INVALID_FORMAT',message:'시간표 API가 JSON을 반환하지 않았습니다. 인증키 및 신청 상태를 확인해 주세요.'},502);
    const data=unwrap(JSON.parse(text));
    if(data.error){
      if(data.error==='NO_DATA')return reply({ok:true,rows:[],total:0,station,line,day,direction,truncated:false});
      return reply({ok:false,error:data.error,message:'시간표 API 응답을 확인할 수 없습니다.'},502);
    }
    let rows=(data.rows||[]).map(row).filter(Boolean)
      .filter(a=>!a.station||a.station.replace(/역$/,'').trim()===station)
      .sort((a,b)=>a.time.localeCompare(b.time)||a.number.localeCompare(b.number));
    const unique=new Set();
    rows=rows.filter(a=>{const sig=[a.time,a.number,a.direction,a.destination].join('|');if(unique.has(sig))return false;unique.add(sig);return true;});
    const total=Number.isFinite(data.total)?data.total:rows.length;
    return reply({ok:true,rows,station,line,day,direction,total,truncated:total>ROW_LIMIT});
  }catch(e){
    return reply({ok:false,error:e?.name==='TimeoutError'?'TIMEOUT':'FETCH_FAILED',
      message:'시간표 조회가 지연되거나 응답을 처리하지 못했습니다.'},502);
  }
}
