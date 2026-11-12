'use client';
import {useMemo,useRef,useState} from 'react';
import {stationMaster} from '../../lib/station-master';
import './date-test.css';

const STATIONS=[...stationMaster].sort((a,b)=>a.names.ko.localeCompare(b.names.ko,'ko')||a.line.localeCompare(b.line));
const formatNumber=n=>Number(n||0).toLocaleString('ko-KR');
const itemKey=item=>item.id&&item.sequence?item.id+'|'+item.sequence:[item.title,item.date,item.place].join('|');
const emptyStats=()=>({total:0,totalPages:0,maxPages:0,pages:0,scanned:0,matched:0,closed:0,start:'',end:'',seconds:0,remoteMs:0,limit:false,warning:false});

export default function LostFoundDateTestPage(){
 const [stationCode,setStationCode]=useState('2546');
 const [days,setDays]=useState('30');
 const [status,setStatus]=useState('idle');
 const [stats,setStats]=useState(emptyStats);
 const [items,setItems]=useState([]);
 const [failure,setFailure]=useState('');
 const request=useRef(null);
 const station=useMemo(()=>STATIONS.find(s=>s.stationCode===stationCode),[stationCode]);
 const percentage=stats.totalPages?Math.round(100*Math.min(stats.pages,stats.totalPages)/stats.totalPages):status==='done'?100:0;
 const isRunning=status==='running';
 async function run(){
  request.current?.abort();
  const controller=new AbortController();
  request.current=controller;
  const since=performance.now(),recordMap=new Map();
  let current=emptyStats();
  setItems([]);setStats(current);setFailure('');setStatus('running');
  const update=page=>{
   if(controller.signal.aborted)return;
   for(const item of page.items)recordMap.set(itemKey(item),item);
   current={
    ...current,
    total:current.pages===0?page.total:current.total,
    totalPages:current.pages===0?page.totalPages:current.totalPages,
    maxPages:page.maxPages,
    pages:current.pages+1,
    scanned:current.scanned+page.scanned,
    matched:current.matched+page.matched,
    closed:current.closed+page.closed,
    start:page.start,end:page.end,
    seconds:(performance.now()-since)/1000,
    remoteMs:current.remoteMs+page.elapsedMs,
    limit:page.capped,
    warning:current.warning||page.paginationUncertain||current.pages>0&&page.total!==current.total
   };
   setStats({...current});
   setItems([...recordMap.values()].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)));
  };
  const retrieve=async pageNo=>{
   const params=new URLSearchParams({station:stationCode,days,page:String(pageNo)});
   const res=await fetch('/api/v2/lost-found-date-test?'+params,{cache:'no-store',signal:controller.signal});
   const data=await res.json();
   if(!res.ok||!data.ok)throw Error(data.error||'API_FAILED');
   if(data.station!==stationCode||data.days!==Number(days)||data.page!==pageNo)throw Error('RESPONSE_MISMATCH');
   return data;
  };
  try{
   const first=await retrieve(1);
   update(first);
   if(first.paginationUncertain)throw Error('PAGINATION_UNCERTAIN');
   const last=Math.min(first.totalPages,first.maxPages);
   for(let base=2;base<=last;base+=3){
    if(controller.signal.aborted)return;
    const pages=Array.from({length:Math.min(3,last-base+1)},(_,i)=>base+i);
    const chunks=await Promise.all(pages.map(retrieve));
    for(const result of chunks){
     update(result);
     if(result.paginationUncertain||result.total!==first.total)throw Error('PAGINATION_UNCERTAIN');
    }
   }
   if(controller.signal.aborted)return;
   setStatus(first.totalPages>first.maxPages?'partial':'done');
  }catch(error){
   if(controller.signal.aborted)return;
   setFailure(error.message||'UNKNOWN');
   setStatus('error');
   setStats(s=>({...s,seconds:(performance.now()-since)/1000}));
  }
 }
 function cancel(){
  request.current?.abort();
  setStatus('cancelled');
 }
 const stateLabel=({idle:'조회 대기',running:'원본 API 조회 중',done:'전체 페이지 조회 완료',partial:'조회 상한 도달 · 일부만 확인',error:'조회 중단 · 결과 일부일 수 있음',cancelled:'사용자가 조회 중단'})[status];
 return <main className="ldt-page"><div className="ldt-wrap">
  <header className="ldt-header">
   <div className="ldt-crumb">SUBWAY AI GUIDE <span>/</span> 내부 기능 검증</div>
   <h1>유실물 조회 방식 테스트</h1>
   <p>서울 전체 <b>날짜 우선 조회</b> → 선택한 역 보관정보만 필터링. 기존 유실물 메뉴와 별도로 작동하며, DB·캐시 없이 LOST112 원본을 매번 호출합니다.</p>
   <div className="ldt-tags"><span>실제 API</span><span>기간별 전체 페이지 자동 확인</span><span>추가 조회 버튼 없음</span></div>
  </header>
  <section className="ldt-config">
   <div className="ldt-form">
    <label>조회 역사
     <select value={stationCode} onChange={e=>setStationCode(e.target.value)} disabled={isRunning}>
      {STATIONS.map(s=><option key={s.stationCode} value={s.stationCode}>{s.names.ko} · {s.line}호선 ({s.stationCode})</option>)}
     </select>
    </label>
    <label>습득일 기간
     <select value={days} onChange={e=>setDays(e.target.value)} disabled={isRunning}>
      <option value="30">최근 30일 (오늘 포함)</option>
      <option value="7">최근 7일 (오늘 포함)</option>
     </select>
    </label>
    <div className="ldt-controls">
     <button className="ldt-primary" type="button" disabled={isRunning} onClick={run}>{status==='idle'?'실시간 조회 시작':'새로 조회하기'}</button>
     {isRunning&&<button className="ldt-stop" type="button" onClick={cancel}>중단</button>}
    </div>
   </div>
   <p className="ldt-explain">선택 역사: <strong>{station?.names.ko||'—'}</strong> · 경찰서·파출소는 제외하고 해당 역사 보관기관만 확인해요. API 조회량이 많으면 시간이 걸릴 수 있습니다.</p>
  </section>
  <section className="ldt-results">
   <div className="ldt-headline"><div><small>실시간 수집 현황</small><h2>{stateLabel}</h2></div><span className={'ldt-status ldt-'+status}>{status==='done'?'완료':status==='running'?'진행 중':status==='idle'?'대기':'부분 결과'}</span></div>
   {status!=='idle'&&<>
    <div className="ldt-metrics">
     <div><small>서울 전체 원본 기록</small><strong>{formatNumber(stats.total)}<em>건</em></strong></div>
     <div><small>현재 확인한 원본</small><strong>{formatNumber(stats.scanned)}<em>건</em></strong></div>
     <div><small>선택 역사 일치·미종결</small><strong className="ldt-accent">{formatNumber(items.length)}<em>건</em></strong></div>
     <div><small>경과 시간</small><strong>{stats.seconds.toFixed(1)}<em>초</em></strong></div>
    </div>
    <div className="ldt-progress-top"><span>조회 진행률 · {formatNumber(stats.pages)} / {formatNumber(stats.totalPages)} 페이지</span><strong>{percentage}%</strong></div>
    <div className="ldt-bar"><div style={{width:percentage+'%'}}/></div>
    <div className="ldt-detail-line"><span>{stats.start} ~ {stats.end}</span><span>조회 상한 {formatNumber(stats.maxPages)}페이지</span><span>종결 제외 {formatNumber(stats.closed)}건</span></div>
    {status==='running'&&<p className="ldt-info">뒤 페이지도 자동으로 조회 중입니다. 아직 결과가 없더라도 검색을 완료한 것은 아닙니다.</p>}
    {status==='partial'&&<p className="ldt-warn">조회 상한에 도달했어요. 이 결과는 30일 전체 조회가 아니며, 빠진 기록이 있을 수 있습니다.</p>}
    {status==='error'&&<p className="ldt-warn">원본 API를 끝까지 확인하지 못했습니다. 오류 코드: {failure}. 현재 수치는 부분 결과이며 정확한 전체 건수로 사용할 수 없습니다.</p>}
    {status==='cancelled'&&<p className="ldt-warn">조회가 중단됐어요. 현재 수치는 부분 결과입니다.</p>}
    {status==='done'&&<p className="ldt-ok">LOST112에서 이 시점에 제공한 서울 지역 해당 기간의 모든 페이지를 조회했습니다. 원본 등록 지연·변경 가능성은 별도입니다.</p>}
    {stats.warning&&<p className="ldt-warn">원본의 총건수·페이지 크기가 조회 도중 달라졌습니다. 전체 조회로 검증할 수 없습니다.</p>}
   </>}
   {status==='idle'?<div className="ldt-placeholder">상단의 <b>실시간 조회 시작</b>을 누르면 실제 LOST112 API에서 데이터를 가져옵니다.</div>:
    <div className="ldt-list">
     <div className="ldt-list-title"><h3>{station?.names.ko||'선택 역사'} 조회 결과</h3><span>{formatNumber(items.length)}건 {status==='done'?'확정된 조회 범위':'발견됨'}</span></div>
     {items.length?items.slice(0,150).map((item,i)=><article className="ldt-item" key={itemKey(item)}>
      <div className="ldt-number">{i+1}</div><div className="ldt-item-body">
       <div className="ldt-item-heading"><strong>{item.title}</strong><span>{item.date}</span></div>
       <p>{item.place}{item.category?' · '+item.category:''}{item.custody?' · '+item.custody:''}</p>
      </div></article>):<div className="ldt-no-items">{isRunning?'일치하는 기록을 계속 찾고 있습니다.':status==='done'?'조회된 전체 기록에서 해당 역사에 일치하는 물건이 없습니다.':'현재까지 확인된 물건이 없습니다.'}</div>}
     {items.length>150&&<p className="ldt-info">화면에는 최근 150건만 표시합니다. 집계 수치에는 전체 일치 기록을 포함했습니다.</p>}
    </div>}
  </section>
  <footer className="ldt-footer">검증용 페이지 · 원본 제공: LOST112 공공데이터 · 실제 방문 전 최신 보관상태를 확인하세요. <a href="/v2">V2 홈</a></footer>
 </div></main>;
}
