'use client';
import {useEffect,useMemo,useState} from 'react';
import './timetable-audit.css';

const DAYS=['평일','주말','공휴일','상시'];
const HOURS=Array.from({length:21},(_,i)=>i+5);
const DIRECTIONS=[{id:'상행',label:'상행 · 동대문 → 청량리 방향',short:'상행 / 동대문 방면'},
  {id:'하행',label:'하행 · 종로3가 → 서울역 방향',short:'하행 / 종로3가 방면'}];
const CAPTURE=[
 {minute:'02',to:'청량리',express:true},{minute:'07',to:'소요산'},
 {minute:'11',to:'광운대'},{minute:'19',to:'양주'},
 {minute:'24',to:'청량리',express:true},{minute:'29',to:'의정부'},
 {minute:'33',to:'광운대'},{minute:'39',to:'동두천'},
 {minute:'43',to:'광운대'},{minute:'48',to:'양주'},
 {minute:'53',to:'광운대'},{minute:'59',to:'청량리',express:true}
];
const hh=n=>String(n%24).padStart(2,'0');
const tt=value=>String(value||'').slice(0,5);
function validRange(row){
 const [a,b]=row.validity||[];
 const part=d=>d?d.replace('T',' ').slice(0,16):'제한 없음';
 return part(a)+' ~ '+part(b);
}
function trainGroups(rows,dir) {
 const groups=new Map();
 for(const row of rows.filter(x=>x.sourceDirection===dir)){
  const key=[row.sourceDirection,row.time,row.number].join('|');
  if(!groups.has(key))groups.set(key,{key,time:row.time,number:row.number,history:[]});
  groups.get(key).history.push(row);
 }
 return [...groups.values()].map(group=>{
  const current=group.history.find(r=>r.status==='화면 표시');
  const latest=[...group.history].sort((a,b)=>String(b.validity?.[0]||'').localeCompare(String(a.validity?.[0]||'')))[0];
  const representative=current||latest;
  const state=current?'active':group.history.every(r=>r.status==='유효기간 제외')?'past':'other';
  return {...group,representative,current,state,pastCount:group.history.filter(r=>r.status==='유효기간 제외').length};
 }).sort((a,b)=>a.time.localeCompare(b.time)||a.number.localeCompare(b.number));
}
const chip=(state)=>state==='active'?'현재 유효':state==='past'?'과거에만 존재':'기타 제외';
function statusFor(ref,src) {
 const time='13:'+ref.minute;
 const expected=String(ref.to).replace(/\s/g,'');
 const active=src.shown.filter(r=>r.column==='동대문|'&&tt(r.time)===time);
 if(active.some(r=>r.to.replace(/\s/g,'')===expected))return {kind:'matched',text:'일치',ours:active.map(r=>r.to).join(', ')};
 if(active.length)return {kind:'different',text:'행선지 다름',ours:active.map(r=>r.to).join(', ')};
 const old=(src.rawAtHour||[]).filter(r=>r.sourceDirection==='상행'&&tt(r.time)===time&&r.status==='유효기간 제외');
 if(old.length)return {kind:'past',text:'과거 기록만 있음',ours:[...new Set(old.map(r=>r.to))].join(', ')};
 return {kind:'missing',text:'원본에 없음',ours:'—'};
}
function TrainCard({train}){
 const r=train.representative;
 return <article className={'ta-train ta-'+train.state}>
  <div className="ta-train-main">
   <div className="ta-depart">{tt(train.time)}</div>
   <div className="ta-train-info">
    <strong>{r.to||'행선지 미상'} <span className="ta-train-number">#{train.number||'번호 없음'}</span></strong>
    <div className="ta-train-sub">{r.express==='Y'?'급행':'일반'} <span aria-hidden="true">·</span> {train.state==='active'?'현재 운행기간':'원본 자료'}</div>
   </div>
   <span className={'ta-state ta-state-'+train.state}>{chip(train.state)}</span>
  </div>
  {train.state==='past'&&<p className="ta-reason">현재 영업일 기준 유효기간 만료 · 최근 기록 {validRange(r)}</p>}
  {train.state==='other'&&<p className="ta-reason">{r.status}</p>}
  {train.history.length>1&&<details className="ta-history"><summary>원본 이력 {train.history.length}건 확인 <span>({train.pastCount}건 과거)</span></summary>
   <div className="ta-history-table">{[...train.history].sort((a,b)=>String(b.validity?.[0]||'').localeCompare(String(a.validity?.[0]||''))).map((v,i)=>
    <div key={i}><span className={v.status==='화면 표시'?'ta-h-current':''}>{v.status}</span><span>{v.to||'—'}</span><span>{validRange(v)}</span></div>)}</div>
  </details>}
 </article>;
}
function DirectionPanel({src,direction,mode,search}){
 const all=useMemo(()=>trainGroups(src.rawAtHour||[],direction.id),[src,direction.id]);
 const shown=all.filter(t=>mode==='all'||(mode==='active'&&t.state==='active')||(mode==='past'&&t.state==='past')||(mode==='other'&&t.state==='other'))
  .filter(t=>!search||[tt(t.time),t.number,t.representative.to,...t.history.map(r=>r.to)].some(v=>String(v||'').toLowerCase().includes(search.toLowerCase())));
 const active=all.filter(t=>t.state==='active').length,past=all.filter(t=>t.state==='past').length;
 return <section className="ta-direction">
  <div className="ta-direction-header"><div><h3>{direction.short}</h3><span>{direction.label}</span></div><div className="ta-dir-count"><strong>{active}</strong>편 <small>현재</small> / {past}편 <small>과거만</small></div></div>
  {shown.length===0?<div className="ta-empty">이 조건에 해당하는 열차가 없습니다.</div>:<div className="ta-train-list">{shown.map(train=><TrainCard key={train.key} train={train}/>)}</div>}
 </section>;
}
export default function TimetableAudit(){
 const [day,setDay]=useState('주말'),[hour,setHour]=useState('13'),[temp,setTemp]=useState('N');
 const [source,setSource]=useState('code'),[direction,setDirection]=useState('both');
 const [mode,setMode]=useState('all'),[search,setSearch]=useState('');
 const [report,setReport]=useState(null),[loading,setLoading]=useState(true);
 const [error,setError]=useState(''),[nonce,setNonce]=useState(0);
 useEffect(()=>{
  const ac=new AbortController();setLoading(true);setError('');
  fetch('/api/v2/timetable-audit?'+new URLSearchParams({day,hour,temp}),{cache:'no-store',signal:ac.signal})
   .then(async r=>{const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'조회 실패');setReport(j);})
   .catch(e=>{if(!ac.signal.aborted){setReport(null);setError(e.message);}})
   .finally(()=>{if(!ac.signal.aborted)setLoading(false);});
  return()=>ac.abort();
 },[day,hour,temp,nonce]);
 const src=report?.sources?.find(x=>x.kind===source);
 const currentHour=String(Number(hour)%24).padStart(2,'0');
 const currentCount=src?.counts.hourShown||0;
 const perDir=useMemo(()=>DIRECTIONS.map(dir=>{const g=trainGroups(src?.rawAtHour||[],dir.id);return {dir:dir.id,active:g.filter(t=>t.state==='active').length,past:g.filter(t=>t.state==='past').length};}),[src]);
 const compare=useMemo(()=>src&&Number(hour)===13?CAPTURE.map(r=>({...r,...statusFor(r,src)})):[],[src,hour]);
 return <main className="ta-page"><div className="ta-container">
  <div className="ta-kicker">SUBWAY AI GUIDE · API 진단</div>
  <header className="ta-header"><div><h1>종로5가역 1호선</h1><p>원본 열차시간표 · 누락 및 운행기간 비교</p></div><a href="/v2/timetable-lab?station=0154" className="ta-link">기존 시간표 보기</a></header>
  <div className="ta-controls">
   <label>운행일 구분<select value={day} onChange={e=>setDay(e.target.value)}>{DAYS.map(d=><option key={d}>{d}</option>)}</select></label>
   <label>조회 시간<select value={hour} onChange={e=>setHour(e.target.value)}>{HOURS.map(h=><option value={h} key={h}>{hh(h)}:00{h>=24?' (익일)':''}</option>)}</select></label>
   <label>임시 시간표<select value={temp} onChange={e=>setTemp(e.target.value)}><option value="N">N · 일반</option><option value="Y">Y · 임시</option><option value="none">파라미터 생략</option></select></label>
   <button className="ta-refresh" onClick={()=>setNonce(n=>n+1)} disabled={loading}>{loading?'조회 중…':'다시 조회'}</button>
  </div>
  {error&&<p className="ta-error">API 조회 실패: {error}</p>}
  {loading&&<p className="ta-loading">원본 시간표를 확인하고 있습니다…</p>}
  {src&&!loading&&<>
   <div className="ta-summary">
    <div><span>현재 유효 · {currentHour}시</span><strong>{currentCount}<small>편</small></strong></div>
    <div><span>상행 (현재 / 과거만)</span><strong>{perDir[0].active}<small> / {perDir[0].past}</small></strong></div>
    <div><span>하행 (현재 / 과거만)</span><strong>{perDir[1].active}<small> / {perDir[1].past}</small></strong></div>
    <div><span>하루 유효 열차</span><strong>{src.counts.compiled}<small>편</small></strong></div>
   </div>
   <div className="ta-notice">원본의 과거 이력은 같은 열차·출발시각별로 묶었어. <strong>과거에만 존재</strong>는 현재 시간표에 포함되지 않는 열차라는 뜻이야. 과거 이력 수는 운행 편수가 아니야.</div>
   <div className="ta-toolbar"><div className="ta-tabs" role="group" aria-label="원본 조회 방식">
    <button className={source==='code'?'selected':''} onClick={()=>setSource('code')}>역번호 조회</button>
    <button className={source==='name'?'selected':''} onClick={()=>setSource('name')}>역명 조회</button>
   </div><div className="ta-source-detail">{source==='code'?'stnCd=0154':'stnNm=종로5가'} · wkndSe={day} · tmprTmtblYn={temp==='none'?'생략':temp}</div></div>
   <div className="ta-filterbar">
    <div className="ta-tabs" role="group" aria-label="방향 선택">{[{id:'both',name:'양방향'},...DIRECTIONS.map(d=>({id:d.id,name:d.id}))].map(d=><button key={d.id} onClick={()=>setDirection(d.id)} className={direction===d.id?'selected':''}>{d.name}</button>)}</div>
    <div className="ta-tabs" role="group" aria-label="기간 상태">{[{id:'all',name:'전체'}, {id:'active',name:'현재 유효'}, {id:'past',name:'과거만'}, {id:'other',name:'기타 제외'}].map(d=><button key={d.id} onClick={()=>setMode(d.id)} className={mode===d.id?'selected':''}>{d.name}</button>)}</div>
    <input className="ta-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="열차번호·시각·행선지 검색" aria-label="열차 검색"/>
   </div>
   <div className={'ta-columns '+(direction==='both'?'':'ta-one-column')}>{DIRECTIONS.filter(d=>direction==='both'||d.id===direction).map(d=><DirectionPanel key={d.id} src={src} direction={d} mode={mode} search={search}/>)}</div>
   {Number(hour)===13&&<section className="ta-reference"><div className="ta-ref-heading"><h2>외부 앱 캡처와 비교 · 13시 상행</h2><p>첨부한 외부 앱은 <strong>Holidays</strong> 선택 상태. 아래는 그 12개 시각을 현재 선택한 API 자료와 비교한 결과야. 실제 동일 운행일 자료라고 단정하지 않아.</p></div>
    <div className="ta-ref-summary">정확히 일치 {compare.filter(r=>r.kind==='matched').length} / 12편 · 원본에 없거나 다른 행선지 {compare.filter(r=>r.kind!=='matched').length}편</div>
    <div className="ta-ref-table"><table><thead><tr><th>외부 앱 시각</th><th>외부 앱 행선지</th><th>API 비교 결과</th><th>원본에서 발견한 내용</th></tr></thead><tbody>
    {compare.map(r=><tr key={r.minute}><td className="ta-time-cell">13:{r.minute}</td><td>{r.to}{r.express&&<span className="ta-express">급행</span>}</td><td><span className={'ta-compare ta-compare-'+r.kind}>{r.text}</span></td><td>{r.ours}</td></tr>)}
    </tbody></table></div>
   </section>}
   <details className="ta-advanced"><summary>상세 API 통계 · 응답 행 수 및 제외 사유</summary>
    <p>기준 영업일 {report.businessDate} · 조회 {new Date(report.checkedAt).toLocaleString('ko-KR')} · 원본 getTrainSch</p>
    <div className="ta-stat-table"><table><thead><tr><th>방향</th><th>응답</th><th>전체 원본</th><th>역 식별 통과</th><th>중복 제거</th></tr></thead><tbody>{src.groups.map(g=><tr key={g.direction}><td>{g.direction}</td><td>{g.ok?'정상 '+g.code:g.error}</td><td>{g.providerTotal??'—'}</td><td>{g.matched??'—'}</td><td>{g.unique??'—'}</td></tr>)}</tbody></table></div>
    <p>전체 제외 내역: 과거 유효기간 {src.excluded.expired} · 출발시각 없음 {src.excluded.arrivalOnly} · 방면 판정 불가 {src.excluded.unclassified} · 시각 오류 {src.excluded.invalidTime} · 중복 {src.excluded.duplicates}</p>
    {src.rawAtHourTruncated&&<p>주의: 이 시간대 원본이 일부 생략되었습니다.</p>}
   </details>
  </>}
  <footer>이 페이지는 읽기 전용 진단용이야. 실제 운행·도착정보와 계획 시간표는 다를 수 있으며 기존 시간표 화면은 변경하지 않았어.</footer>
 </div></main>;

}
