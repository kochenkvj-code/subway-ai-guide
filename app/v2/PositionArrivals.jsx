'use client';
import {positionGroups} from '../arrival-test/position/groups';
import {positionMessage} from '../arrival-test/position/message';
import {positionDestination,positionStation} from '../arrival-test/position/destination';
import {stationName} from '../lib/stationNameI18n';
import graph from '../data/trainLostGraph.json';
import directions from '../data/trainLostDirection.json';

const labels={
 ko:{lead:'다음 열차, 어디쯤 왔을까요?',source:'서울시 실시간 열차 위치정보',refresh:'새로고침',loading:'열차 위치정보 확인 중…',error:'위치정보 조회 실패',unsupported:'선로 연결정보가 없습니다.',empty:'다가오는 열차정보 없음',automatic:'30초 간격 갱신 · 열차 위치 기준',train:'열차번호',destination:'행선지',location:'현재 위치',updated:'정보 기준',raw:'서울시 원문 · JSON',up:'상행',down:'하행',inner:'내선',outer:'외선',entry:'진입',arrived:'도착',left:'출발',previousLeft:'전역 출발'},
 en:{lead:'Where is your next train?',source:'Seoul real-time train positions',refresh:'Refresh',loading:'Checking train positions…',error:'Could not load train positions',unsupported:'Track connections unavailable.',empty:'No approaching train information',automatic:'Updates every 30 seconds · Train positions',train:'Train',destination:'Destination',location:'Current location',updated:'Data as of',raw:'Seoul API original · JSON',up:'Upbound',down:'Downbound',inner:'Inner loop',outer:'Outer loop',entry:'Entering',arrived:'Arrived',left:'Departed',previousLeft:'Left previous station'},
 ja:{lead:'次の電車はどこまで来たかな？',source:'ソウル市リアルタイム列車位置情報',refresh:'更新',loading:'列車位置を確認中…',error:'位置情報を取得できません',unsupported:'線路接続情報がありません。',empty:'接近中の列車情報なし',automatic:'30秒ごとに更新 · 列車位置基準',train:'列車番号',destination:'行先',location:'現在位置',updated:'情報時刻',raw:'ソウル市の原文 · JSON',up:'上り',down:'下り',inner:'内回り',outer:'外回り',entry:'進入',arrived:'到着',left:'出発',previousLeft:'前駅発'},
 zh:{lead:'下一班列车到哪儿了？',source:'首尔市实时列车位置信息',refresh:'刷新',loading:'正在查询列车位置…',error:'无法获取列车位置',unsupported:'暂无线路连接信息。',empty:'暂无接近列车的信息',automatic:'每30秒更新 · 根据列车位置',train:'列车编号',destination:'终点站',location:'当前位置',updated:'信息时间',raw:'首尔市原文 · JSON',up:'上行',down:'下行',inner:'内环',outer:'外环',entry:'进站',arrived:'到站',left:'出站',previousLeft:'前站发车'}
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
export function PositionTrainSummary({state,lang='ko',t,onDetails,stationContext}){
 const ui=labels[lang]||labels.ko,station=stationContext;
 const {groups}=rowsFor(state,station);
 // Reverse the visual columns only: down/inner on the left, up/outer on the right.
 // Preserve the provider's direction and train data, including Eungam handling.
 const shownGroups=[...groups].reverse();
 return <section className="v2-trains v2-position-trains" aria-label={t.next}>
  <div className="v2-summary-board">{shownGroups.map((group,index)=><div className="v2-summary-direction" key={group.dir}>
   <button className="v2-summary-heading" title={heading(group,station,lang,ui)} aria-label={heading(group,station,lang,ui)+' · '+t.detail} onClick={onDetails}>
    {index===0&&<Arrow/>}<span>{heading(group,station,lang,ui)}</span>{index===1&&<Arrow right/>}
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
export function PositionArrivalDetails({state,lang='ko',t,stationContext}){
 const ui=labels[lang]||labels.ko,station=stationContext;
 const {groups}=rowsFor(state,station);
 const shownGroups=[...groups].reverse();
 return <section className="v2-arrival-details v2-position-arrivals">
  <div className="v2-arrival-detail-head">
   <div><h2 title={ui.lead}>{ui.lead}</h2></div>
   <button onClick={state.refresh} disabled={state.loading} title={ui.automatic}>{state.loading?ui.loading:ui.refresh}</button>
  </div>
  <div className="v2-position-detail-grid">{shownGroups.map((group,index)=><section className="v2-arrival-group v2-position-detail-column" key={group.dir}>
    <h3>{index===0&&<Arrow/>}<span>{heading(group,station,lang,ui)} · {direction(group,station?.line,ui)}</span>{index===1&&<Arrow right/>}</h3>
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
 </section>;
}
