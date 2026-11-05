'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import graph from '../../data/trainLostGraph.json';
import {trainStationKey,trainStationDisplay} from '../../lib/train-lost';

const ROUTE_PRESETS={
  1:[['연천 ~ 인천','연천','인천'],['연천 ~ 신창','연천','신창'],['광명 지선','구로','광명'],['서동탄 지선','병점','서동탄']],
  2:[['본선 순환','ring','시청','을지로입구'],['성수 지선','성수','신설동'],['신도림 지선','신도림','까치산']],
  3:[['대화 ~ 오금','대화','오금']],4:[['진접 ~ 오이도','진접','오이도']],
  5:[['방화 ~ 하남검단산','방화','하남검단산'],['방화 ~ 마천','방화','마천']],
  6:[['신내 ~ 응암','신내','응암'],['응암 순환','ring','응암','역촌']],
  7:[['장암 ~ 석남','장암','석남']],8:[['암사 ~ 모란','암사','모란']],
  9:[['개화 ~ 중앙보훈병원','개화','중앙보훈병원']]
};
const LINE_COLOR={1:'#2367cb',2:'#21a269',3:'#db8843',4:'#4cb9d6',5:'#9466d1',6:'#ae8b59',7:'#7d9861',8:'#ed72a1',9:'#af9d65'};
const START={1:'종로5가',2:'시청',3:'종로3가',4:'동대문',5:'광화문',6:'공덕',7:'고속터미널',8:'잠실',9:'여의도'};
const TRAIN_STATES={'0':'진입','1':'도착','2':'출발','3':'운행 중'};
const currentTime=iso=>{
 if(!iso||!Number.isFinite(Date.parse(iso)))return '—';
 return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(iso));
};
function findRoute(adj,start,end){
 if(!adj[start]||!adj[end])return [];
 const queue=[start],previous=new Map([[start,null]]);
 for(let i=0;i<queue.length;i++){
  const node=queue[i];if(node===end)break;
  for(const next of adj[node]||[]){if(previous.has(next))continue;previous.set(next,node);queue.push(next);}
 }
 if(!previous.has(end))return [];
 const route=[];for(let at=end;at!==null;at=previous.get(at)){route.push(at);if(at===start)break;}
 return route.reverse();
}
function canReach(adj,from,to,blocked){
 const queue=[from],seen=new Set([from]);
 for(let i=0;i<queue.length;i++){
  const at=queue[i];if(at===to)return true;
  for(const next of adj[at]||[]){
   if(next!==to&&blocked.has(next)||seen.has(next))continue;
   seen.add(next);queue.push(next);
  }
 }
 return false;
}
function ringRoute(adj,start,first){
 if(!adj[start]?.includes(first))return [];
 const used=new Set([start]),route=[start];let previous=start,here=first;
 for(let i=0;i<100;i++){
  if(here===start)return route;
  if(!here||used.has(here))break;
  route.push(here);used.add(here);
  const options=(adj[here]||[]).filter(next=>next!==previous&&(next===start||!used.has(next)));
  const next=options.find(candidate=>candidate===start?route.length>4:canReach(adj,candidate,start,used));
  previous=here;here=next;
 }
 return route;
}
function buildRoutes(line){
 const adj=graph[line+'호선']||{};
 return (ROUTE_PRESETS[line]||[]).map(spec=>{
  const stations=spec[1]==='ring'?ringRoute(adj,spec[2],spec[3]):findRoute(adj,spec[1],spec[2]);
  return {label:spec[0],stations,circular:spec[1]==='ring'};
 }).filter(route=>route.stations.length>1);
}
const keyFor=p=>String(p.trainNo||'')+'/'+String(p.direction||'');
function TrainIcon({express=false}){
 return <svg aria-hidden="true" viewBox="0 0 22 25" width="20" height="22" fill="none">
  <rect x="3" y="1" width="16" height="19" rx="5" fill={express?'#fbd49d':'#a4edd3'} stroke={express?'#e99e42':'#29a278'} strokeWidth="1.3"/>
  <rect x="6" y="4" width="10" height="8" rx="2" fill="#164f53" opacity=".86"/>
  <path d="M7 16h2M13 16h2M7 20l-2 3M15 20l2 3" stroke="#c8f5ea" strokeWidth="1.7" strokeLinecap="round"/>
 </svg>;
}
export default function LiveRailDemo(){
 const [line,setLine]=useState(1),[routeIndex,setRouteIndex]=useState(0),[mode,setMode]=useState('near');
 const [focus,setFocus]=useState('종로5가'),[search,setSearch]=useState('');
 const [expanded,setExpanded]=useState({}),[selected,setSelected]=useState(null);
 const [snapshot,setSnapshot]=useState({positions:[],fetchedAt:null,partial:false}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const railRef=useRef(null),targetRef=useRef(null),refreshRef=useRef(()=>{});
 const routes=useMemo(()=>buildRoutes(line),[line]),route=routes[routeIndex]||routes[0]||{label:'',stations:[],circular:false};
 const stations=route.stations,defaultFocus=START[line];
 const focusStation=stations.includes(focus)?focus:stations.includes(defaultFocus)?defaultFocus:stations[Math.floor(stations.length/2)];
 const focusIndex=stations.indexOf(focusStation);
 const visible=mode==='full'?stations:stations.slice(Math.max(0,focusIndex-5),Math.min(stations.length,focusIndex+7));
 const fresh=useMemo(()=>{
  const byKey=new Map();
  const now=Date.now();
  for(const raw of snapshot.positions||[]){
   const timestamp=Date.parse(raw.receivedAt);
   if(!Number.isFinite(timestamp)||now-timestamp>180000||timestamp-now>60000)continue;
   if(!['0','1'].includes(String(raw.direction)))continue;
   const p={...raw,station:trainStationKey(line,raw.station)};
   const k=keyFor(p),prior=byKey.get(k);
   if(!prior||timestamp>Date.parse(prior.receivedAt))byKey.set(k,p);
  }
  return [...byKey.values()];
 },[snapshot.positions,line]);
 const onPath=useMemo(()=>fresh.filter(p=>stations.includes(p.station)),[fresh,stations]);
 const grouped=useMemo(()=>{
  const result=new Map();
  for(const p of onPath){
   const k=p.station+'|'+p.direction;
   if(!result.has(k))result.set(k,[]);
   result.get(k).push(p);
  }
  for(const list of result.values())list.sort((a,b)=>String(a.trainNo).localeCompare(String(b.trainNo),'ko',{numeric:true}));
  return result;
 },[onPath]);
 const chosen=selected?fresh.find(p=>keyFor(p)===selected):null;
 const trainCount0=fresh.filter(p=>p.direction==='0').length,trainCount1=fresh.filter(p=>p.direction==='1').length;
 function chooseLine(next){
  setLine(next);setRouteIndex(0);setFocus(START[next]);setSelected(null);setExpanded({});setSearch('');
 }
 function chooseRoute(next){
  setRouteIndex(next);setMode('near');setFocus(START[line]);setSelected(null);setExpanded({});setSearch('');
 }
 useEffect(()=>{
  const viewport=railRef.current,target=targetRef.current;
  if(!viewport||!target)return;
  const v=viewport.getBoundingClientRect(),n=target.getBoundingClientRect();
  viewport.scrollTop=Math.max(0,viewport.scrollTop+(n.top-v.top)-(viewport.clientHeight-n.height)/2);
 },[line,routeIndex,mode,focusStation]);
 useEffect(()=>{
  let stopped=false,inflight=null,last=0;
  async function load(force=false){
   if(stopped||inflight||!force&&document.visibilityState!=='visible')return;
   if(force&&Date.now()-last<1500)return;
   last=Date.now();
   const controller=new AbortController();inflight=controller;
   setLoading(true);
   try{
    const res=await fetch('/api/v2/live-rail-demo?line='+line,{cache:'no-store',signal:controller.signal});
    const data=await res.json();
    if(!res.ok||!data.ok||!Array.isArray(data.positions))throw Error(data.error||'API');
    if(!stopped&&!controller.signal.aborted){setSnapshot(data);setError('');}
   }catch{
    if(!stopped&&!controller.signal.aborted)setError('실시간 위치를 가져오지 못했어요. 다시 조회해 주세요.');
   }finally{
    if(inflight===controller)inflight=null;
    if(!stopped)setLoading(false);
   }
  }
  refreshRef.current=()=>load(true);
  setSnapshot({positions:[],fetchedAt:null,partial:false});setError('');
  void load();
  const interval=setInterval(()=>void load(),20000);
  const visibility=()=>{if(document.visibilityState==='visible')void load();else inflight?.abort();};
  document.addEventListener('visibilitychange',visibility);
  return()=>{stopped=true;inflight?.abort();clearInterval(interval);document.removeEventListener('visibilitychange',visibility);};
 },[line]);
 function focusOn(station){
  setFocus(station);setMode('near');setSearch('');setSelected(null);
 }
 const searchMatches=search.trim()?stations.filter(s=>trainStationDisplay(line,s).includes(search.trim())).slice(0,6):[];
 function trainButton(p){
  const isSelected=keyFor(p)===selected;
  return <button key={keyFor(p)} className={'lr-train'+(isSelected?' is-selected':'')} type="button"
   title={(p.destination||'행선지 미확인')+'행 · '+p.trainNo+' · '+(TRAIN_STATES[p.status]||'위치 보고')}
   aria-pressed={isSelected} onClick={()=>setSelected(isSelected?null:keyFor(p))}>
   <TrainIcon express={p.express}/>
   <span className="lr-train-copy"><b>{p.destination||'행선지 미확인'}</b><small>{p.trainNo}{p.express?' · 급행':''}</small></span>
  </button>;
 }
 function lane(station,direction){
  const items=grouped.get(station+'|'+direction)||[];
  const groupId=station+'|'+direction,open=Boolean(expanded[groupId]);
  if(!items.length)return <span className="lr-track-empty" aria-hidden="true">·</span>;
  const limit=open?items.length:2;
  return <div className="lr-train-stack">{items.slice(0,limit).map(trainButton)}
   {!open&&items.length>2&&<button className="lr-stack-more" type="button" onClick={()=>setExpanded(prev=>({...prev,[groupId]:true}))}>+{items.length-2}대</button>}
  </div>;
 }
 return <div className="lr-demo" style={{'--lr-line':LINE_COLOR[line]}}>
  <header className="lr-topbar"><a className="lr-back" href="/v2?view=live" aria-label="V2로 돌아가기">←</a><div className="lr-logo"><span className="lr-logo-mark">↗</span><span>METRO <b>FLOW</b></span><small>CONCEPT DEMO</small></div><span className="lr-top-tag">DESIGN LAB</span></header>
  <main className="lr-main">
   <section className="lr-hero">
    <div className="lr-hero-eyebrow"><span className="lr-live-dot"/> LIVE POSITION BOARD <span className="lr-demo-note">실제 역 단위 데이터</span></div>
    <h1>열차의 흐름을<br/><span>한눈에.</span></h1>
    <p>지금 어느 역에 열차가 있을까? 내 역 주변부터 호선 전체까지 한 화면에서 확인하세요.</p>
    <div className="lr-hero-bottom"><div><strong>{loading&&!snapshot.fetchedAt?'—':fresh.length}</strong><small>수신 열차 위치</small></div><div><strong>{currentTime(snapshot.fetchedAt)}</strong><small>최근 갱신 · KST</small></div><button type="button" onClick={()=>refreshRef.current()} disabled={loading}><span className={loading?'lr-spin':''}>↻</span> 새로고침</button></div>
   </section>
   <section className="lr-controls">
    <div className="lr-section-head"><strong>호선 선택</strong><span>LINE SELECTOR · 01 — 09</span></div>
    <div className="lr-lines" role="group" aria-label="호선 선택">{Array.from({length:9},(_,i)=>i+1).map(n=>
     <button type="button" key={n} className={'lr-line-button'+(line===n?' active':'')} style={{'--chip-color':LINE_COLOR[n]}} aria-pressed={line===n} onClick={()=>chooseLine(n)}>{n}</button>
    )}</div>
    <div className="lr-section-head lr-route-heading"><strong>운행 구간</strong><span>분기 노선 선택</span></div>
    <div className="lr-route-pills" role="group" aria-label="운행 구간">{routes.map((r,i)=><button type="button" key={r.label} aria-pressed={i===routeIndex} className={'lr-route-pill'+(i===routeIndex?' active':'')} onClick={()=>chooseRoute(i)}>{r.label}</button>)}</div>
   </section>
   <section className="lr-board-panel">
    <div className="lr-board-heading"><div><div className="lr-board-kicker">LIVE RAIL VIEW</div><h2>{line}호선 <span>운행 현황</span></h2></div><span className="lr-board-tag">{route.stations.length}개 역</span></div>
    <div className="lr-mode-switch" role="group" aria-label="노선도 표시 범위">
     <button type="button" className={mode==='near'?'active':''} aria-pressed={mode==='near'} onClick={()=>setMode('near')}>◎ 내 역 주변</button>
     <button type="button" className={mode==='full'?'active':''} aria-pressed={mode==='full'} onClick={()=>setMode('full')}>▥ 구간 전체</button>
    </div>
    <div className="lr-tools">
     <label className="lr-station-control"><span>기준역</span><select value={focusStation} onChange={e=>focusOn(e.target.value)}>{stations.map(s=><option key={s} value={s}>{trainStationDisplay(line,s)}</option>)}</select></label>
     <button type="button" className="lr-center" onClick={()=>{setFocus(stations.includes(START[line])?START[line]:focusStation);setMode('near');}}>◎ 기본역으로</button>
    </div>
    {mode==='full'&&<div className="lr-search-wrap"><span aria-hidden="true">⌕</span><input aria-label="노선에서 역 검색" placeholder="역 검색 후 해당 위치로 이동" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button type="button" onClick={()=>setSearch('')} aria-label="검색 지우기">×</button>}
     {searchMatches.length>0&&<div className="lr-search-results">{searchMatches.map(s=><button key={s} type="button" onClick={()=>focusOn(s)}>{trainStationDisplay(line,s)} <span>이동 ↗</span></button>)}</div>}
    </div>}
    <div className="lr-rail-legend"><span className="lr-dir-label"><b>↑</b> {line===2?'내선':'상행'} <small>{trainCount0}건</small></span><span className="lr-center-label">STATION</span><span className="lr-dir-label right"><b>↓</b> {line===2?'외선':'하행'} <small>{trainCount1}건</small></span></div>
    {error&&<div className="lr-error" role="alert">{error}</div>}
    <div className={'lr-rail-scroll'+(mode==='full'?' full':'')} ref={railRef} role="region" tabIndex={0} aria-label="열차 위치 노선도">
     {visible.map((name,index)=>{
      const activeStation=name===focusStation,anyTrain=(grouped.get(name+'|0')||[]).length+(grouped.get(name+'|1')||[]).length;
      return <div key={name+'-'+index} ref={activeStation?targetRef:null} className={'lr-stop'+(activeStation?' is-focus':'')} >
       <div className="lr-lane left">{lane(name,'0')}</div>
       <div className="lr-station"><span className="lr-node"/><strong>{trainStationDisplay(line,name)}</strong>{activeStation&&<small>기준역</small>}</div>
       <div className="lr-lane right">{lane(name,'1')}</div>
       {anyTrain>0&&<span className="lr-small-dot" aria-hidden="true"/>}
      </div>;
     })}
     {route.circular&&<div className="lr-loop-note">↻ 이 구간은 순환 노선입니다. 처음과 끝이 연결됩니다.</div>}
     {!visible.length&&<div className="lr-error">이 노선의 확인 가능한 경로가 없습니다.</div>}
    </div>
    <div className="lr-map-bottom"><span className="lr-source-dot"/> {onPath.length}개 열차 위치 표시 중 <span>· 역 단위 위치 / 정확한 GPS 아님</span></div>
    {snapshot.partial&&<div className="lr-error" role="status">공공데이터에서 일부 위치정보만 수신했습니다.</div>}
    {chosen&&<div className="lr-selected" role="region" aria-label="선택한 열차 상세">
     <div className="lr-selected-head"><span>SELECTED TRAIN · 선택한 열차</span><button type="button" onClick={()=>setSelected(null)} aria-label="열차 상세 닫기">×</button></div>
     <div className="lr-selected-main"><TrainIcon express={chosen.express}/><div><strong>{chosen.destination||'행선지 미확인'}행</strong><small>{chosen.trainNo}{chosen.express?' · 급행':''}</small></div><span className="lr-selected-state">{TRAIN_STATES[chosen.status]||'위치 보고'}</span></div>
     <div className="lr-selected-fields"><div><small>현재 보고된 역</small><b>{trainStationDisplay(line,chosen.station)}</b></div><div><small>수신 시간 (KST)</small><b>{currentTime(chosen.receivedAt)}</b></div></div>
     <p>실시간 역 단위 공공데이터 기준입니다. 열차의 정확한 역간 위치를 나타내지는 않습니다.</p>
    </div>}
    {selected&&!chosen&&<div className="lr-error">선택한 열차가 최신 위치 목록에 없습니다. 다시 선택해 주세요. <button onClick={()=>setSelected(null)} type="button">닫기</button></div>}
   </section>
   <footer className="lr-footer"><p><b>METRO FLOW</b> — Subway AI Guide 개편 검토용 인터랙티브 데모</p><p>실제 공공데이터 사용 · 20초마다 갱신 · 운행 상태와 행선지는 데이터 제공기관의 표기를 기반으로 합니다. 노선 분기와 차량 위치는 역사 내 안내용 확인이 필요합니다.</p><a href="/v2?view=live">기존 V2 실시간 열차정보로 돌아가기 ↗</a></footer>
  </main>
 </div>;
}
