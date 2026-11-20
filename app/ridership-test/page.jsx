'use client';
import {useEffect,useMemo,useState} from 'react';
import {stationMaster} from '../lib/station-master';
import './ridership.css';

const number=new Intl.NumberFormat('ko-KR');
function kstDay(days=0){
 const d=new Date(Date.now()+9*3600000+days*86400000);
 return [d.getUTCFullYear(),String(d.getUTCMonth()+1).padStart(2,'0'),String(d.getUTCDate()).padStart(2,'0')].join('');
}
const fmt=n=>number.format(n||0);
const readableDate=d=>d?d.slice(0,4)+'.'+d.slice(4,6)+'.'+d.slice(6,8):'—';
const availableDays=()=>Array.from({length:7},(_,i)=>kstDay(-i));
const translations={
 INVALID_QUERY:'최근 7일 범위의 날짜와 올바른 역을 선택해 주세요.',
 KEY_NOT_CONFIGURED:'서버에 승하차 API 인증키가 설정되지 않았습니다.',
 UPSTREAM_RESULT:'서울시 데이터 제공 서버에서 오류를 반환했습니다. 인증키 권한도 확인해 주세요.',
 UPSTREAM_SCHEMA:'API 응답 형식이 예상과 다릅니다. 원본 서비스 규격을 확인해야 합니다.',
 UPSTREAM_HTTP:'서울시 API 서버에서 HTTP 오류가 발생했습니다.',
 NETWORK_ERROR:'서울시 API 서버에 연결할 수 없습니다.',
 TIMEOUT:'서울시 API 응답시간이 초과되었습니다.',
 UPSTREAM_LIMIT:'조회 건수가 테스트용 페이지 제한을 초과했습니다.',
 UPSTREAM_FILTER_MISMATCH:'API가 선택한 역과 다른 역의 데이터를 반환했습니다.',
 UPSTREAM_UNAVAILABLE:'API 조회 과정에서 오류가 발생했습니다.'
};
const suggestions=[
 {number:'01',title:'역사별 시간대 수요 안내',flag:'1순위',detail:'기준역을 선택하면 최근 승하차 실적을 바탕으로 이용객이 집중되는 시간대를 안내. 현재 혼잡도가 아닌 과거 실적임을 명확히 표시'},
 {number:'02',title:'역무 관리자 분석 화면',flag:'2순위',detail:'승차·하차 피크, 시간대별 순유입, 평일·주말 차이를 축적 분석하여 인력 배치와 반복 문의 대응에 활용'},
 {number:'03',title:'기존 열차 혼잡도와 교차 활용',flag:'검증 후',detail:'지금의 열차 내 4분할 혼잡도는 그대로 유지. 역 승하차 수요를 별도 지표로 추가해 혼동을 방지'},
 {number:'04',title:'추세 분석용 데이터 축적',flag:'중장기',detail:'원천 API는 최근 7일만 제공. 장기 추세·요일 평균·행사 효과 분석을 위해 일 단위 집계의 정기 저장 필요'}
];
const sum=x=>x.board+x.alight;
export default function RidershipTest(){
 const stations=useMemo(()=>stationMaster.filter(s=>/^[1-8]$/.test(s.line)&&/^\d{3,5}$/.test(s.stationCode)),[]);
 const [station,setStation]=useState('0154');
 const [line,setLine]=useState('1');
 const [query,setQuery]=useState('');
 const [date,setDate]=useState(()=>kstDay(-1));
 const [data,setData]=useState(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [submitted,setSubmitted]=useState(null);
 const [tab,setTab]=useState('hourly');
 const [rawOpen,setRawOpen]=useState(false);
 const [metric,setMetric]=useState('both');
 const [limit,setLimit]=useState(40);
 const choices=useMemo(()=>stations.filter(s=>s.line===line&&(s.names.ko||'').includes(query.trim())).slice(0,80),[stations,line,query]);
 const current=stations.find(s=>s.stationCode===station);
 const dates=availableDays();
 useEffect(()=>{
   const params=new URLSearchParams(window.location.search);
   const code=params.get('station');
   const d=params.get('date');
   if(code&&stations.some(s=>s.stationCode===code)){
     setStation(code);setLine(stations.find(s=>s.stationCode===code).line);
   }
   if(dates.includes(d))setDate(d);
 },[stations]);
 useEffect(()=>{
   let cancelled=false;
   const controller=new AbortController();
   setLoading(true);setError('');setData(null);
   fetch('/api/ridership-test?station='+encodeURIComponent(station)+'&date='+encodeURIComponent(date),{cache:'no-store',signal:controller.signal})
    .then(async response=>{
      const body=await response.json().catch(()=>({ok:false,error:'UPSTREAM_SCHEMA'}));
      if(!response.ok||!body.ok)throw Error(body.error||'UPSTREAM_UNAVAILABLE');
      return body;
    }).then(payload=>{if(!cancelled){setData(payload);setSubmitted({station,date});}})
      .catch(e=>{if(!cancelled&&e.name!=='AbortError'){setError(translations[e.message]||e.message||'데이터 조회에 실패했습니다.');setSubmitted({station,date});}})
      .finally(()=>{if(!cancelled)setLoading(false);});
   return()=>{cancelled=true;controller.abort();};
 },[station,date,limit]);
 function selectStation(code){
   setStation(code);setQuery('');
   const url=new URL(window.location.href);url.searchParams.set('station',code);history.replaceState(null,'',url.pathname+url.search);
 }
 function changeDate(v){
   setDate(v);
   const url=new URL(window.location.href);url.searchParams.set('date',v);history.replaceState(null,'',url.pathname+url.search);
 }
 const peak=data?.hourly?.reduce((a,b)=>sum(b)>sum(a)?b:a,{hour:'00',board:0,alight:0});
 const max=Math.max(1,...(data?.hourly||[]).map(r=>Math.max(r.board,r.alight)));
 const busiest=data?.hourly?.slice().sort((a,b)=>sum(b)-sum(a)).slice(0,3)||[];
 const hourRows=data?.hourly||[];
 const list=tab==='cards'?data?.cards:data?.users;
 return <main className="rider-page">
  <header className="rider-head">
   <div className="rider-head-inside">
    <div className="rider-kicker"><span className="rider-dot"/> SUBWAY AI GUIDE / DATA LAB</div>
    <h1>역별 승하차 데이터 <em>테스트</em></h1>
    <p>시간대별 이동 수요부터 플랫폼 적용 가능성까지, 서울교통공사 원본 데이터로 확인합니다.</p>
    <div className="rider-head-tags"><span>독립 테스트</span><span>실측 API</span><span>승객 화면 미적용</span></div>
   </div>
  </header>
  <div className="rider-content">
   <section className="rider-panel rider-select">
    <div className="rider-section-top"><div><span className="rider-label">01 · DATA EXPLORER</span><h2>조회 조건</h2></div><span className="rider-small">최근 7일 조회 가능</span></div>
    <div className="rider-filter-grid">
     <label>호선<select value={line} onChange={e=>{const n=e.target.value;setLine(n);const next=stations.find(s=>s.line===n);if(next)selectStation(next.stationCode);}}>
      {Array.from({length:8},(_,i)=><option key={i+1} value={String(i+1)}>{i+1}호선</option>)}
     </select></label>
     <label>기준역<select value={station} onChange={e=>selectStation(e.target.value)}>
       {stations.filter(s=>s.line===line).map(s=><option key={s.stationCode} value={s.stationCode}>{s.names.ko} · {s.stationCode}</option>)}
      </select></label>
     <label>통행일자<select value={date} onChange={e=>changeDate(e.target.value)}>
       {dates.map(d=><option value={d} key={d}>{readableDate(d)}{d===kstDay(-1)?' · 어제':''}</option>)}
      </select></label>
    </div>
    <div className="rider-quick"><span>빠른 선택</span>{['종로5가','강남','홍대입구','서울역'].map(name=>{
      const s=stations.find(x=>x.names.ko===name);
      return s?<button key={name} onClick={()=>{setLine(s.line);selectStation(s.stationCode);}} className={s.stationCode===station?'active':''}>{name}</button>:null;
    })}</div>
    <div className="rider-info-line">{loading?'원천 데이터를 조회하고 있습니다…':data?'조회 완료 · 원본 '+fmt(data.rowCount)+'행 · '+(data.cached?'서버 캐시':'실제 API'):'서울교통공사 getStnPsgr'}
     <button className="rider-refresh" onClick={()=>setLimit(x=>x+1)} disabled={loading}>↻ 다시 조회</button></div>
   </section>

   {error?<section className="rider-panel rider-error"><strong>조회 실패</strong><p>{error}</p><span>조회 날짜를 하루 전으로 바꾸거나, 다른 역을 선택해 확인해 주세요.</span></section>:null}
   {loading?<section className="rider-panel rider-loading"><div className="rider-spinner"/><strong>승하차 데이터를 분석하는 중입니다</strong><p>첫 조회는 원본 데이터 페이지 수에 따라 시간이 걸릴 수 있습니다.</p></section>:null}
   {data&&!loading?<><section className="rider-results">
      <div className="rider-result-head"><div><span className="rider-label">02 · RIDERSHIP SUMMARY</span><h2>{data.stationName||current?.names.ko||'선택역'} <small>{readableDate(data.date)}</small></h2></div><span className="rider-source">{data.lines.join(' · ')||current?.line+'호선'}</span></div>
      <div className="rider-kpis">
       <article className="rider-kpi"><span>총 승차</span><strong>{fmt(data.board)}<small>명</small></strong><i className="rider-swatch rider-in"/> </article>
       <article className="rider-kpi"><span>총 하차</span><strong>{fmt(data.alight)}<small>명</small></strong><i className="rider-swatch rider-out"/> </article>
       <article className="rider-kpi"><span>승하차 합계</span><strong>{fmt(data.total)}<small>명</small></strong><i className="rider-swatch rider-total"/> </article>
       <article className="rider-kpi"><span>하차−승차</span><strong className={data.net>0?'rider-positive':''}>{data.net>0?'+':''}{fmt(data.net)}<small>명</small></strong><span className="rider-tiny">{data.net>0?'순유입':data.net<0?'순유출':'동일'}</span></article>
      </div>
      {data.rowCount===0?<div className="rider-empty">선택한 날짜와 역에 해당하는 데이터가 없습니다. 최근 다른 날짜를 선택해 보세요.</div>:null}
      {data.rowCount>0?<section className="rider-panel rider-graph">
       <div className="rider-section-top"><div><span className="rider-label">03 · HOURLY FLOW</span><h2>시간대별 승하차</h2></div><div className="rider-legend"><span><i className="rider-swatch rider-in"/>승차</span><span><i className="rider-swatch rider-out"/>하차</span></div></div>
       <p className="rider-section-desc">수요가 집중되는 시간을 비교합니다. 막대 길이는 선택 일자의 인원 기준입니다.</p>
       <div className="rider-chart-scroller"><div className="rider-chart">
        {hourRows.map(r=><div className="rider-hourcol" key={r.hour} title={r.hour+'시 승차 '+fmt(r.board)+'명 / 하차 '+fmt(r.alight)+'명'}>
         <div className="rider-bars"><div className="rider-bar rider-in" style={{height:Math.max(2,r.board/max*100)+'%'}}/><div className="rider-bar rider-out" style={{height:Math.max(2,r.alight/max*100)+'%'}}/></div>
         <span>{r.hour}</span>
        </div>)}
       </div></div>
       <div className="rider-chart-bottom"><span>00시</span><span>시간대별 승하차 인원 (명)</span><span>23시</span></div>
      </section>:null}
      {data.rowCount>0?<div className="rider-insights">
       <article><span>최대 이용 시간대</span><strong>{peak?.hour}:00–{String((Number(peak?.hour||0)+1)%24).padStart(2,'0')}:00</strong><small>승하차 {fmt(sum(peak||{board:0,alight:0}))}명</small></article>
       <article><span>시간대 상위 3개</span><strong>{busiest.map(x=>x.hour+'시').join(' · ')}</strong><small>승차와 하차 합산 기준</small></article>
      </div>:null}
      {data.rowCount>0?<section className="rider-panel">
       <div className="rider-section-top"><div><span className="rider-label">04 · DETAILED DATA</span><h2>데이터 상세</h2></div></div>
       <div className="rider-tabs"><button className={tab==='hourly'?'selected':''} onClick={()=>setTab('hourly')}>시간대별</button><button className={tab==='cards'?'selected':''} onClick={()=>setTab('cards')}>교통카드</button><button className={tab==='users'?'selected':''} onClick={()=>setTab('users')}>이용자 구분</button></div>
       {tab==='hourly'?<div className="rider-table-wrap"><table><thead><tr><th>시간</th><th>승차</th><th>하차</th><th>하차−승차</th></tr></thead><tbody>{hourRows.map(r=><tr key={r.hour}><td>{r.hour}:00</td><td>{fmt(r.board)}</td><td>{fmt(r.alight)}</td><td>{r.alight-r.board>0?'+':''}{fmt(r.alight-r.board)}</td></tr>)}</tbody></table></div>:
        <div className="rider-table-wrap"><table><thead><tr><th>유형</th><th>승차</th><th>하차</th><th>합계</th></tr></thead><tbody>{(list||[]).map((r,i)=><tr key={r.name+'-'+i}><td>{r.name}</td><td>{fmt(r.board)}</td><td>{fmt(r.alight)}</td><td>{fmt(sum(r))}</td></tr>)}</tbody></table></div>}
       <p className="rider-footnote">자료 해석 시 주의: 역 승하차 집계는 승강장 체류 인원이나 열차의 실시간 혼잡률을 뜻하지 않습니다.</p>
      </section>:null}
      <section className="rider-panel rider-raw">
        <button className="rider-disclosure" onClick={()=>setRawOpen(x=>!x)} aria-expanded={rawOpen}><span><strong>원본 API 데이터 점검</strong><small>응답 항목 · 수집행 · 원천 갱신시각</small></span><b>{rawOpen?'접기 −':'열기 +'}</b></button>
        {rawOpen?<><div className="rider-meta"><span>조회한 행 <b>{fmt(data.rowCount)}</b></span><span>원천 전체 행 <b>{fmt(data.sourceTotal)}</b></span><span>응답시간 <b>{new Date(data.receivedAt).toLocaleString('ko-KR')}</b></span></div><pre>{JSON.stringify(data.sampleRows,null,2)}</pre></>:null}
      </section>
    </section></>:null}
    <section className="rider-apply">
     <div className="rider-section-top"><div><span className="rider-label">05 · APPLICATION PLAN</span><h2>우리 플랫폼에 적용한다면?</h2></div></div>
     <div className="rider-ideas">{suggestions.map(item=><article className="rider-idea" key={item.number}><div><b>{item.number}</b><span>{item.flag}</span></div><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
    </section>
    <footer className="rider-footer">출처: 서울교통공사 · 서울 열린데이터광장 <a href="https://data.seoul.go.kr/dataList/OA-22723/A/1/datasetView.do" target="_blank" rel="noreferrer">공식 API 문서 ↗</a><br/>연구·검증용 테스트 화면 · 실제 서비스 미연동</footer>
  </div>
 </main>;
}
