'use client';
import {useRef,useState} from 'react';
import {positionGroups} from '../arrival-test/position/groups';
import {positionMessage} from '../arrival-test/position/message';
import {positionDestination,positionStation} from '../arrival-test/position/destination';
import {stationName} from '../lib/stationNameI18n';
import graph from '../data/trainLostGraph.json';
import directions from '../data/trainLostDirection.json';
import {CrowdingIndicator,crowdingClass,crowdingDescription} from './CrowdingIndicator';
import {CONGESTION_THRESHOLDS} from '../lib/congestion-data';

const labels={
 ko:{lead:'다음 열차, 어디쯤 왔고 얼마나 혼잡할까요?',source:'서울시 실시간 열차 위치정보',refresh:'새로고침',loading:'열차 위치정보 확인 중…',error:'위치정보 조회 실패',unsupported:'선로 연결정보가 없습니다.',empty:'다가오는 열차정보 없음',automatic:'30초 간격 갱신 · 열차 위치 기준',train:'열차번호',destination:'행선지',location:'현재 위치',updated:'정보 기준',raw:'서울시 원문 · JSON',up:'상행',down:'하행',inner:'내선',outer:'외선',entry:'진입',arrived:'도착',left:'출발',previousLeft:'전역 출발'},
 en:{lead:'Where is your next train, and how crowded?',source:'Seoul real-time train positions',refresh:'Refresh',loading:'Checking train positions…',error:'Could not load train positions',unsupported:'Track connections unavailable.',empty:'No approaching train information',automatic:'Updates every 30 seconds · Train positions',train:'Train',destination:'Destination',location:'Current location',updated:'Data as of',raw:'Seoul API original · JSON',up:'Upbound',down:'Downbound',inner:'Inner loop',outer:'Outer loop',entry:'Entering',arrived:'Arrived',left:'Departed',previousLeft:'Left previous station'},
 ja:{lead:'次の電車はどこ？どのくらい混雑？',source:'ソウル市リアルタイム列車位置情報',refresh:'更新',loading:'列車位置を確認中…',error:'位置情報を取得できません',unsupported:'線路接続情報がありません。',empty:'接近中の列車情報なし',automatic:'30秒ごとに更新 · 列車位置基準',train:'列車番号',destination:'行先',location:'現在位置',updated:'情報時刻',raw:'ソウル市の原文 · JSON',up:'上り',down:'下り',inner:'内回り',outer:'外回り',entry:'進入',arrived:'到着',left:'出発',previousLeft:'前駅発'},
 zh:{lead:'下一班列车到哪儿了？有多拥挤？',source:'首尔市实时列车位置信息',refresh:'刷新',loading:'正在查询列车位置…',error:'无法获取列车位置',unsupported:'暂无线路连接信息。',empty:'暂无接近列车的信息',automatic:'每30秒更新 · 根据列车位置',train:'列车编号',destination:'终点站',location:'当前位置',updated:'信息时间',raw:'首尔市原文 · JSON',up:'上行',down:'下行',inner:'内环',outer:'外环',entry:'进站',arrived:'到站',left:'出站',previousLeft:'前站发车'}
};
function rowsFor(state,station){
 const all=state.data?.raw?.realtimePositionList||[];
 const line=station?.line||'1',name=station?.names?.ko||'종로5가';
 return {...positionGroups(all,line,name,graph,directions),all};
}
function direction(group,line,t){
 return String(line)==='2'?(group.dir==='0'?t.inner:t.outer):(group.dir==='0'?t.up:t.down);
}
function heading(group,station,lang,t){
 const line=station?.line||'1';
 // Eungam splits its loop entry and return. Only the heading is exceptional;
 // the provider direction, original train number, and route search stay intact.
 if(line==='6'&&station?.names?.ko==='응암')return stationName(group.dir==='0'?'역촌':'새절',lang);
 return group.next.length?group.next.map(n=>stationName(n,lang)).join(' · '):direction(group,line,t);
}
function stateText(row,t){
 return ({'0':t.entry,'1':t.arrived,'2':t.left,'3':t.previousLeft})[String(row.trainSttus)]||'—';
}
function destination(row,lang,station){
 return positionDestination(row.statnTnm,lang,stationName,station?.line||'1',row.updnLine);
}
function Arrow({right=false}){
 return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={right?'M4 12h16m-6-6 6 6-6 6':'M20 12H4m6-6-6 6 6 6'}/></svg>;
}
export function PositionTrainSummary({state,lang='ko',t,onDetails,stationContext,crowding=null}){
 const ui=labels[lang]||labels.ko,station=stationContext;
 const {groups}=rowsFor(state,station);
 // Reverse the visual columns only: down/inner on the left, up/outer on the right.
 // Preserve the provider's direction and train data, including Eungam handling.
 const shownGroups=[...groups].reverse();
 return <section className="v2-trains v2-position-trains" aria-label={t.next}>
  <div className="v2-summary-board">{shownGroups.map((group,index)=><div className="v2-summary-direction" key={group.dir}>
   <button className={"v2-summary-heading"+crowdingClass(crowding?.[group.dir])} title={[heading(group,station,lang,ui),crowdingDescription(crowding?.[group.dir],lang)].filter(Boolean).join(" · ")} aria-label={[heading(group,station,lang,ui),crowdingDescription(crowding?.[group.dir],lang),t.detail].filter(Boolean).join(" · ")} onClick={onDetails}>
    {index===0&&<Arrow/>}{index===1&&<CrowdingIndicator value={crowding?.[group.dir]} lang={lang}/>}<span className="v2-crowding-station">{heading(group,station,lang,ui)}</span>{index===0&&<CrowdingIndicator value={crowding?.[group.dir]} lang={lang}/>}{index===1&&<Arrow right/>}
   </button>
   {[0,1].map(i=>{
    const item=!state.error&&group.trains[i],d=item?destination(item.row,lang,station):null;
    return <button className="v2-summary-train v2-position-train" key={i} onClick={onDetails} aria-label={(d?.full||'—')+' · '+(item?positionMessage(item,lang):'—')}>
     <span className="v2-summary-destination" title={d?.full||''}>{d?<><span>{d.bound}</span>{d.qualifier&&<small>{d.qualifier}</small>}</>:'—'}</span>
     <b className={item?'v2-arrival-available':''}><span className="v2-position-message">{item?positionMessage(item,lang):'—'}</span></b>
    </button>;
   })}
  </div>)}</div>
 </section>;
}
// Passenger-facing detail copy is intentionally shorter than the timetable guide.
const detailCopy={
 ko:{lead:['다음 열차, ','어디쯤',' 왔고 얼마나 ','혼잡','할까요?'],day:'하루 전체 혼잡도',help:'혼잡도 보는 법',definition:'정원 대비 승차인원 비율 · 요일·방면별 30분 평균',grades:['여유','보통','밀집','혼잡'],descriptions:['앉을 가능성이 높음','서서 이용하기 무난함','이동이 다소 불편함','간격이 좁고 이동이 어려움'],benchmarks:['좌석 만석 수준','설계 정원 도달','혼잡 단계 시작'],close:'닫기',range:(i,b)=>i===0?b[0]+'% 미만':i===3?b[2]+'% 이상':b[i-1]+'~'+b[i]+'%'},
 en:{lead:['Next train: ','where',' is it, how ','crowded','?'],day:'Daily crowding',help:'Crowding guide',definition:'Passengers relative to capacity · 30-min average by day and direction',grades:['Low','Moderate','Busy','Crowded'],descriptions:['Seats likely available','Standing is comfortable','Moving is somewhat difficult','Little space; difficult to move'],benchmarks:['Seats full','Rated capacity','Crowded level'],close:'Close',range:(i,b)=>i===0?'Under '+b[0]+'%':i===3?b[2]+'%+':b[i-1]+'–'+b[i]+'%'},
 ja:{lead:['次の電車は','どこ','？どのくらい','混雑','？'],day:'一日の混雑度',help:'混雑度の見方',definition:'定員に対する乗車人数の割合 · 曜日・方面別30分平均',grades:['余裕','普通','密集','混雑'],descriptions:['座れる可能性が高い','立って利用しやすい','移動がやや不便','間隔が狭く移動しにくい'],benchmarks:['座席満席の目安','基準定員に到達','混雑段階の開始'],close:'閉じる',range:(i,b)=>i===0?b[0]+'%未満':i===3?b[2]+'%以上':b[i-1]+'〜'+b[i]+'%'},
 zh:{lead:['下一班列车','到哪儿','了？有多','拥挤','？'],day:'全天拥挤度',help:'拥挤度说明',definition:'乘车人数占额定容量的比例 · 星期类型及方向30分钟平均',grades:['宽松','一般','密集','拥挤'],descriptions:['较可能有座位','站立乘车较舒适','走动略有不便','间距较小，移动困难'],benchmarks:['座位坐满','达到额定容量','拥挤等级开始'],close:'关闭',range:(i,b)=>i===0?'低于'+b[0]+'%':i===3?b[2]+'%及以上':b[i-1]+'~'+b[i]+'%'}
};
function GuideIcon({kind}){
 return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
 {kind==='chart'?<g stroke="none"><rect x="3" y="12" width="4" height="9" rx="1" fill="#559d77"/><rect x="10" y="7" width="4" height="14" rx="1" fill="#528fc6"/><rect x="17" y="3" width="4" height="18" rx="1" fill="#d9a34a"/></g>:kind==='info'?<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7h.01"/></>:kind==='chevron'?<path d="m9 6 6 6-6 6"/>:kind==='close'?<path d="m6 6 12 12M18 6 6 18"/>:kind==='seat'?<><path d="M5 12V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4M5 19v2m14-2v2M3 12a2 2 0 0 1 4 0v3h10v-3a2 2 0 0 1 4 0v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>:kind==='gauge'?<><path d="M4 19a9 9 0 1 1 16 0H4zM12 15l4-5"/><circle cx="12" cy="15" r="1"/></>:<><circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/></>}
 </svg>;
}
function DetailPeople({level}){
 return <svg viewBox="0 0 30 22" aria-hidden="true">{[0,1,2].map(i=><g key={i} transform={'translate('+i*10+' 0)'} fill="currentColor" opacity={i<=level?1:.2}><circle cx="5" cy="3.5" r="2.8"/><path d="M2.1 9Q2.1 7 5 7Q7.9 7 7.9 9L9.4 14H7.4V21H5.7V14H4.3V21H2.6V14H.6Z"/></g>)}</svg>;
}
function PositionDetailCard({item,station,lang,ui}){
 const [open,setOpen]=useState(false);
 const row=item.row,d=destination(row,lang,station);
 return <article className="v2-arrival-train v2-position-detail-card">
  <div className="v2-position-card-face">
   <button type="button" className="v2-position-card-toggle" aria-expanded={open} aria-label={ui.updated+' · '+ui.raw+' · '+(row.trainNo||'—')} onClick={()=>setOpen(v=>!v)}/>
   <div className="v2-position-card-top"><strong title={positionMessage(item,lang)}>{positionMessage(item,lang)}</strong><span title={stateText(row,ui)}>{stateText(row,ui)}</span></div>
   <dl>
    <dt>{ui.destination}</dt><dd title={d.full}>{lang==='ko'?row.statnTnm||'—':d.full}</dd>
    <dt>{ui.train}</dt><dd title={row.trainNo||'—'}>{row.trainNo||'—'}</dd>
    <dt>{ui.location}</dt><dd title={positionStation(row.statnNm,lang,stationName)+' · '+stateText(row,ui)}>{positionStation(row.statnNm,lang,stationName)} · {stateText(row,ui)}</dd>
   </dl>
  </div>
  {open&&<div className="v2-position-raw">
   <div className="v2-position-raw-meta">{ui.updated}: {row.recptnDt||'—'} · {ui.raw}</div>
   <pre>{JSON.stringify(row,null,2)}</pre>
  </div>}
 </article>;
}
export function PositionArrivalDetails({state,lang='ko',t,stationContext,crowding=null,onTimetable}){
 const ui=labels[lang]||labels.ko,station=stationContext,words=detailCopy[lang]||detailCopy.ko;
 const {groups}=rowsFor(state,station);
 const shownGroups=[...groups].reverse();
 const info=useRef(null);
 const bounds=CONGESTION_THRESHOLDS;
 const legacyLead=({ko:'다음 열차, 어디쯤 왔을까요?',en:'Where is your next train?',ja:'次の電車はどこまで来たかな？',zh:'下一班列车到哪儿了？'})[lang]||'Where is your next train?';
 return <section className="v2-arrival-details v2-position-arrivals">
  <div className="v2-arrival-detail-head">
   <div>{onTimetable?<h2 title={ui.lead}>{words.lead.map((part,i)=>i%2?<em key={i}>{part}</em>:part)}</h2>:<h2 title={legacyLead}>{legacyLead}</h2>}</div>
   <button onClick={state.refresh} disabled={state.loading} title={ui.automatic}>{state.loading?ui.loading:ui.refresh}</button>
  </div>
  {onTimetable&&<div className="v2-position-guide-actions">
   <button type="button" onClick={onTimetable} disabled={!onTimetable}><GuideIcon kind="chart"/><span>{words.day}</span><GuideIcon kind="chevron"/></button>
   <button type="button" onClick={()=>info.current?.showModal()}><GuideIcon kind="info"/><span>{words.help}</span><GuideIcon kind="chevron"/></button>
  </div>}
  <div className="v2-position-detail-grid">{shownGroups.map((group,index)=>{
   const name=heading(group,station,lang,ui);
   const label=onTimetable?name:name+' · '+direction(group,station?.line,ui);
   const value=crowding?.[group.dir];
   return <section className="v2-arrival-group v2-position-detail-column" key={group.dir}>
    <h3 className={crowdingClass(value).trim()} title={[label,crowdingDescription(value,lang)].filter(Boolean).join(' · ')}>{index===0&&<Arrow/>}{index===1&&<CrowdingIndicator value={value} lang={lang} numeric/>}<span className="v2-crowding-station">{label}</span>{index===0&&<CrowdingIndicator value={value} lang={lang} numeric/>}{index===1&&<Arrow right/>}</h3>
    {[0,1,2].map(i=>{
     const item=!state.error&&group.candidates[i];
     if(!item)return <div className="v2-position-empty" key={i}>—</div>;
     return <PositionDetailCard key={(station?.stationCode||'0154')+'-'+item.row.trainNo+'-'+i} item={item} station={station} lang={lang} ui={ui}/>;
    })}
   </section>;
  })}</div>
  <dialog ref={info} className="v2-crowding-dialog" aria-labelledby="v2-live-crowding-title" onClick={e=>{if(e.target===info.current)info.current?.close();}}>
   <div className="v2-crowding-dialog-content">
    <header><h3 id="v2-live-crowding-title">{words.help}</h3><button type="button" className="v2-crowd-close-x" aria-label={words.close} onClick={()=>info.current?.close()}><GuideIcon kind="close"/></button></header>
    <p className="v2-live-crowd-definition">{words.definition}</p>
    <div className="v2-live-crowd-grades">{words.grades.map((grade,i)=><div key={grade} className={'v2-live-crowd-grade v2-crowding-'+i}>
     <div className="v2-live-crowd-grade-name"><DetailPeople level={i}/><b>{grade}</b></div>
     <span className="v2-live-crowd-desc">{words.descriptions[i]}</span>
     <b className="v2-live-crowd-range">{words.range(i,bounds)}</b>
    </div>)}</div>
    <div className="v2-live-crowd-benchmarks">{['34%','100%','110%'].map((value,i)=><div key={value} className={'v2-crowding-'+[0,2,3][i]}><strong><GuideIcon kind={['seat','gauge','people'][i]}/>{value}</strong><span>{words.benchmarks[i]}</span></div>)}</div>
    <button type="button" className="v2-crowd-close-bottom" onClick={()=>info.current?.close()}>{words.close}</button>
   </div>
  </dialog>
 </section>;
}
