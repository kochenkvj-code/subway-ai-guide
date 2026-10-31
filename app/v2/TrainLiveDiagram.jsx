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
 // Candidate search can return trains >16 stations from the origin (up to
 // 30 minutes ago). The map must cover the same 38-stop route as the matcher.
 const forward=followStops(line,station,next,38);
 return {stops:[clean(station),...forward.stops],ambiguous:forward.ambiguous};
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
 const [jumpStatus,setJumpStatus]=useState('');
 const [focusedTrain,setFocusedTrain]=useState('');
 const candidateJumpIndex=useRef(0);
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
 // Only candidates actually present in the current, direction-filtered
 // snapshot are navigable. A stale candidate must not be shown as live.
 // Preserve candidate ranking rather than picking the leftmost train every
 // time. Only stations currently present in the directional rail are jumpable.
 const visibleCandidates=useMemo(()=>candidates.map(c=>
   trains.find(p=>trainKey(p.trainNo)===trainKey(c.number)&&displayed.has(clean(p.station)))
 ).filter(Boolean),[candidates,trains,displayed]);
 // Scroll the horizontal rail AND the train stack inside an individual
 // station. A compact station may contain more trains than its vertical bay
 // can display; moving only sideways can leave the chosen train invisible.
 const centerTarget=node=>{
   const viewport=viewportRef.current;
   if(!viewport||!node)return false;
   const stationNode=node.closest('[data-tf-station]')||node;
   const box=stationNode.getBoundingClientRect(),frame=viewport.getBoundingClientRect();
   const desired=viewport.scrollLeft+(box.left-frame.left)+box.width/2-viewport.clientWidth/2;
   const maxLeft=Math.max(0,viewport.scrollWidth-viewport.clientWidth);
   // Direct scrollLeft assignment is reliable on iOS Safari, including when
   // a previous smooth scroll or touch gesture has not completed.
   viewport.scrollLeft=Math.max(0,Math.min(maxLeft,Math.round(desired)));
   const bay=node.closest('.tf-h-trains');
   if(bay&&bay.scrollHeight>bay.clientHeight){
     const trainBox=node.getBoundingClientRect(),bayBox=bay.getBoundingClientRect();
     const y=bay.scrollTop+(trainBox.top-bayBox.top)-(bay.clientHeight-trainBox.height)/2;
     bay.scrollTop=Math.max(0,Math.min(bay.scrollHeight-bay.clientHeight,Math.round(y)));
   }
   return true;
 };
 useEffect(()=>{candidateJumpIndex.current=0;setJumpStatus('');setFocusedTrain('');},[line,station,next,candidates]);
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
  centerTarget(target);
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
  const rawDestination=clean(p.destination||'').replace(/(?:방면|행)$/,'').trim();
  const translatedDestination=stationName(rawDestination,lang)||rawDestination;
  const destinationLabel=translatedDestination?
    (lang==='ko'?translatedDestination+'행':lang==='ja'?translatedDestination+'行':lang==='zh'?translatedDestination+'方向':'To '+translatedDestination):
    (lang==='ko'?'행선 미확인':lang==='ja'?'行先不明':lang==='zh'?'终点未知':'Destination unknown');
  // Keep the provider's train number unchanged. Adding a K prefix without
  // verified source information could misidentify the train.
  const tooltip=destinationLabel+' · '+p.trainNo+' · '+getTime(p.receivedAt,lang);
  const content=<span className="tf-train-inner">
    <span className="tf-train-destination" title={destinationLabel}>{destinationLabel}</span>
    <strong className="tf-train-number">{p.trainNo}</strong>
  </span>;
  return cand?<button key={number+'-'+p.direction} type="button" title={tooltip}
   className={'tf-train tf-train-pick'+(isSelected?' tf-train-picked':'')+(focusedTrain===number?' tf-train-focused':'')}
   data-tf-train-no={number}
   aria-pressed={isSelected} aria-label={destinationLabel+' '+p.trainNo+' · '+t.candidate+' · '+clean(p.station)}
   onClick={()=>onPick(cand)}>{content}</button>:
   <div key={number+'-'+p.direction} title={tooltip} className="tf-train tf-train-other">{content}</div>;
 };
 const toCandidates=()=>{
  const viewport=viewportRef.current;
  if(!viewport)return;
  if(!visibleCandidates.length){
   setJumpStatus(lang==='ko'
     ?'현재 노선도에 표시된 후보 열차가 없어요. 새로고침을 누르거나 분기 구간을 확인해 주세요.'
     :lang==='en'?'No candidate is currently visible. Refresh positions or check the branch route.'
     :lang==='ja'?'表示できる候補列車がありません。更新または分岐経路をご確認ください。'
     :'当前没有可显示的候选列车，请刷新或检查支线。');
   return;
  }
  // First tap starts with a manually selected train, when present. Repeated
  // taps always advance to the next candidate; do not pin one train forever.
  let nextIndex=candidateJumpIndex.current % visibleCandidates.length;
  if(candidateJumpIndex.current===0&&selectedNo){
    const selectedIndex=visibleCandidates.findIndex(p=>trainKey(p.trainNo)===selectedNo);
    if(selectedIndex>=0)nextIndex=selectedIndex;
  }
  const position=visibleCandidates[nextIndex];
  const key=trainKey(position.trainNo);
  const target=[...viewport.querySelectorAll('[data-tf-train-no]')]
   .find(node=>node.dataset.tfTrainNo===key);
  if(centerTarget(target)){
   candidateJumpIndex.current=nextIndex+1;
   setFocusedTrain(key);
   setJumpStatus((lang==='ko'?'확인 중 · 후보 ':'Candidate ')+position.trainNo+' · '+
     (stationName(position.station,lang)||position.station)+
     (visibleCandidates.length>1
       ?' ('+(nextIndex+1)+'/'+visibleCandidates.length+')':''));
  }else{
   setJumpStatus(lang==='ko'?'후보 열차 위치를 확인할 수 없어요. 새로고침해 주세요.':'Candidate location unavailable. Please refresh.');
  }
 };

 return <section className="tf-board-section" aria-label={t.title}>
   <div className="tf-board-heading">
    <div><h3>{t.title}</h3></div>
    <span className="tf-live-tag">{demo?'DEMO':t.refresh}</span>
   </div>
   <div className="tf-board-summary">
    <span><span className="tf-board-dot"/> {t.candidate} <strong>{candidates.length}</strong></span>
    {selected&&<span>{lang==='ko'?'선택한 열차':t.selected}: <strong>#{selected.number}</strong></span>}
    <span className="tf-last-update">{t.last}: <strong>{getTime(fetchedAt||lastPoll,lang)}</strong></span>
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
          // Candidate chips come before ordinary trains, so they are also
          // visible when multiple trains share one station's tiny bay.
          const here=trains.filter(p=>clean(p.station)===s).sort((a,b)=>{
            const priority=p=>trainKey(p.trainNo)===selectedNo?0:
              candidateByNumber.has(trainKey(p.trainNo))?1:2;
            return priority(a)-priority(b);
          });
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
    {!!candidates.length&&<div className="tf-h-foot">
      <button type="button" onClick={toCandidates}>◎ {lang==='ko'?'후보 열차 위치로':lang==='en'?'Go to candidates':lang==='ja'?'候補列車へ':'前往候选列车'}
       {visibleCandidates.length>1?' ('+visibleCandidates.length+')':''}
      </button>
      {jumpStatus&&<span className="tf-h-jump-status" role="status">{jumpStatus}</span>}
    </div>}
   </div>
   <div className="tf-board-caption"><span className="tf-board-refresh-dot"/> {lang==='ko'?'현재 위치는 역 단위 추정이며 실제 탑승 열차는 미확정입니다.':t.uncertain}{path.ambiguous?' '+t.unknown:''}</div>
 </section>;
}
