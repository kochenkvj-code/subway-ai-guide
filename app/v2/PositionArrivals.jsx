'use client';
import {useRef} from 'react';
import {positionGroups} from '../arrival-test/position/groups';
import {positionMessage} from '../arrival-test/position/message';
import {positionDestination,positionStation} from '../arrival-test/position/destination';
import {stationName} from '../lib/stationNameI18n';
import graph from '../data/trainLostGraph.json';
import directions from '../data/trainLostDirection.json';
import {CrowdingIndicator,crowdingClass,crowdingDescription,crowdingPolicyDescription} from './CrowdingIndicator';

const labels={
 ko:{lead:'다음 열차, 어디쯤 왔을까요?',source:'서울시 실시간 열차 위치정보',refresh:'새로고침',loading:'열차 위치정보 확인 중…',error:'위치정보 조회 실패',unsupported:'선로 연결정보가 없습니다.',empty:'다가오는 열차정보 없음',automatic:'30초 간격 갱신 · 열차 위치 기준',train:'열차번호',destination:'행선지',location:'현재 위치',updated:'정보 기준',raw:'서울시 원문 · JSON',up:'상행',down:'하행',inner:'내선',outer:'외선',entry:'진입',arrived:'도착',left:'출발',previousLeft:'전역 출발',crowdingSummary:'예상 혼잡도 · 시간대 평균 (열차별 실시간 혼잡도 아님)'},
 en:{lead:'Where is your next train?',source:'Seoul real-time train positions',refresh:'Refresh',loading:'Checking train positions…',error:'Could not load train positions',unsupported:'Track connections unavailable.',empty:'No approaching train information',automatic:'Updates every 30 seconds · Train positions',train:'Train',destination:'Destination',location:'Current location',updated:'Data as of',raw:'Seoul API original · JSON',up:'Upbound',down:'Downbound',inner:'Inner loop',outer:'Outer loop',entry:'Entering',arrived:'Arrived',left:'Departed',previousLeft:'Left previous station',crowdingSummary:'Estimated crowding · 30-min average, not live occupancy'},
 ja:{lead:'次の電車はどこまで来たかな？',source:'ソウル市リアルタイム列車位置情報',refresh:'更新',loading:'列車位置を確認中…',error:'位置情報を取得できません',unsupported:'線路接続情報がありません。',empty:'接近中の列車情報なし',automatic:'30秒ごとに更新 · 列車位置基準',train:'列車番号',destination:'行先',location:'現在位置',updated:'情報時刻',raw:'ソウル市の原文 · JSON',up:'上り',down:'下り',inner:'内回り',outer:'外回り',entry:'進入',arrived:'到着',left:'出発',previousLeft:'前駅発',crowdingSummary:'予想混雑度 · 30分平均（列車別のリアルタイム値ではありません）'},
 zh:{lead:'下一班列车到哪儿了？',source:'首尔市实时列车位置信息',refresh:'刷新',loading:'正在查询列车位置…',error:'无法获取列车位置',unsupported:'暂无线路连接信息。',empty:'暂无接近列车的信息',automatic:'每30秒更新 · 根据列车位置',train:'列车编号',destination:'终点站',location:'当前位置',updated:'信息时间',raw:'首尔市原文 · JSON',up:'上行',down:'下行',inner:'内环',outer:'外环',entry:'进站',arrived:'到站',left:'出站',previousLeft:'前站发车',crowdingSummary:'预计拥挤度 · 30分钟时段平均，非实时车厢人数'}
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
  {crowding&&Object.values(crowding).some(value=>typeof value==='number')&&<p className="v2-summary-crowding-note">{ui.crowdingSummary}</p>}
 </section>;
}
export function PositionArrivalDetails({state,lang='ko',t,stationContext,crowding=null,congestionSlot=null}){
 const ui=labels[lang]||labels.ko,station=stationContext;
 const {groups}=rowsFor(state,station);
 const shownGroups=[...groups].reverse();
 const info=useRef(null);
 const crowdText={ko:{title:'현재 시간대 예상 혼잡도',note:'열차 위치는 실시간 정보이며, 혼잡도는 해당 역·방면의 30분 시간대 평균 통계입니다. 개별 열차의 실시간 혼잡도가 아닙니다.',close:'닫기'},en:{title:'Estimated crowding for this time',note:'Train positions are live; crowding is a 30-minute average for this station and direction, not each train’s live occupancy.',close:'Close'},ja:{title:'現在の時間帯の予想混雑度',note:'列車位置はリアルタイム情報ですが、混雑度は駅・方面別の30分平均統計であり、個別列車の実測値ではありません。',close:'閉じる'},zh:{title:'当前时段预计拥挤度',note:'列车位置为实时信息，拥挤度为本站及方向的30分钟平均统计，并非单趟列车实时载客量。',close:'关闭'}}[lang]||{title:'예상 열차 혼잡도',note:'30분 평균 통계',close:'닫기'};
 return <section className="v2-arrival-details v2-position-arrivals">
  <div className="v2-arrival-detail-head">
   <div><h2 title={ui.lead}>{ui.lead}</h2></div>
   <button onClick={state.refresh} disabled={state.loading} title={ui.automatic}>{state.loading?ui.loading:ui.refresh}</button>
  </div>
  <div className="v2-position-detail-grid">{shownGroups.map((group,index)=><section className="v2-arrival-group v2-position-detail-column" key={group.dir}>
    {crowdingClass(crowding?.[group.dir])?<h3 className={crowdingClass(crowding?.[group.dir]).trim()} title={crowdingDescription(crowding?.[group.dir],lang)}>{index===0&&<Arrow/>}{index===1&&<CrowdingIndicator value={crowding?.[group.dir]} lang={lang} numeric onInfo={()=>info.current?.showModal()}/>}<span className="v2-crowding-station">{heading(group,station,lang,ui)} · {direction(group,station?.line,ui)}</span>{index===0&&<CrowdingIndicator value={crowding?.[group.dir]} lang={lang} numeric onInfo={()=>info.current?.showModal()}/>}{index===1&&<Arrow right/>}</h3>:<h3>{index===0&&<Arrow/>}<span>{heading(group,station,lang,ui)} · {direction(group,station?.line,ui)}</span>{index===1&&<Arrow right/>}</h3>}
    {[0,1,2].map(i=>{
     // The position feed already ranks all candidates; only the home strip is limited to two.
     const item=!state.error&&group.candidates[i];
     if(!item)return <div className="v2-position-empty" key={i}>—</div>;
     const row=item.row,d=destination(row,lang,station);
     return <article className="v2-arrival-train v2-position-detail-card" key={row.trainNo+'-'+i}>
      <div className="v2-position-card-top"><strong>{positionMessage(item,lang)}</strong><span>{stateText(row,ui)}</span></div>
      <dl>
       <dt>{ui.destination}</dt><dd title={d.full}>{lang==='ko'?row.statnTnm||'—':d.full}</dd>
       <dt>{ui.train}</dt><dd>{row.trainNo||'—'}</dd>
       <dt>{ui.location}</dt><dd>{positionStation(row.statnNm,lang,stationName)} · {stateText(row,ui)}</dd>
      </dl>
      <details className="v2-position-raw">
       <summary>{ui.updated} · {ui.raw}</summary>
       <div className="v2-position-raw-meta">{ui.updated}: {row.recptnDt||'—'}</div>
       <pre>{JSON.stringify(row,null,2)}</pre>
      </details>
     </article>;
    })}
  </section>)}</div>
  {crowding&&Object.keys(crowding).length>0&&<dialog ref={info} className="v2-crowding-dialog" onClick={e=>{if(e.target===info.current)info.current?.close();}}>
   <div className="v2-crowding-dialog-content"><h3>{crowdText.title}</h3>
    {congestionSlot&&<p>{congestionSlot.key.replace('T',' ')} KST</p>}
    {shownGroups.filter(group=>typeof crowding[group.dir]==='number').map(group=><p key={group.dir}>{heading(group,station,lang,ui)} · {crowding[group.dir]}%</p>)}
    <p>{crowdText.note}</p><p>{crowdingPolicyDescription(lang)}</p><button type="button" onClick={()=>info.current?.close()}>{crowdText.close}</button>
   </div>
  </dialog>}
 </section>;
}
