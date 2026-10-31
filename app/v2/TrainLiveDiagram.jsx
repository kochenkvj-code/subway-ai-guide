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
 // One-way diagram: start at the station where the passenger got off and
 // extend in the direction that the passenger actually selected.
 const forward=followStops(line,station,next,20);
 return {stops:[clean(station),...forward.stops.slice(0,16)],ambiguous:forward.ambiguous};
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
 const trains=useMemo(()=>latestTrains(positions,line).filter(p=>String(p.direction)===String(direction)),[positions,line,direction]);
 const candidateByNumber=useMemo(()=>new Map(candidates.map(c=>[trainKey(c.number),c])),[candidates]);
 const selectedNo=selected?trainKey(selected.number):null;
 const trackedStation=selectedNo?trains.find(p=>trainKey(p.trainNo)===selectedNo)?.station:null;
 const displayed=useMemo(()=>new Set(path.stops),[path.stops]);
 const hasTrains=trains.some(p=>displayed.has(clean(p.station)));
 useEffect(()=>{
  const viewport=viewportRef.current;
  const origin=viewport?.querySelector('[data-tf-origin="true"]');
  if(!viewport||!origin)return;
  // Horizontal scrolling is confined to the diagram, never the whole V2 page.
  const delta=origin.getBoundingClientRect().left-viewport.getBoundingClientRect().left;
  viewport.scrollLeft+=Math.max(0,delta-20);
 },[line,station,next]);
 useEffect(()=>{
  if(!trackedStation)return;
  const viewport=viewportRef.current;
  const target=[...(viewport?.querySelectorAll('[data-tf-station]')||[])].find(node=>node.dataset.tfStation===clean(trackedStation));
  if(!viewport||!target)return;
  const offset=target.getBoundingClientRect().left-viewport.getBoundingClientRect().left;
  viewport.scrollBy({left:offset-40,behavior:'smooth'});
 },[trackedStation,selectedNo,line,station,next]);
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
 const renderTrain=p=>{
  const number=trainKey(p.trainNo),cand=candidateByNumber.get(number);
  const isSelected=selectedNo===number;
  const tooltip=(p.destination?clean(p.destination)+' · ':'')+p.trainNo+' · '+getTime(p.receivedAt,lang);
  const content=<><span className="tf-train-icon" aria-hidden="true">▣</span><span className="tf-train-number">{p.trainNo}</span>{p.destination&&<span className="tf-train-destination">{clean(p.destination)}</span>}{cand&&<span className="tf-train-candidate">{isSelected?t.selected:t.candidate}</span>}</>;
  return cand?<button key={number+'-'+p.direction} type="button" title={tooltip}
   className={'tf-train tf-train-pick'+(isSelected?' tf-train-picked':'')}
   aria-pressed={isSelected} aria-label={p.trainNo+' '+t.candidate+' '+clean(p.station)}
   onClick={()=>onPick(cand)}>{content}</button>:
   <div key={number+'-'+p.direction} title={tooltip} className="tf-train tf-train-other">{content}</div>;
 };
 const toCandidates=()=>{
  const viewport=viewportRef.current;
  if(!viewport)return;
  const target=viewport.querySelector('[data-tf-candidate="true"]');
  if(!target)return;
  const difference=target.getBoundingClientRect().left-viewport.getBoundingClientRect().left;
  viewport.scrollBy({left:difference-35,behavior:'smooth'});
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
    <div className="tf-h-topline">
      <span><strong>{stationName(station,lang)||station}</strong> → {stationName(next,lang)||next} {lang==='ko'?'방면':lang==='en'?'direction':lang==='ja'?'方面':'方向'}</span>
      <span className="tf-h-swipe">← {lang==='ko'?'좌우로 밀어보기':lang==='en'?'Swipe sideways':lang==='ja'?'左右にスワイプ':'左右滑动'} →</span>
    </div>
    <div className="tf-board-viewport tf-board-horizontal" ref={viewportRef} tabIndex={0}>
      <div className="tf-h-flow" role="list">
        {path.stops.map((s,index)=>{
          const here=trains.filter(p=>clean(p.station)===s);
          const hasCandidate=here.some(p=>candidateByNumber.has(trainKey(p.trainNo)));
          return <div key={s+'-'+index} data-tf-origin={s===clean(station)?"true":undefined}
           data-tf-station={s} data-tf-candidate={hasCandidate?"true":undefined}
           className={'tf-h-stop'+(s===clean(station)?' tf-h-origin':'')} role="listitem">
           <div className="tf-h-trains">{here.map(renderTrain)}</div>
           <div className="tf-h-rail"><span className="tf-h-node"/></div>
           <div className="tf-h-name">{stationName(s,lang)||s}</div>
           <div className="tf-h-detail">{index===0?t.alighted:(lang==='ko'?index+'정거장':index+' stop'+(index===1?'':'s'))}</div>
          </div>;
        })}
      </div>
    </div>
    {!hasTrains&&<div className="tf-board-empty">{t.noTrains}</div>}
    {!!candidates.length&&<div className="tf-h-foot"><button type="button" onClick={toCandidates}>◎ {lang==='ko'?'후보 열차 위치로':lang==='en'?'Go to candidates':lang==='ja'?'候補列車へ':'前往候选列车'}</button></div>}
   </div>
   <div className="tf-board-caption"><span className="tf-board-refresh-dot"/> {demo?(lang==='ko'?'DEMO · 20초마다 가상 열차 위치 이동':'DEMO · Fictional train moves every 20s'):t.refresh} · {t.uncertain}{path.ambiguous?' '+t.unknown:''}</div>
   {!!candidates.length&&!selected&&<p className="tf-board-choice">{lang==='ko'?'테두리가 강조된 후보 열차를 눌러 선택해 주세요.':lang==='en'?'Tap a highlighted candidate train to select.':lang==='ja'?'強調表示された候補列車を選択してください。':'点击高亮的候选列车进行选择。'}</p>}
 </section>;
}
