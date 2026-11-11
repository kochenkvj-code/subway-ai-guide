'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {trainDisplayPath,directionalPathToStation,expectedLiveDirection,trainStationKey,trainStationDisplay} from '../lib/train-lost';
import {stationName} from '../lib/stationNameI18n';

const trainKey=value=>String(value||'').trim().replace(/^0+(?=\d)/,'');
const getTime=(iso,lang)=>iso?new Intl.DateTimeFormat(lang==='ko'?'ko-KR':'en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(iso)):'—';
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
export default function TrainLiveDiagram({line,station,next,lang='ko',positions=[],fetchedAt,candidates=[],selected,active=true,demo=false,onSnapshot,onPick,onRestart,sectionTitle,instruction,alightingTime}){
 const clean=value=>trainStationKey(line,value);
 const display=value=>stationName(trainStationDisplay(line,value),lang)||value;
 const t=words[lang]||words.ko;
 const [refreshing,setRefreshing]=useState(false),[error,setError]=useState(false);
 const [focusedTrain,setFocusedTrain]=useState('');
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
 const focusedPosition=visibleCandidates.find(p=>trainKey(p.trainNo)===focusedTrain)||
   visibleCandidates.find(p=>trainKey(p.trainNo)===selectedNo)||visibleCandidates[0];
 const focusedStation=focusedPosition?.station||'';
 const focusedDestination=String(focusedPosition?.destination||'').replace(/(?:방면|행)$/,'').trim();
 // Candidate position is the scroll target, never the end of the rendered line.
 // Extend onward to the terminus or the next unresolved branch.
 const path=useMemo(()=>trainDisplayPath(line,station,next,focusedStation,focusedDestination),[line,station,next,focusedStation,focusedDestination]);
 const displayed=useMemo(()=>new Set(path.stops),[path.stops]);
 const hasTrains=trains.some(p=>displayed.has(clean(p.station)));
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
 useEffect(()=>{autoFocusedRef.current=false;},[line,station,next]);
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
  const activeNo=focusedTrain||selectedNo;
  if(!activeNo)return;
  const viewport=viewportRef.current;
  const target=[...(viewport?.querySelectorAll('[data-tf-train-no]')||[])]
   .find(node=>node.dataset.tfTrainNo===activeNo);
  if(target)centerTarget(target);
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
  const rawDestination=clean(p.destination||'').replace(/(?:방면|행)$/,'').trim();
  const translatedDestination=display(rawDestination);
  const destinationLabel=translatedDestination?
    (lang==='ko'?translatedDestination+'행':lang==='ja'?translatedDestination+'行':lang==='zh'?translatedDestination+'方向':'To '+translatedDestination):
    (lang==='ko'?'행선 미확인':lang==='ja'?'行先不明':lang==='zh'?'终点未知':'Destination unknown');
  // Short label inside compact English trains; the full destination stays
  // available in the title/accessible label and the selected-train detail.
  const compactDestination=lang==='en'&&translatedDestination?translatedDestination:destinationLabel;
  // Keep the provider's train number unchanged. Adding a K prefix without
  // verified source information could misidentify the train.
  const tooltip=destinationLabel+' · '+p.trainNo+' · '+getTime(p.receivedAt,lang);
  const content=<span className={'tf-train-inner'+(lang==='en'?' tf-train-inner-en':'')}>
    <span className={'tf-train-destination'+(lang==='en'?' tf-train-destination-en':'')} title={destinationLabel}>{compactDestination}</span>
    <strong className="tf-train-number">{p.trainNo}</strong>
  </span>;
  return cand?<button key={number+'-'+p.direction} type="button" title={tooltip}
   className={'tf-train tf-train-pick'+(isSelected?' tf-train-picked':'')+(focusedTrain===number?' tf-train-focused':'')}
   data-tf-train-no={number}
   aria-pressed={isSelected} aria-label={destinationLabel+' '+p.trainNo+' · '+t.candidate+' · '+clean(p.station)}
   onClick={()=>{setFocusedTrain(number);onPick(cand);}}>{content}</button>:
   <div key={number+'-'+p.direction} title={tooltip} className="tf-train tf-train-other">{content}</div>;
 };

 return <section className="tf-board-section" aria-label={t.title}>
   <div className="tf-board-heading">
    <div><h3>{t.title}</h3></div>
    <span className="tf-live-tag">{demo?'DEMO':t.refresh}</span>
   </div>
   <div className="tf-board-summary tf-map-headline-row">
    <div className="tf-map-heading">
     <strong className="tf-map-title">◎ {sectionTitle||t.title}</strong>
     {instruction&&<span className="tf-map-instruction">{instruction}</span>}
    </div>
    <div className="tf-map-updated">
     <span className="tf-last-update">{t.last} <strong>{getTime(fetchedAt||lastPoll,lang)}</strong></span>
     <button className="tf-refresh-icon" onClick={refresh} disabled={refreshing} type="button"
      aria-label={refreshing?t.pending:t.manual} title={refreshing?t.pending:t.manual}>
      <span aria-hidden="true">{refreshing?'…':'↻'}</span>
     </button>
    </div>
   </div>
   {error&&<p className="tf-warning" role="status">{t.error}</p>}
   <div className="tf-board" role="group" aria-label={t.title}>
    <div className="tf-h-topline">
      <span className="tf-alight-context">
       <span className="tf-alight-route"><strong>{stationName(station,lang)||station}</strong> → {stationName(next,lang)||next} {lang==='ko'?'방면':lang==='en'?'direction':lang==='ja'?'方面':'方向'}</span>
       {alightingTime&&<small className="tf-alight-time">{lang==='ko'?'하차시각':lang==='en'?'Alighted at':lang==='ja'?'下車時刻':'下车时间'} {alightingTime}</small>}
      </span>
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
           <div className="tf-h-name">{display(s)}</div>
           <div className="tf-h-detail">{index===0?t.alighted:(lang==='ko'?index+'정거장':index+' stop'+(index===1?'':'s'))}</div>
          </div>;
        })}
      </div>
    </div>
    {!hasTrains&&<div className="tf-board-empty">{t.noTrains}</div>}
    {lang==='en'&&focusedPosition&&<div className="tf-focused-destination" aria-live="polite">
     <strong>{focusedPosition.trainNo}</strong><span>Destination: {focusedDestination?'To '+display(focusedDestination):'Unknown'}</span>
    </div>}

   </div>
 </section>;
}
