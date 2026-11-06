'use client';
import {rawArrivalGroups} from '../lib/raw-arrival-groups';
import {stationName} from '../lib/stationNameI18n';

const COPY={
 ko:{loading:'도착정보 확인 중…',error:'도착정보 조회 실패',empty:'서울시 원본 응답에 해당 순위 정보 없음',updated:'조회 시각',source:'서울시 실시간 지하철 도착정보',refresh:'새로고침',automatic:'30초마다 원본 조회',train:'열차번호',destination:'행선지',location:'원본 위치 메시지',received:'원본 생성시각',note:'서울시 원본 도착안내 문구를 표시합니다. 예상시간을 재계산하거나 시간 경과로 열차를 제외하지 않습니다.',other:'순위 없는 원본 정보',first:'첫 번째 열차',second:'두 번째 열차'},
 en:{loading:'Loading arrivals…',error:'Arrival request failed',empty:'No provider row for this rank',updated:'Fetched',source:'Seoul subway live arrivals',refresh:'Refresh',automatic:'Provider refresh every 30 seconds',train:'Train number',destination:'Destination',location:'Provider location message',received:'Provider timestamp',note:'Original Korean provider messages are displayed without modifying arrival times or excluding rows by age.',other:'Other provider rows',first:'First train',second:'Second train'},
 ja:{loading:'到着情報を取得中…',error:'到着情報の取得に失敗しました',empty:'この順位の元データはありません',updated:'取得時刻',source:'ソウル市 地下鉄リアルタイム到着情報',refresh:'更新',automatic:'30秒ごとに元データを取得',train:'列車番号',destination:'行先',location:'元データの位置メッセージ',received:'元データの時刻',note:'ソウル市の元の案内文を表示し、到着時間の再計算や時間による除外は行いません。',other:'その他の元データ',first:'1番目の列車',second:'2番目の列車'},
 zh:{loading:'正在查询到站信息…',error:'查询失败',empty:'此序位没有原始记录',updated:'查询时间',source:'首尔市地铁实时到站信息',refresh:'刷新',automatic:'每30秒查询原始数据',train:'列车编号',destination:'终点站',location:'原始位置消息',received:'原始数据时间',note:'显示首尔市原始韩文消息，不重新计算到站时间，也不按时间过滤列车。',other:'其他原始记录',first:'第一列车',second:'第二列车'},
};
const DIRECTIONS={
 ko:{상행:'상행',하행:'하행',내선:'내선',외선:'외선'},
 en:{상행:'Upbound',하행:'Downbound',내선:'Inner loop',외선:'Outer loop'},
 ja:{상행:'上り',하행:'下り',내선:'内回り',외선:'外回り'},
 zh:{상행:'上行',하행:'下行',내선:'内环',외선:'外环'}
};
function heading(group,lang){
 const directions=DIRECTIONS[lang]||DIRECTIONS.ko;
 const label=directions[group.provider]||group.provider;
 const next=group.nextStations.map(n=>stationName(n,lang)).join(' · ');
 if(!next)return label;
 const bound={ko:'방면',en:'toward',ja:'方面',zh:'方向'}[lang]||'방면';
 return lang==='en'?next+' · '+bound+' · '+label:next+' '+bound+' · '+label;
}
function destination(row,lang){
 if(!row)return '—';
 const full=String(row.trainLineNm||'').trim();
 const raw=full.split(/\s+[-–—]\s+/)[0]?.trim()||String(row.bstatnNm||'').trim();
 if(lang==='ko')return raw||'—';
 const match=raw.match(/^(.+?)행$/);
 if(!match)return raw||'—';
 const translated=stationName(match[1],lang);
 return lang==='ja'?translated+'行':lang==='zh'?'开往'+translated:translated;
}
function rawGroups(state,stationContext){
 return rawArrivalGroups(state.data?.raw,stationContext||state.data?.station||null);
}
function message(state,labels){
 if(state.error&&!state.data)return labels.error;
 if(!state.data)return labels.loading;
 return null;
}
function time(value){
 if(!value)return '—';
 const d=new Date(value);
 return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(d);
}
function rowsFor(group,rank){return rank===1?group.first:group.second;}
export function TrainSummary({state,lang,t,onDetails,stationContext=null}){
 const labels=COPY[lang]||COPY.ko,notice=message(state,labels);
 const groups=rawGroups(state,stationContext);
 return <section className="v2-trains" aria-label={t.next}>
  <div className="v2-summary-board">{groups.map((group,index)=><div className="v2-summary-direction" key={group.provider}>
   <button className="v2-summary-heading" title={heading(group,lang)} onClick={onDetails} aria-label={heading(group,lang)+' · '+t.detail}>
    {index%2===0&&<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6"/></svg>}
    <span>{heading(group,lang)}</span>
    {index%2===1&&<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>}
   </button>
   {[1,2].map(rank=>{
    const row=rowsFor(group,rank)[0];
    return <div className="v2-summary-train v2-raw-arrival-train" key={rank}>
     <span className="v2-raw-arrival-label"><span className="v2-summary-destination" title={destination(row,lang)}>{destination(row,lang)}</span>{row?.arvlMsg3&&<small title={String(row.arvlMsg3)}>{String(row.arvlMsg3)}</small>}</span>
     <b className={row?'v2-arrival-available':''} title={row?String(row.arvlMsg2??''):''}>{row?String(row.arvlMsg2??'—'):'—'}</b>
    </div>;
   })}
  </div>)}</div>
  {notice&&<div className="v2-summary-notice" role="status"><span>{notice}</span><button onClick={state.refresh} disabled={state.loading} aria-label={labels.refresh}>↻</button></div>}
  {state.error&&state.data&&<div className="v2-summary-notice" role="status">{labels.error}</div>}
 </section>;
}
function RawTrainCard({row,lang,labels}){
 return <article className="v2-arrival-train v2-raw-arrival-card">
  <div><strong>{row.arvlMsg2===undefined?'—':String(row.arvlMsg2)}</strong><span>{String(row.btrainSttus||'')}{row.lstcarAt==='1'?' · LAST':''}</span></div>
  <p className="v2-raw-location">{labels.location} · {row.arvlMsg3===undefined?'—':String(row.arvlMsg3)}</p>
  <dl><dt>{labels.destination}</dt><dd>{destination(row,lang)}</dd><dt>{labels.train}</dt><dd>{String(row.btrainNo||'—')}</dd><dt>ordkey</dt><dd>{String(row.ordkey||'—')}</dd><dt>arvlCd</dt><dd>{String(row.arvlCd??'—')}</dd></dl>
  <small>{labels.received} · {String(row.recptnDt||'—')}</small>
 </article>;
}
export function ArrivalDetails({state,lang,t,stationContext=null}){
 const labels=COPY[lang]||COPY.ko,notice=message(state,labels);
 const groups=rawGroups(state,stationContext),name=stationContext?.names?.[lang]||t.station;
 return <section className="v2-arrival-details">
  <div className="v2-arrival-detail-head"><div><small>{labels.source}</small><h2>{name} · {t.next}</h2></div>
   <button onClick={state.refresh} disabled={state.loading}>{state.loading?labels.loading:labels.refresh}</button></div>
  <p className="v2-arrival-caption">{labels.automatic}{state.data?.fetchedAt?' · '+labels.updated+' '+time(state.data.fetchedAt)+' KST':''}</p>
  {notice&&<p className="v2-arrival-message" role="status">{notice}</p>}
  {state.error&&state.data&&<p className="v2-arrival-message" role="status">{labels.error}</p>}
  {groups.map(group=><section key={group.provider} className="v2-arrival-group"><h3>{heading(group,lang)}</h3>
   {[1,2].map(rank=><div key={rank}><p className="v2-raw-rank-label">{rank===1?labels.first:labels.second}</p>
    {rowsFor(group,rank).length?rowsFor(group,rank).map((row,i)=><RawTrainCard key={i} row={row} lang={lang} labels={labels}/>):<p className="v2-arrival-empty">{labels.empty}</p>}
   </div>)}
   {group.other.length>0&&<div><p className="v2-raw-rank-label">{labels.other}</p>{group.other.map((row,i)=><RawTrainCard key={i} row={row} lang={lang} labels={labels}/>)}</div>}
  </section>)}
  <p className="v2-arrival-caption">{labels.note}</p>
 </section>;
}
