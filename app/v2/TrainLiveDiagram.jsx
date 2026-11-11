'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {trainDisplayPath,directionalPathToStation,expectedLiveDirection,trainStationKey,trainStationDisplay} from '../lib/train-lost';
import {stationName,destinationForApi} from '../lib/stationNameI18n';
import {trainLostDestination} from '../lib/train-lost-destination.mjs';

const trainKey=value=>String(value||'').trim().replace(/^0+(?=\d)/,'');
const getTime=(iso,lang)=>iso?new Intl.DateTimeFormat(lang==='ko'?'ko-KR':'en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso)):'—';
const metaWords={ko:{alight:'하차시각',updated:'갱신시각',old:'이전',now:'선택',express:'급행'},en:{alight:'Alighted',updated:'Updated',old:'Before',now:'Selected',express:'Express'},ja:{alight:'下車時刻',updated:'更新時刻',old:'前回',now:'選択',express:'急行'},zh:{alight:'下车时间',updated:'更新时间',old:'之前',now:'已选',express:'快车'}};
const words={
 ko:{title:'실시간 열차 위치',hint:'하차역을 기준으로 후보 열차의 움직임을 확인하고 선택하세요.',opposite:'반대 방향',forward:'선택한 방향',alighted:'하차역',candidate:'후보',selected:'선택',manual:'새로고침',refresh:'20초마다 자동 업데이트',pending:'실시간 정보 갱신 중',error:'실시간 위치를 갱신하지 못했습니다. 기존 위치를 보여줍니다.',last:'최근 갱신',noTrains:'이 구간에 표시할 열차가 없습니다.',uncertain:'위치는 역 단위 공공데이터로 갱신됩니다. 열차의 정확한 역간 위치나 과거 통과역은 확정할 수 없습니다.',unknown:'노선 분기점 이후 경로는 표시가 제한될 수 있습니다.'},
 en:{title:'Live train positions',hint:'Watch candidate trains around your station, then tap one.',opposite:'Other direction',forward:'Chosen direction',alighted:'Your stop',candidate:'Candidate',selected:'Selected',manual:'Refresh',refresh:'Auto-refresh every 20s',pending:'Refreshing…',error:'Live data could not refresh. Showing last positions.',last:'Updated',noTrains:'No trains reported in this section.',uncertain:'Positions update by station, not GPS. Past stop history is not confirmed.',unknown:'Branches may limit the visible route.'},
 ja:{title:'リアルタイム列車位置',hint:'候補列車の位置を確認し、選択してください。',opposite:'反対方向',forward:'選択方向',alighted:'下車駅',candidate:'候補',selected:'選択済',manual:'更新',refresh:'20秒ごとに更新',pending:'更新中…',error:'更新できませんでした。以前の位置を表示します。',last:'更新',noTrains:'この区間に列車はありません。',uncertain:'位置は駅単位で更新されます。GPSや過去の通過駅ではありません。',unknown:'分岐区間は一部表示できません。'},
 zh:{title:'实时列车位置',hint:'查看候选列车的位置，然后选择。',opposite:'反方向',forward:'所选方向',alighted:'下车站',candidate:'候选',selected:'已选择',manual:'刷新',refresh:'每20秒更新',pending:'更新中…',error:'实时更新失败，显示上次位置。',last:'更新于',noTrains:'此区间暂无列车。',uncertain:'位置按车站更新，并非GPS定位或历史经过记录。',unknown:'分支线路可能无法完整显示。'}
};

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
export default function TrainLiveDiagram({line,station,next,lang='ko',positions=[],fetchedAt,candidates=[],selected,active=true,demo=false,onSnapshot,onPick,alightingTime}){
 const clean=value=>trainStationKey(line,value);
 const display=value=>stationName(trainStationDisplay(line,value),lang)||value;
 const t=words[lang]||words.ko;
 const m=metaWords[lang]||metaWords.ko;
 const [refreshing,setRefreshing]=useState(false),[error,setError]=useState(false);
 const [focusedTrain,setFocusedTrain]=useState('');
 const [comparison,setComparison]=useState(null);
 const historyRef=useRef(null);
 const lastCenteredRef=useRef({number:null,station:null});
 const animationRef=useRef(0);
 const autoFocusedRef=useRef(false);
 const viewportRef=useRef(null);
 const [lastPoll,setLastPoll]=useState(null);
 const onSnapshotRef=useRef(onSnapshot);
 const positionsRef=useRef(positions);
 useEffect(()=>{positionsRef.current=positions;},[positions]);
 useEffect(()=>{onSnapshotRef.current=onSnapshot;},[onSnapshot]);
 const direction=expectedLiveDirection(line,station,next);
 const trains=useMemo(()=>latestTrains(positions,line).filter(p=>String(p.direction)===String(direction)),[positions,line,direction]);
 const candidateByNumber=useMemo(()=>new Map(candidates.map(c=>[trainKey(c.number),c])),[candidates]);
 const selectedNo=selected?trainKey(selected.number):null;
 const trackedStation=selectedNo?trains.find(p=>trainKey(p.trainNo)===selectedNo)?.station:null;
 // Navigation includes every fresh candidate on a valid directionally reachable
 // branch, not only those on the initial no-fork diagram.
 const visibleCandidates=useMemo(()=>candidates.map(c=>
   trains.find(p=>trainKey(p.trainNo)===trainKey(c.number))
 ).filter(p=>p&&directionalPathToStation(line,station,next,p.station,38).length>0),
 [candidates,trains,line,station,next]);
 const focusedPosition=visibleCandidates.find(p=>trainKey(p.trainNo)===selectedNo)||
   visibleCandidates.find(p=>trainKey(p.trainNo)===focusedTrain)||visibleCandidates[0];
 const focusedStation=focusedPosition?.station||'';
 const focusedDestination=String(focusedPosition?.destination||'').replace(/(?:방면|행)$/,'').trim();
 const displayDestination=p=>trainLostDestination({
  line,raw:p?.destination,direction:p?.direction,station:p?.station,lang
 },name=>{const value=trainStationDisplay(line,name);return destinationForApi(value)?stationName(value,lang,false):'';});
 // Candidate position is the scroll target, never the end of the rendered line.
 // Extend onward to the terminus or the next unresolved branch.
 const path=useMemo(()=>trainDisplayPath(line,station,next,focusedStation,focusedDestination),[line,station,next,focusedStation,focusedDestination]);
 const displayed=useMemo(()=>new Set(path.stops),[path.stops]);
 const hasTrains=trains.some(p=>displayed.has(clean(p.station)));
 const findCandidateStation=no=>{
   const position=trains.find(p=>trainKey(p.trainNo)===no);
   const candidate=candidates.find(c=>trainKey(c.number)===no);
   return clean(position?.station||candidate?.station||'');
 };
 // Keep before/after IDs from deliberate candidate changes. The API still
 // supplies the station; selection alone is never evidence of a real journey.
 useEffect(()=>{
   if(!selectedNo){historyRef.current=null;setComparison(null);return;}
   const previous=historyRef.current;
   const routeKey=String(line)+'/'+String(station)+'/'+String(next);
   if(previous&&previous.routeKey!==routeKey)setComparison(null);
   const currentStation=findCandidateStation(selectedNo);
   if(previous&&previous.routeKey===routeKey&&previous.number!==selectedNo){
     setComparison({
       from:{number:previous.number,station:findCandidateStation(previous.number)||previous.station},
       to:{number:selectedNo,station:currentStation}
     });
   }
   historyRef.current={number:selectedNo,station:currentStation,routeKey};
 },[selectedNo,line,station,next]);
 const stopAnimation=()=>{
   if(animationRef.current)cancelAnimationFrame(animationRef.current);
   animationRef.current=0;
   const viewport=viewportRef.current;
   if(viewport)viewport.style.scrollSnapType='';
 };
 // Use requestAnimationFrame, not an immediate scrollLeft jump. This works on
 // iOS Safari, cancels on touch, and respects reduced-motion preferences.
 const centerTarget=(node,animate=false,preserveX=false)=>{
   const viewport=viewportRef.current;
   if(!viewport||!node)return false;
   const stationNode=node.closest('[data-tf-station]')||node;
   const box=stationNode.getBoundingClientRect(),frame=viewport.getBoundingClientRect();
   const desired=viewport.scrollLeft+(box.left-frame.left)+box.width/2-viewport.clientWidth/2;
   const maxLeft=Math.max(0,viewport.scrollWidth-viewport.clientWidth);
   const targetX=preserveX?viewport.scrollLeft:
     Math.max(0,Math.min(maxLeft,Math.round(desired)));
   stopAnimation();
   const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
   if(!animate||reduceMotion||Math.abs(viewport.scrollLeft-targetX)<3){
     viewport.scrollLeft=targetX;
   }else{
     const startX=viewport.scrollLeft,delta=targetX-startX,startTime=performance.now();
     const duration=Math.max(600,Math.min(950,Math.abs(delta)*1.1));
     viewport.style.scrollSnapType='none';
     const frame=now=>{
       const t=Math.min(1,(now-startTime)/duration);
       viewport.scrollLeft=startX+delta*(1-Math.pow(1-t,3));
       if(t<1)animationRef.current=requestAnimationFrame(frame);
       else{animationRef.current=0;viewport.style.scrollSnapType='';}
     };
     animationRef.current=requestAnimationFrame(frame);
   }
   const bay=node.closest('.tf-h-trains');
   if(bay&&bay.scrollHeight>bay.clientHeight){
     const trainBox=node.getBoundingClientRect(),bayBox=bay.getBoundingClientRect();
     // Avoid vertically shuffling stacked trains when both are already visible.
     const visible=trainBox.top>=bayBox.top-1&&trainBox.bottom<=bayBox.bottom+1;
     if(!visible){
       const y=bay.scrollTop+(trainBox.top-bayBox.top)-(bay.clientHeight-trainBox.height)/2;
       bay.scrollTop=Math.max(0,Math.min(bay.scrollHeight-bay.clientHeight,Math.round(y)));
     }
   }
   return true;
 };
 useEffect(()=>{
   const viewport=viewportRef.current;
   if(!viewport)return;
   const cancel=()=>stopAnimation();
   viewport.addEventListener('touchstart',cancel,{passive:true});
   viewport.addEventListener('pointerdown',cancel,{passive:true});
   viewport.addEventListener('wheel',cancel,{passive:true});
   return()=>{
     viewport.removeEventListener('touchstart',cancel);
     viewport.removeEventListener('pointerdown',cancel);
     viewport.removeEventListener('wheel',cancel);
     stopAnimation();
   };
 },[]);
 useEffect(()=>{
  autoFocusedRef.current=false;
  lastCenteredRef.current={number:null,station:null};
  // Route-specific comparison state resets in the selected-train effect.
 },[line,station,next]);
 useEffect(()=>{
  const viewport=viewportRef.current;
  const origin=viewport?.querySelector('[data-tf-origin="true"]');
  if(!viewport||!origin)return;
  // Horizontal scrolling is confined to the diagram, never the whole V2 page.
  const delta=origin.getBoundingClientRect().left-viewport.getBoundingClientRect().left;
  viewport.scrollLeft+=Math.max(0,delta-20);
 },[line,station,next]);
 useEffect(()=>{
  if(!trackedStation||!selectedNo)return;
  // A candidate selected from the list may require switching branch first.
  setFocusedTrain(selectedNo);
 },[trackedStation,selectedNo,line,station,next]);
 // After React renders the active branch, scroll to the exact candidate chip,
 // including candidates beyond a junction and vertically stacked train chips.
 useEffect(()=>{
  const activeNo=selectedNo||focusedTrain;
  if(!activeNo)return;
  const viewport=viewportRef.current;
  const target=[...(viewport?.querySelectorAll('[data-tf-train-no]')||[])]
   .find(node=>node.dataset.tfTrainNo===activeNo);
  if(!target)return;
  const focusStation=target.closest('[data-tf-station]')?.dataset.tfStation||'';
  const previous=lastCenteredRef.current;
  if(previous.number===activeNo&&previous.station===focusStation)return;
  const sameStation=Boolean(previous.number&&previous.station===focusStation);
  if(centerTarget(target,Boolean(previous.number)&&!sameStation,sameStation))
   lastCenteredRef.current={number:activeNo,station:focusStation};
 },[focusedTrain,selectedNo,focusedStation,path]);
 // On entering the live-train screen, focus the top-ranked candidate once.
 // Centering a candidate is not a confirmation of boarding.
 useEffect(()=>{
  if(selectedNo||autoFocusedRef.current||!visibleCandidates.length)return;
  const key=trainKey(visibleCandidates[0].trainNo);
  const viewport=viewportRef.current;
  const target=[...(viewport?.querySelectorAll('[data-tf-train-no]')||[])]
   .find(node=>node.dataset.tfTrainNo===key);
  if(target&&centerTarget(target)){
    lastCenteredRef.current={number:key,station:target.closest('[data-tf-station]')?.dataset.tfStation||''};
    autoFocusedRef.current=true;
    setFocusedTrain(key);
  }
 },[selectedNo,visibleCandidates,line,station,next,path]);
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
  const wasSelected=comparison?.from.number===number&&!isSelected;
  const destination=displayDestination(p);
  const destinationLabel=destination.text;
  // Keep the English label compact in its existing narrow 67–69px train shape.
  const compactDestination=lang==='en'&&destination.kind==='terminus'?destination.text:destinationLabel;
  // Keep the provider's train number unchanged. Adding a K prefix without
  // verified source information could misidentify the train.
  const tooltip=destinationLabel+' · '+p.trainNo+(p.express?' · '+m.express:'')+' · '+getTime(p.receivedAt,lang);
  const content=<span className={'tf-train-inner'+(lang==='en'?' tf-train-inner-en':'')}>
    <span className={'tf-train-destination'+(lang==='en'?' tf-train-destination-en':'')} title={destinationLabel}>{compactDestination}</span>
    <strong className="tf-train-number">{p.trainNo}</strong>
  </span>;
  const labeledContent=<>{content}{p.express&&<span className="tf-train-express" aria-hidden="true" title={m.express}>⚡</span>}</>;
  return cand?<button key={number+'-'+p.direction} type="button" title={tooltip}
   className={'tf-train tf-train-pick'+(isSelected?' tf-train-picked':'')+(wasSelected?' tf-train-previous':'')+(focusedTrain===number?' tf-train-focused':'')}
   data-tf-train-no={number}
   aria-pressed={isSelected} aria-label={destinationLabel+' '+p.trainNo+(p.express?' · '+m.express:'')+' · '+t.candidate+' · '+clean(p.station)}
   onClick={()=>{setFocusedTrain(number);onPick(cand);}}>{labeledContent}</button>:
   <div key={number+'-'+p.direction} title={tooltip} className="tf-train tf-train-other">{labeledContent}</div>;
 };

 return <section className="tf-board-section" aria-label={t.title}>
   {error&&<p className="tf-warning" role="status">{t.error}</p>}
   <div className="tf-board" role="group" aria-label={t.title}>
    <div className="tf-h-topline">
      <span className="tf-alight-context">
       <span className="tf-alight-route"><strong>{stationName(station,lang)||station}</strong> → {stationName(next,lang)||next} {lang==='ko'?'방면':lang==='en'?'direction':lang==='ja'?'方面':'方向'}</span>
      </span>
      <div className="tf-h-meta">
       <div className="tf-h-times">
        {alightingTime&&<span className="tf-alight-time">{m.alight} <strong>{alightingTime}</strong></span>}
        <span className="tf-last-update">{m.updated} <strong>{getTime(fetchedAt||lastPoll,lang)}</strong></span>
       </div>
       <button className="tf-refresh-icon" onClick={refresh} disabled={refreshing} type="button"
        aria-label={refreshing?t.pending:t.manual} title={refreshing?t.pending:t.manual}>
        <span aria-hidden="true">{refreshing?'…':'↻'}</span>
       </button>
      </div>
    </div>
    <div className="tf-board-swipe-hint">← {lang==='ko'?'좌우로 밀어보기':lang==='en'?'Swipe sideways':lang==='ja'?'左右にスワイプ':'左右滑动'} →</div>
    <div className="tf-board-viewport tf-board-horizontal" ref={viewportRef} tabIndex={0}>
      <div className="tf-h-flow" role="list">
        {path.stops.map((s,index)=>{
          // Stable train order within a station: selection NEVER rearranges
          // stacked trains; only the selected color/focus changes.
          const here=trains.filter(p=>clean(p.station)===s)
           .sort((a,b)=>String(a.trainNo).localeCompare(String(b.trainNo),'ko',{numeric:true}));
          const hasCandidate=here.some(p=>candidateByNumber.has(trainKey(p.trainNo)));
          return <div key={s+'-'+index} data-tf-origin={s===clean(station)?"true":undefined}
           data-tf-station={s} data-tf-candidate={hasCandidate?"true":undefined}
           className={'tf-h-stop'+(s===clean(station)?' tf-h-origin':'')} role="listitem">
           <div className="tf-h-trains">{here.map(renderTrain)}</div>
           <div className="tf-h-rail"><span className="tf-h-node"/></div>
           <div className="tf-h-name">{display(s)}</div>
           <div className="tf-h-detail">{index===0?t.alighted:(lang==='ko'?index+'정거장':index+' stop'+(index===1?'':'s'))}</div>
          </div>;
        })}
      </div>
    </div>
    {!hasTrains&&<div className="tf-board-empty">{t.noTrains}</div>}
    {comparison&&<div className="tf-selection-comparison" aria-live="polite">
      <span>{m.old} <strong>{comparison.from.number.padStart(4,'0')}</strong> {comparison.from.station&&'('+display(comparison.from.station)+')'}</span>
      <span className="tf-selection-arrow">→</span>
      <span>{m.now} <strong>{comparison.to.number.padStart(4,'0')}</strong> {comparison.to.station&&'('+display(comparison.to.station)+')'}</span>
    </div>}
    {lang==='en'&&focusedPosition&&<div className="tf-focused-destination" aria-live="polite">
     <strong>{focusedPosition.trainNo}</strong><span>{displayDestination(focusedPosition).text}</span>
    </div>}

   </div>
 </section>;
}
