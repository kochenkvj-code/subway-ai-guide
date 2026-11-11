'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {stationMaster} from '../lib/station-master';
import {stationNeighbors,expectedLiveDirection,findLiveCandidates,followStops,trainStationKey} from '../lib/train-lost';
import {compareTimetable,closestSchedule,minuteGap,normalizeTrainNo} from '../lib/train-lost-validation.mjs';
import './lab.css';

const clock=(mins=0)=>{
 const parts=new Intl.DateTimeFormat('en-CA',{
  timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).formatToParts(new Date(Date.now()-mins*60000));
 const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return {date:v.year+'-'+v.month+'-'+v.day,time:v.hour+':'+v.minute};
};
const dayFor=date=>{
 const day=new Date(date+'T12:00:00+09:00').getUTCDay();
 return day===0||day===6?'주말':'평일';
};
const timeDisplay=value=>value?new Intl.DateTimeFormat('ko-KR',{
 timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
}).format(new Date(value)):'—';
const apiCall=async(params,signal)=>{
 const response=await fetch('/api/train-lost-validation?'+new URLSearchParams(params),{cache:'no-store',signal});
 const body=await response.json();
 return response.ok?body:{...body,ok:false};
};
const rankOf=(list,no)=>list.findIndex(row=>normalizeTrainNo(row.number)===normalizeTrainNo(no));
const numberText=value=>String(value||'').padStart(4,'0');
const tag=(kind)=>kind==='matched'?'시간표 일치':kind==='not-listed'?'시간표 미등재':'판정 불가';

function CandidatePanel({title,subtitle,list,liveByNo,accent}){
 return <section className={'tv-ranking '+(accent?'tv-ranking-proposed':'')}>
  <div className="tv-rank-head"><div><h3>{title}</h3><p>{subtitle}</p></div><span className="tv-count">{list.length}대</span></div>
  {list.length?<div className="tv-rank-list">{list.map((item,i)=>{
   const live=liveByNo.get(normalizeTrainNo(item.number))||item.live;
   return <div className="tv-rank-entry" key={item.number+'/'+i}>
    <span className="tv-rank-number">{i+1}</span>
    <div className="tv-rank-info"><strong>{numberText(item.number)} <small>{live?.express?'⚡ 급행':''}</small></strong>
     <span>{live?.destination||'행선지 미확인'}</span></div>
    <div className="tv-rank-position"><strong>{item.station}</strong><small>{item.stopsFromAlight}정거장 · 점수 {item.score}</small></div>
   </div>;
  })}</div>:<p className="tv-empty">조건에 맞는 후보가 없습니다.</p>}
 </section>;
}

export default function TrainLostValidation(){
 const initial=()=>clock(15);
 const [line,setLine]=useState('1');
 const [station,setStation]=useState('종로5가');
 const [next,setNext]=useState('종로3가');
 const [when,setWhen]=useState(initial);
 const [day,setDay]=useState(()=>dayFor(clock().date));
 const [filter,setFilter]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [snapshot,setSnapshot]=useState(null);
 const abort=useRef(null);
 useEffect(()=>()=>abort.current?.abort(),[]);
 const neighbors=useMemo(()=>stationNeighbors(line,station),[line,station]);
 const directionCode=expectedLiveDirection(line,station,next);
 const valid=Boolean(neighbors.includes(trainStationKey(line,next))&&directionCode!==null&&when.date&&when.time);
 const direction=Number(line)===2?(directionCode==='0'?'내선':'외선'):(directionCode==='0'?'상행':'하행');
 const stationOptions=useMemo(()=>[...new Set(stationMaster.filter(row=>row.line===line).map(row=>row.names.ko.replace(/역$/,'')))], [line]);
 const onLine=value=>{
  setLine(value);setSnapshot(null);
  if(!stationNeighbors(value,station).length){setStation('');setNext('');}
  else setNext(stationNeighbors(value,station)[0]||'');
 };
 const onStation=value=>{
  const clean=value.replace(/역$/,'');
  setStation(clean);setSnapshot(null);
  const choices=stationNeighbors(line,clean);
  if(!choices.includes(trainStationKey(line,next)))setNext(choices[0]||'');
 };
 const onDate=value=>{setWhen(old=>({...old,date:value}));setDay(dayFor(value));};
 const presets=[
  {label:'종로5가 · 종로3가 방면',line:'1',station:'종로5가',next:'종로3가'},
  {label:'용산 · 노량진 방면',line:'1',station:'용산',next:'노량진'},
  {label:'구로 · 구일 방면',line:'1',station:'구로',next:'구일'}
 ];
 const pickPreset=p=>{setLine(p.line);setStation(p.station);setNext(p.next);setSnapshot(null);setError('');};
 const run=async()=>{
  if(!valid||busy)return;
  abort.current?.abort();
  const controller=new AbortController();abort.current=controller;
  const query={line,station,next,date:when.date,time:when.time,day,direction,directionCode};
  setBusy(true);setError('');
  try{
   const [position,timetable]=await Promise.all([
    apiCall({type:'position',line},controller.signal),
    apiCall({type:'timetable',line,station,day,direction},controller.signal)
   ]);
   if(!position?.ok)throw Error('실시간 위치 API: '+(position?.error||'조회 실패'));
   const route=followStops(line,station,next,8).stops;
   const stations=[station,...route.slice(0,6)];
   const arrivals=await Promise.all(stations.map(s=>
    apiCall({type:'arrival',line,station:s},controller.signal).catch(()=>({ok:false,evidence:[]}))
   ));
   const evidence=arrivals.flatMap(x=>x?.ok&&Array.isArray(x.evidence)?x.evidence:[]);
   if(controller.signal.aborted)return;
   setSnapshot({query,position,timetable,evidence,capturedAt:Date.now(),
    arrivalsOK:arrivals.filter(x=>x.ok).length,arrivalStations:stations.length});
  }catch(e){if(!controller.signal.aborted)setError(e.message||'조회 중 오류가 발생했습니다.');}
  finally{if(!controller.signal.aborted)setBusy(false);}
 };
 const result=useMemo(()=>{
  if(!snapshot)return null;
  const {query:q,position,timetable,evidence,capturedAt}=snapshot;
  const list=(position.positions||[]).filter(p=>Number(p.line)===Number(q.line)&&String(p.direction)===q.directionCode);
  const timetablePayload=timetable?.ok?timetable:{ok:false,error:timetable?.error,rows:[]};
  const checked=compareTimetable(list,timetablePayload,{excludeUnlisted:true});
  const allChecks=compareTimetable(list,timetablePayload);
  const params={date:q.date,time:q.time,line:q.line,station:q.station,
   next:q.next,arrivalEvidence:evidence,now:capturedAt};
  const baseline=findLiveCandidates(list,params).candidates;
  // Filter BEFORE ranking and applying the existing top-8 limit.
  // This proposed simulation intentionally uses equal 2m/stop for all trains.
  const after=findLiveCandidates(checked.eligible.map(p=>({...p,express:false})),params).candidates;
  const liveByNo=new Map(list.map(p=>[normalizeTrainNo(p.trainNo),p]));
  return {list,baseline,after,checked,allChecks,liveByNo,timetablePayload};
 },[snapshot]);
 const rows=useMemo(()=>{
  if(!result)return [];
  const q=snapshot.query;
  const needle=filter.trim().toLowerCase();
  return result.allChecks.checks.filter(row=>{
   if(!needle)return true;
   return [row.position.trainNo,row.position.station,row.position.destination].some(v=>
    String(v||'').toLowerCase().includes(needle));
  }).map(row=>{
   const best=closestSchedule(row.matched,q.time);
   return {...row,best,delta:best?minuteGap(best.arrival||best.departure||best.time,q.time):null,
    oldRank:rankOf(result.baseline,row.position.trainNo),
    newRank:rankOf(result.after,row.position.trainNo)};
  }).sort((a,b)=>{
   const priority=x=>x.oldRank>=0?x.oldRank:x.newRank>=0?x.newRank+8:99;
   return priority(a)-priority(b)||normalizeTrainNo(a.position.trainNo).localeCompare(normalizeTrainNo(b.position.trainNo));
  });
 },[result,snapshot,filter]);
 const scope=snapshot?.query;
 const recovered=result?.after.filter(c=>rankOf(result.baseline,c.number)<0)||[];
 const excludedCandidates=result?.baseline.filter(c=>
  result.checked.excluded.some(v=>normalizeTrainNo(v.position.trainNo)===normalizeTrainNo(c.number)))||[];
 return <main className="tv-page">
  <header className="tv-banner">
   <div className="tv-banner-top"><span className="tv-eyebrow">SUBWAY AI GUIDE / VALIDATION LAB</span><span className="tv-preview-badge">실험 전용</span></div>
   <h1>열차 후보 검증 실험실</h1>
   <p>하차역 시간표와 실시간 열차번호를 대조하고, 후보를 <strong>선정하기 전에</strong> 거르는 방식의 효과를 비교합니다.</p>
   <p className="tv-banner-sub">원본 유실물 찾기·실제 수배 요청에는 영향을 주지 않습니다.</p>
  </header>

  <section className="tv-panel tv-input">
   <div className="tv-section-title"><span className="tv-step">01</span><div><h2>하차 조건</h2><p>언제, 어느 역에서, 어느 방향으로 내렸나요?</p></div></div>
   <div className="tv-presets">{presets.map(p=><button type="button" key={p.label} onClick={()=>pickPreset(p)}>{p.label}</button>)}</div>
   <div className="tv-fields">
    <label>호선<select value={line} onChange={e=>onLine(e.target.value)}>{Array.from({length:9},(_,i)=><option value={i+1} key={i}>{i+1}호선</option>)}</select></label>
    <label>하차역<input list="tv-station-options" value={station} onChange={e=>onStation(e.target.value)} placeholder="예: 종로5가"/><datalist id="tv-station-options">{stationOptions.map(s=><option key={s} value={s}/>)}</datalist></label>
    <label className="tv-wide">열차가 떠난 다음 역<select value={next} onChange={e=>{setNext(e.target.value);setSnapshot(null);}} disabled={!neighbors.length}><option value="">방향을 선택하세요</option>{neighbors.map(s=><option key={s} value={s}>{s} 방면</option>)}</select></label>
    <label>하차 날짜<input type="date" value={when.date} onChange={e=>onDate(e.target.value)}/></label>
    <label>하차 시각<input type="time" value={when.time} onChange={e=>setWhen(w=>({...w,time:e.target.value}))}/></label>
    <label className="tv-wide">시간표 운행일 기준<select value={day} onChange={e=>setDay(e.target.value)}><option value="평일">평일</option><option value="주말">주말 · 공휴일 (제공처 기준 확인)</option></select></label>
   </div>
   <p className="tv-direction">조회 방향: <strong>{valid?direction+' (실시간 코드 '+directionCode+')':'역과 다음 역을 확인해 주세요'}</strong></p>
   <button className="tv-run" disabled={!valid||busy} onClick={run} type="button">{busy?'API 응답 확인 중…':'실시간 + 시간표 대조 실행'} <span>↗</span></button>
   <p className="tv-help">하차 후 30분 이내의 실제 사례에 사용하는 테스트입니다. 과거 날짜로 입력하면 현재 실시간 위치와 일치하지 않을 수 있습니다.</p>
   {error&&<div className="tv-error" role="alert">{error}</div>}
  </section>

  {result&&<div className="tv-results">
   <section className="tv-panel">
    <div className="tv-section-title"><span className="tv-step">02</span><div><h2>실제 API 수집 결과</h2><p>{scope.station} · {scope.line}호선 · {scope.direction} · {scope.date} {scope.time} 하차</p></div></div>
    <div className="tv-metrics">
     <div><small>방향 일치 실시간 열차</small><strong>{result.list.length}</strong><span>대</span></div>
     <div><small>시간표 번호 일치</small><strong>{result.allChecks.counts.matched}</strong><span>대</span></div>
     <div><small>시간표 미등재</small><strong>{result.allChecks.counts.notListed}</strong><span>대</span></div>
     <div><small>판정 불가</small><strong>{result.allChecks.counts.unknown}</strong><span>대</span></div>
    </div>
    <div className="tv-source-grid">
     <div><span>실시간 위치 API</span><strong>{result.list.length}대 / 전체 {snapshot.position.positions?.length||0}대</strong><small>수신 {timeDisplay(snapshot.position.fetchedAt)}</small></div>
     <div><span>하차역 시간표 API</span><strong>{snapshot.timetable?.ok?(snapshot.timetable.rows?.length||0)+'건':'조회 실패'}</strong><small>{snapshot.timetable?.ok?(snapshot.timetable.truncated?'⚠ 일부 제공 / 완전성 미확인':'응답 정상 · 완전성은 별도 검증 필요'):'오류: '+(snapshot.timetable?.error||'알 수 없음')}</small></div>
     <div><span>후속역 실시간 도착</span><strong>{snapshot.arrivalsOK}/{snapshot.arrivalStations}개 역 성공</strong><small>기존 후보 모델의 교차확인 근거</small></div>
    </div>
    {snapshot.timetable?.ok&&result.allChecks.counts.notListed>0&&<p className="tv-warning">시간표에 없다는 사실만으로 해당 역을 통과했다고 단정할 수는 없습니다. 아래의 제외 결과는 <strong>검증용 가정</strong>입니다.</p>}
    {!snapshot.timetable?.ok&&<p className="tv-warning">시간표 API가 실패해 열차번호 대조를 할 수 없습니다. 후보 제외 없이 비교합니다.</p>}
   </section>

   <section className="tv-panel">
    <div className="tv-section-title"><span className="tv-step">03</span><div><h2>후보 순위 비교</h2><p>필터를 상위 8대 선정 전에 적용한 결과</p></div></div>
    <div className="tv-compare">
     <CandidatePanel title="현재 운영 계산" subtitle="시간표 필터 없음 · 급행 1.5분/역" list={result.baseline} liveByNo={result.liveByNo}/>
     <CandidatePanel title="개선안 시뮬레이션" subtitle="시간표 미등재 임시 제외 → 전열차 2분/역 → 상위 8대" list={result.after} liveByNo={result.liveByNo} accent/>
    </div>
    <div className="tv-summary">
     <div><span>기존 후보 중 제외</span><strong>{excludedCandidates.length}대</strong><small>{excludedCandidates.length?excludedCandidates.map(c=>numberText(c.number)).join(', '):'없음'}</small></div>
     <div><span>새로 상위 8대 진입</span><strong>{recovered.length}대</strong><small>{recovered.length?recovered.map(c=>numberText(c.number)).join(', '):'없음'}</small></div>
    </div>
    <p className="tv-disclaimer">두 모델 모두 실제 탑승열차를 확정하지 않습니다. 개선안은 급행 정차 패턴을 아직 적용하지 않은 단순 2분/역 실험이며, 시간표 미등재를 확정 미정차로 취급해서는 안 됩니다.</p>
   </section>

   <section className="tv-panel tv-details">
    <div className="tv-section-title"><span className="tv-step">04</span><div><h2>열차번호별 대조 내역</h2><p>실시간 API 원본 번호와 하차역 시간표 번호를 비교</p></div></div>
    <input className="tv-search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="열차번호·역·행선지 검색 (예: 1143)"/>
    <div className="tv-table-wrap"><table><thead><tr><th>열차 · 행선지</th><th>최근 위치</th><th>시간표 대조</th><th>기존 → 실험 순위</th></tr></thead>
     <tbody>{rows.map((row,i)=><tr key={row.position.trainNo+'/'+i}>
      <td><strong>{numberText(row.position.trainNo)}</strong>{row.position.express&&<span className="tv-express">급행</span>}<small>{row.position.destination||'행선지 미확인'}</small></td>
      <td><strong>{row.position.station}</strong><small>{timeDisplay(row.position.receivedAt)}</small></td>
      <td><span className={'tv-match tv-match-'+row.kind}>{tag(row.kind)}</span>
       {row.best&&<small>예정 {row.best.arrival||row.best.departure||row.best.time}{row.delta!==null?' · 차이 '+row.delta+'분':''}</small>}
       {row.kind==='not-listed'&&<small>실험 정책에서만 제외</small>}
      </td>
      <td><strong>{row.oldRank>=0?(row.oldRank+1)+'순위':'—'} <span className="tv-arrow">→</span> {row.newRank>=0?(row.newRank+1)+'순위':'—'}</strong></td>
     </tr>)}</tbody></table></div>
    {!rows.length&&<p className="tv-empty">조회 결과 또는 검색 결과가 없습니다.</p>}
    <p className="tv-help">대조 기준은 열차번호 문자열의 앞쪽 0만 정규화합니다. 1xxx처럼 번호 범위로 운행계통을 추측하는 예외는 사용하지 않습니다.</p>
   </section>
  </div>}
  <footer className="tv-footer">SUBWAY AI GUIDE · 열차 유실물 후보 로직 검증 · 별도 Preview 테스트 페이지</footer>
 </main>;
}
