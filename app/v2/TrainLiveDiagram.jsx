'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {followStops,stationNeighbors,expectedLiveDirection} from '../lib/train-lost';
import {stationName} from '../lib/stationNameI18n';

const clean=value=>String(value||'').trim().replace(/역$/,'');
const trainKey=value=>String(value||'').trim().replace(/^0+(?=\d)/,'');
const getTime=(iso,lang)=>iso?new Intl.DateTimeFormat(lang==='ko'?'ko-KR':'en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(iso)):'—';
const words={
 ko:{title:'실시간 열차 위치',hint:'하차역을 기준으로 후보 열차의 움직임을 확인하고 선택하세요.',opposite:'반대 방향',forward:'선택한 방향',alighted:'하차역',candidate:'후보',selected:'선택',manual:'새로고침',refresh:'20초마다 자동 업데이트',pending:'실시간 정보 갱신 중',error:'실시간 위치를 갱신하지 못했습니다. 기존 위치를 보여줍니다.',last:'최근 갱신',noTrains:'이 구간에 표시할 열차가 없습니다.',uncertain:'위치는 역 단위 공공데이터로 갱신됩니다. 열차의 정확한 역간 위치나 과거 통과역은 확정할 수 없습니다.',unknown:'노선 분기점 이후 경로는 표시가 제한될 수 있습니다.'},
 en:{title:'Live train positions',hint:'Watch candidate trains around your station, then tap one.',opposite:'Other direction',forward:'Chosen direction',alighted:'Your stop',candidate:'Candidate',selected:'Selected',manual:'Refresh',refresh:'Auto-refresh every 20s',pending:'Refreshing…',error:'Live data could not refresh. Showing last positions.',last:'Updated',noTrains:'No trains reported in this section.',uncertain:'Positions update by station, not GPS. Past stop history is not confirmed.',unknown:'Branches may limit the visible route.'},
 ja:{title:'リアルタイム列車位置',hint:'候補列車の位置を確認し、選択してください。',opposite:'反対方向',forward:'選択方向',alighted:'下車駅',candidate:'候補',selected:'選択済',manual:'更新',refresh:'20秒ごとに更新',pending:'更新中…',error:'更新できませんでした。以前の位置を表示します。',last:'更新',noTrains:'この区間に列車はありません。',uncertain:'位置は駅単位で更新されます。GPSや過去の通過駅ではありません。',unknown:'分岐区間は一部表示できません。'},
 zh:{title:'实时列车位置',hint:'查看候选列车的位置，然后选择。',opposite:'反方向',forward:'所选方向',alighted:'下车站',candidate:'候选',selected:'已选择',manual:'刷新',refresh:'每20秒更新',pending:'更新中…',error:'实时更新失败，显示上次位置。',last:'更新于',noTrains:'此区间暂无列车。',uncertain:'位置按车站更新，并非GPS定位或历史经过记录。',unknown:'分支线路可能无法完整显示。'}
};

function mapStations(line,station,next){
 const forward=followStops(line,station,next,20);
 const behindOptions=stationNeighbors(line,station).filter(s=>s!==next);
 const required=expectedLiveDirection(line,station,next);
 const behind=behindOptions.filter(st=>expectedLiveDirection(line,st,station)===required);
 const prev=behind.length===1?behind[0]:behindOptions.length===1?behindOptions[0]:null;
 const backwards=prev?followStops(line,station,prev,6).stops.slice(0,5).reverse():[];
 return {stops:[...backwards,clean(station),...forward.stops.slice(0,16)],ambiguous:forward.ambiguous};
}
function latestTrains(positions,line){
 const map=new Map();
 for(const p of positions||[]){
  if(Number(p.line)!==Number(line)||!p.trainNo||!['0','1'].includes(String(p.direction)))continue;
  const key=trainKey(p.trainNo)+'/'+p.direction;
  const previous=map.get(key);
  if(!previous||Date.parse(p.receivedAt)>Date.parse(previous.receivedAt))map.set(key,p);
 }
 return [...map.values()];
}
export default function TrainLiveDiagram({line,station,next,lang='ko',positions=[],fetchedAt,candidates=[],selected,active=true,demo=false,onSnapshot,onPick,onRestart}){
 const t=words[lang]||words.ko;
 const [refreshing,setRefreshing]=useState(false),[error,setError]=useState(false);
 const viewportRef=useRef(null);
 const [lastPoll,setLastPoll]=useState(null);
 const onSnapshotRef=useRef(onSnapshot);
 const positionsRef=useRef(positions);
 useEffect(()=>{positionsRef.current=positions;},[positions]);
 useEffect(()=>{onSnapshotRef.current=onSnapshot;},[onSnapshot]);
 const path=useMemo(()=>mapStations(line,station,next),[line,station,next]);
 const direction=expectedLiveDirection(line,station,next);
 const trains=useMemo(()=>latestTrains(positions,line),[positions,line]);
 const candidateByNumber=useMemo(()=>new Map(candidates.map(c=>[trainKey(c.number),c])),[candidates]);
 const selectedNo=selected?trainKey(selected.number):null;
 const displayed=useMemo(()=>new Set(path.stops),[path.stops]);
 const hasTrains=trains.some(p=>displayed.has(clean(p.station)));
 useEffect(()=>{
  const viewport=viewportRef.current;
  const origin=viewport?.querySelector('[data-tf-origin="true"]');
  if(!viewport||!origin)return;
  const delta=origin.getBoundingClientRect().top-viewport.getBoundingClientRect().top;
  viewport.scrollTop+=Math.max(0,delta-100);
 },[line,station,next]);
 const pollRef=useRef(null);
 const advanceDemo=()=>{
  const at=new Date().toISOString();
  const advanced=positionsRef.current.map(p=>{
   const index=path.stops.indexOf(clean(p.station));
   if(index<0)return {...p,receivedAt:at};
   const delta=String(p.direction)===String(direction)?1:-1;
   const target=Math.max(0,Math.min(path.stops.length-1,index+delta));
   return {...p,station:path.stops[target],receivedAt:at};
  });
  positionsRef.current=advanced;
  onSnapshotRef.current?.(advanced,at);
  setLastPoll(at);setError(false);
 };
 useEffect(()=>{
  if(!active)return;
  if(demo){
   const timer=setInterval(()=>advanceDemo(),20000);
   return ()=>clearInterval(timer);
  }
  let gone=false;
  async function poll(){
   if(pollRef.current)return;
   const controller=new AbortController();pollRef.current=controller;
   setRefreshing(true);
   try{
    const response=await fetch('/api/v2/train-lost/position?line='+line,{cache:'no-store',signal:controller.signal});
    const data=await response.json();
    if(!response.ok||!data.ok)throw Error(data.error||'LIVE_API');
    if(!gone){onSnapshotRef.current?.(data.positions||[],data.fetchedAt);setLastPoll(new Date().toISOString());setError(false);}
   }catch(ex){if(!gone&&!controller.signal.aborted)setError(true);}
   finally{if(!gone)setRefreshing(false);pollRef.current=null;}
  }
  const timer=setInterval(poll,20000);
  return()=>{gone=true;clearInterval(timer);pollRef.current?.abort();pollRef.current=null;};
 },[active,line,station,next,demo]);
 const refresh=async()=>{
  if(demo){advanceDemo();return;}
  if(refreshing)return;
  setRefreshing(true);
  try{
   const response=await fetch('/api/v2/train-lost/position?line='+line,{cache:'no-store'});
   const data=await response.json();
   if(!response.ok||!data.ok)throw Error('LIVE_API');
   onSnapshotRef.current?.(data.positions||[],data.fetchedAt);setLastPoll(new Date().toISOString());setError(false);
  }catch{setError(true);}finally{setRefreshing(false);}
 };
 const renderTrain=(p,selectedLane)=>{
  const number=trainKey(p.trainNo),cand=selectedLane?candidateByNumber.get(number):null;
  const isSelected=selectedLane&&selectedNo===number;
  const tooltip=(p.destination?clean(p.destination)+' · ':'')+p.trainNo+' · '+getTime(p.receivedAt,lang);
  const content=<><span className="tf-train-icon" aria-hidden="true">▣</span><span className="tf-train-number">{p.trainNo}</span>{p.destination&&<span className="tf-train-destination">{clean(p.destination)}</span>}{cand&&<span className="tf-train-candidate">{isSelected?t.selected:t.candidate}</span>}</>;
  return cand?<button key={number+'-'+p.direction} type="button" title={tooltip}
   className={'tf-train tf-train-pick'+(isSelected?' tf-train-picked':'')}
   aria-pressed={isSelected} aria-label={p.trainNo+' '+t.candidate+' '+clean(p.station)}
   onClick={()=>onPick(cand)}>{content}</button>:
   <div key={number+'-'+p.direction} title={tooltip} className="tf-train tf-train-other">{content}</div>;
 };
 return <section className="tf-board-section" aria-label={t.title}>
   <div className="tf-board-heading">
    <div><h3>{t.title}</h3><p>{t.hint}</p></div>
    <button className="tf-board-back" onClick={onRestart} type="button">{lang==='ko'?'조건 변경':lang==='en'?'Edit search':lang==='ja'?'条件変更':'修改条件'}</button>
   </div>
   <div className="tf-board-summary">
    <span><span className="tf-board-dot"/> {t.candidate} <strong>{candidates.length}</strong></span>
    {selected&&<span>{lang==='ko'?'선택한 열차':t.selected}: <strong>#{selected.number}</strong></span>}
    <span>{t.last}: <strong>{getTime(fetchedAt||lastPoll,lang)}</strong></span>
    <button onClick={refresh} disabled={refreshing} type="button">{refreshing?t.pending:'↻ '+t.manual}</button>
   </div>
   {error&&<p className="tf-warning" role="status">{t.error}</p>}
   <div className="tf-board" role="group" aria-label={t.title}>
    <div className="tf-board-columns"><span>↑ {t.opposite}</span><span>↓ {t.forward}</span><span>{line} {lang==='ko'?'호선':'Line'}</span></div>
    <div className="tf-board-viewport" ref={viewportRef}>
      {path.stops.map((s,index)=>{
       const left=trains.filter(p=>clean(p.station)===s&&String(p.direction)!==String(direction));
       const right=trains.filter(p=>clean(p.station)===s&&String(p.direction)===String(direction));
       return <div key={s+'-'+index} data-tf-origin={s===clean(station)?"true":undefined} className={'tf-board-row'+(s===clean(station)?' tf-board-origin':'')}>
        <div className="tf-board-track tf-board-track-muted"><div className="tf-board-sleeper"/>{left.map(p=>renderTrain(p,false))}</div>
        <div className="tf-board-track tf-board-track-main"><div className="tf-board-sleeper"/>{right.map(p=>renderTrain(p,true))}</div>
        <div className="tf-board-station"><span className="tf-board-station-name">{stationName(s,lang)||s}</span>{s===clean(station)&&<span className="tf-board-alighted">{t.alighted}</span>}</div>
       </div>;
      })}
    </div>
    {!hasTrains&&<div className="tf-board-empty">{t.noTrains}</div>}
   </div>
   <div className="tf-board-caption"><span className="tf-board-refresh-dot"/> {demo?(lang==='ko'?'DEMO · 20초마다 가상 열차 위치 이동':'DEMO · Fictional train moves every 20s'):t.refresh} · {t.uncertain}{path.ambiguous?' '+t.unknown:''}</div>
   {!!candidates.length&&!selected&&<p className="tf-board-choice">{lang==='ko'?'테두리가 강조된 후보 열차를 눌러 선택해 주세요.':lang==='en'?'Tap a highlighted candidate train to select.':lang==='ja'?'強調表示された候補列車を選択してください。':'点击高亮的候选列车进行选择。'}</p>}
 </section>;
}
