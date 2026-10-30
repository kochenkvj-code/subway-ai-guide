'use client';
import { useEffect, useState } from 'react';
import { ARRIVAL_DIRECTIONS, arrivalStatus } from '../lib/train-arrivals';
import { stationName } from '../lib/stationNameI18n';
const COPY={
  ko:{loading:'도착정보 확인 중…',error:'도착정보 조회 실패',empty:'확인 가능한 도착정보 없음',stale:'도착정보 갱신 지연',updated:'정보 기준',refresh:'새로고침',automatic:'30초 간격 갱신',source:'서울시 실시간 지하철 도착정보',train:'열차번호',destination:'행선지',bound:'방면',minutes:n=>`약 ${n}분 후`,approaching:'진입 중',arrived:'도착',previousDeparted:'전역 출발',previousApproaching:'전역 진입',previousArrived:'전역 도착',general:'일반',express:'급행',special:'특급',last:'막차',notConfigured:'관리자가 도착정보 API 환경변수를 확인해야 합니다.',note:'도착시간은 예상값이며 실제 운행과 다를 수 있습니다. 다음 역 방향과 열차의 최종 행선지는 다를 수 있습니다.',position:'열차 위치도는 추후 연결 예정입니다.'},
  en:{loading:'Checking arrivals…',error:'Could not load arrivals',empty:'No current arrival information',stale:'Arrival updates delayed',updated:'Data as of',refresh:'Refresh',automatic:'Updates every 30 seconds',source:'Seoul real-time subway arrivals',train:'Train',destination:'Destination',bound:'Toward',minutes:n=>`About ${n} min`,approaching:'Approaching',arrived:'Arrived',previousDeparted:'Left previous station',previousApproaching:'Approaching previous station',previousArrived:'At previous station',general:'Local',express:'Express',special:'Limited express',last:'Last train',notConfigured:'The administrator needs to check the arrival API configuration.',note:'Arrival times are estimates and may differ from actual operations. The next-station direction is not necessarily the final destination.',position:'The train position diagram will be added later.'},
  ja:{loading:'到着情報を確認中…',error:'到着情報を取得できません',empty:'現在の到着情報はありません',stale:'到着情報の更新が遅れています',updated:'情報時刻',refresh:'更新',automatic:'30秒ごとに更新',source:'ソウル市 地下鉄リアルタイム到着情報',train:'列車番号',destination:'行先',bound:'方面',minutes:n=>`約${n}分後`,approaching:'まもなく到着',arrived:'到着',previousDeparted:'前駅を出発',previousApproaching:'前駅に接近',previousArrived:'前駅に到着',general:'普通',express:'急行',special:'特急',last:'終電',notConfigured:'管理者による到着情報APIの設定確認が必要です。',note:'到着時間は予測であり、実際の運行と異なる場合があります。次駅の方向と最終行先は異なる場合があります。',position:'列車位置の図は今後追加予定です。'},
  zh:{loading:'正在查询到站信息…',error:'无法获取到站信息',empty:'暂无可用到站信息',stale:'到站信息更新延迟',updated:'信息时间',refresh:'刷新',automatic:'每30秒更新',source:'首尔市地铁实时到站信息',train:'列车编号',destination:'终点站',bound:'方向',minutes:n=>`约${n}分钟后`,approaching:'正在进站',arrived:'已到站',previousDeparted:'已离开前一站',previousApproaching:'正在进入前一站',previousArrived:'已到达前一站',general:'普通',express:'快速',special:'特快',last:'末班车',notConfigured:'需要管理员检查到站API配置。',note:'到站时间为预计时间，可能与实际运行不同。下一站方向不一定是列车最终目的地。',position:'列车位置示意图将在后续接入。'},
};
function useNow(active){const[now,setNow]=useState(()=>Date.now());useEffect(()=>{if(!active)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[active]);return now;}
function statusText(status,t){return status.state==='minutes'?t.minutes(status.minutes):t[status.state];}
function summaryText(status,t,lang){
  if(status.state==='minutes')return ({ko:`약 ${status.minutes}분`,en:`~${status.minutes} min`,ja:`約${status.minutes}分`,zh:`约${status.minutes}分钟`})[lang];
  if(lang==='en')return ({approaching:'Arriving',arrived:'Arrived',previousDeparted:'Prev. left',previousApproaching:'Prev. entry',previousArrived:'Prev. stop'})[status.state];
  return statusText(status,t);
}

function time(value,lang){return new Intl.DateTimeFormat(lang==='ko'?'ko-KR':'en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(value));}
function usable(group,now){return (group?.trains||[]).map(train=>({train,status:arrivalStatus(train,now)})).filter(x=>x.status);}
function infoMessage(state,t,now){if(state.error)return t.error;if(!state.data)return t.loading;if(state.data.status==='stale'||now-Date.parse(state.data.fetchedAt)>180000)return t.stale;if(!state.data.groups.some(group=>usable(group,now).length))return state.data.status==='empty'?t.empty:t.stale;return null;}
export function TrainSummary({state,lang,t,onDetails,active}) {
  const labels=COPY[lang],now=useNow(active),message=infoMessage(state,labels,now);
  return <section className="v2-trains" aria-label={t.next}>
    <div className="v2-train-head"><div><span className="v2-line">1</span><strong>{t.station}</strong><span className="v2-separator">·</span><span>{t.next}</span></div><button onClick={onDetails}>{t.detail} ↗</button></div>
    <div className="v2-directions">{t.direction.map((direction,index)=>{
      const selected=usable(state.data?.groups?.[index],now)[0];
      return <div key={direction}><span>{lang==='en'?stationName(ARRIVAL_DIRECTIONS[index].nextStation,lang)+' →':direction}</span><b className={selected&&!message?'v2-arrival-available':''}>{selected&&!message?summaryText(selected.status,labels,lang):'—'}</b></div>;
    })}</div>
    <div className="v2-arrival-footer"><p role={state.error?'status':undefined}>{message||`${labels.updated} ${time(state.data.updatedAt||state.data.fetchedAt,lang)} · KST`}</p><button onClick={state.refresh} disabled={state.loading} aria-label={labels.refresh}>↻</button></div>
  </section>;
}
export function ArrivalDetails({state,lang,t}) {
  const labels=COPY[lang],now=useNow(true),message=infoMessage(state,labels,now);
  return <section className="v2-arrival-details">
    <div className="v2-arrival-detail-head"><div><small>{labels.source}</small><h2>{t.station} · {t.next}</h2></div><button onClick={state.refresh} disabled={state.loading}>{state.loading?labels.loading:labels.refresh}</button></div>
    <p className="v2-arrival-caption">{labels.automatic}{state.data?.updatedAt?` · ${labels.updated} ${time(state.data.updatedAt,lang)} KST`:''}</p>
    {message&&<p className="v2-arrival-message" role="status">{message}{state.error==='NOT_CONFIGURED'&&<span>{labels.notConfigured}</span>}</p>}
    {t.direction.map((direction,index)=>{
      const trains=message?[]:usable(state.data?.groups?.[index],now);
      return <section key={direction} className="v2-arrival-group"><h3>{direction}</h3>{!trains.length?<p className="v2-arrival-empty">{labels.empty}</p>:trains.map(({train,status},i)=><article key={train.trainNo||i} className="v2-arrival-train"><div><strong>{statusText(status,labels)}</strong><span>{train.kind==='급행'?labels.express:train.kind==='특급'?labels.special:labels.general}{train.lastTrain?` · ${labels.last}`:''}</span></div><dl><dt>{labels.destination}</dt><dd>{stationName(train.destination,lang)}</dd><dt>{labels.train}</dt><dd>{train.trainNo||'—'}</dd></dl>{lang==='ko'&&train.message&&<p>{train.message}</p>}<small>{labels.updated} {time(train.receivedAt,lang)} KST</small></article>)}</section>;
    })}
    <p className="v2-arrival-caption">{labels.note}</p><p className="v2-arrival-caption">{labels.position}</p>
  </section>;
}
