'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {officialStationMatches} from '../lib/officialStations';
import {stationName,lineName} from '../lib/stationNameI18n';
import './timetable.css';
const words={
 ko:{subtitle:'역별 열차 시각표',station:'역 검색',stationHint:'다른 역을 검색할 수 있어요',day:['평일','주말'],direction:['상행','하행','내선','외선'],all:'전체',express:'급행만',next:'지금부터',full:'전체 시간표',firstLast:'첫차·막차',first:'첫차',last:'막차',route:'행선지',scheduled:'출발 예정시각',search:'시간표 조회',loading:'시간표를 불러오는 중…',missing:'현재 조건에 해당하는 열차가 없습니다.',invalid:'역 검색 결과에서 역과 호선을 선택해 주세요.',stationNotFound:'선택한 역이 없습니다.',retry:'다시 조회',note:'서울교통공사 제공 예정 운행시각입니다. 실제 운행 및 실시간 도착시각과 다를 수 있습니다.',week:'주말은 제공기관의 주말 시간표로 표시합니다. 토요일·공휴일 구분은 이 API에 별도로 없습니다.',more:'검색결과',placeholder:'역명 입력 (예: 종로5가)',change:'역 변경',total:'편',unknown:'행선지 확인',allPeriod:'전체 운행시각',today:'지금 기준',expressOnly:'급행열차만 표시',notReady:'시간표 자료를 조회할 수 없어요.',noData:'조건에 해당하는 시간표를 찾지 못했어요.',unavailable:'일부 노선의 급행이나 코레일 운영 열차는 제공되지 않을 수 있어요.',truncated:'일부 시간표만 제공될 수 있습니다.'},
 en:{subtitle:'Station train timetable',station:'Find station',stationHint:'Search another station',day:['Weekdays','Weekend'],direction:['Upbound','Downbound','Inner loop','Outer loop'],all:'All trains',express:'Express only',next:'Upcoming',full:'Full timetable',firstLast:'First & last',first:'First train',last:'Last train',route:'Destination',scheduled:'Scheduled time',search:'Show timetable',loading:'Loading timetable…',missing:'No trains match these filters.',invalid:'Please select a station from search results.',stationNotFound:'Station not selected',retry:'Try again',note:'Published scheduled times, not live arrival estimates. Service may change.',week:'The provider groups weekend trains together, without a separate Sunday timetable.',more:'Matches',placeholder:'Search station',change:'Change station',total:'trains',unknown:'Not confirmed',allPeriod:'All day',today:'From now',expressOnly:'Express trains only',notReady:'Timetable unavailable',noData:'No timetable for these filters.',unavailable:'Some express/Korail services may not be covered.',truncated:'Some timetable rows may be missing.'},
 ja:{subtitle:'駅別列車時刻表',station:'駅検索',stationHint:'他の駅も検索できます',day:['平日','週末'],direction:['上り','下り','内回り','外回り'],all:'すべて',express:'急行のみ',next:'これから',full:'全時刻表',firstLast:'始発・終電',first:'始発',last:'終電',route:'行先',scheduled:'予定時刻',search:'時刻表を見る',loading:'読み込み中…',missing:'該当列車はありません。',invalid:'候補から駅を選択してください。',stationNotFound:'駅未選択',retry:'再検索',note:'公表されている予定時刻であり、リアルタイム到着予測とは異なります。',week:'提供元の週末時刻表を使用します。',more:'検索結果',placeholder:'駅名を入力',change:'駅を変更',total:'本',unknown:'未確認',allPeriod:'全時間',today:'今から',expressOnly:'急行のみ',notReady:'時刻表を取得できません',noData:'該当する時刻表がありません',unavailable:'一部の急行・Korail列車は対象外の場合があります。',truncated:'時刻表が一部のみ表示されている可能性があります。'},
 zh:{subtitle:'车站列车时刻表',station:'搜索车站',stationHint:'可搜索其他车站',day:['工作日','周末'],direction:['上行','下行','内环','外环'],all:'全部列车',express:'仅快车',next:'即将出发',full:'全天时刻表',firstLast:'首末班车',first:'首班',last:'末班',route:'终点站',scheduled:'计划时间',search:'查看时刻表',loading:'正在加载…',missing:'没有符合条件的列车。',invalid:'请从搜索结果中选择车站。',stationNotFound:'未选择车站',retry:'重试',note:'所示为官方计划时刻，并非实时到站预测。',week:'运营方统一提供周末时刻表。',more:'搜索结果',placeholder:'输入车站名',change:'更改车站',total:'班',unknown:'待确认',allPeriod:'全天',today:'从现在起',expressOnly:'仅显示快车',notReady:'无法获取时刻表',noData:'没有符合条件的时刻表',unavailable:'部分快车及韩国铁路运营列车可能未涵盖。',truncated:'可能未显示全部班次。'}
};
function seoulNow(){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(new Date());
 return Object.fromEntries(parts.map(x=>[x.type,x.value]));
}
function normalizeLine(line){
 const match=String(line||'').match(/^0?([1-9])호선$/);return match?match[1]:null;
}
function labelForDirection(dir,t){
 return ({상행:t.direction[0],하행:t.direction[1],내선:t.direction[2],외선:t.direction[3]})[dir]||dir;
}
function minuteOf(time){
 const m=String(time||'').match(/^(\d\d):(\d\d)/);return m?Number(m[1])*60+Number(m[2]):-1;
}
export default function TrainTimetable({lang='ko',active=true}){
 const t=words[lang]||words.ko;
 const [selection,setSelection]=useState({name:'종로5가',line:'1'});
 const [query,setQuery]=useState('');
 const [editing,setEditing]=useState(false);
 const [selectedDay,setSelectedDay]=useState(()=>['Sat','Sun'].includes(seoulNow().weekday)?'주말':'평일');
 const [dir,setDir]=useState('상행');
 const [type,setType]=useState('all');
 const [scope,setScope]=useState('upcoming');
 const [data,setData]=useState(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const [now,setNow]=useState(()=>seoulNow());
 const [listLimit,setListLimit]=useState(15);
 const [refreshNonce,setRefreshNonce]=useState(0);
 const fetched=useRef(0);
 const matches=useMemo(()=>query.trim()?officialStationMatches(query,lang,12)
   .flatMap(s=>(s.lines||[s.line]).filter(l=>normalizeLine(l)).map(l=>({name:s.ko.replace(/역$/,''),line:normalizeLine(l),display:s[lang]||s.ko}))):[],[query,lang]);
 useEffect(()=>{const timer=setInterval(()=>setNow(seoulNow()),30000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{
   if(!active)return;
   const ticket=++fetched.current, controller=new AbortController();
   setLoading(true);setError('');setData(null);setListLimit(15);
   const params=new URLSearchParams({station:selection.name,line:selection.line,day:selectedDay,direction:dir});
   fetch('/api/v2/timetable?'+params.toString(),{cache:'no-store',signal:controller.signal})
     .then(async response=>{const result=await response.json();if(!response.ok||!result.ok)throw Error(result.message||t.notReady);return result;})
     .then(result=>{if(ticket===fetched.current&&!controller.signal.aborted)setData(result);})
     .catch(e=>{if(ticket===fetched.current&&!controller.signal.aborted)setError(e.message||t.notReady);})
     .finally(()=>{if(ticket===fetched.current&&!controller.signal.aborted)setLoading(false);});
   return()=>controller.abort();
 },[selection.name,selection.line,selectedDay,dir,active,refreshNonce]);
 function choose(s){
   setSelection({name:s.name,line:s.line});
   setDir(s.line==='2'?'내선':'상행');
   setQuery('');setEditing(false);
   setType('all');setScope('upcoming');
 }
 const directions=selection.line==='2'?['내선','외선']:['상행','하행'];
 const currentDay=['Sat','Sun'].includes(now.weekday)?'주말':'평일';
 const todayMatches=selectedDay===currentDay;
 const mins=Number(now.hour)*60+Number(now.minute);
 const raw=(data?.rows||[]);
 const matching=raw.filter(r=>type!=='express'||r.express);
 const nearNow=matching.filter(r=>{
   const n=minuteOf(r.time);
   if(n<0)return false;
   // Shortly after midnight also include the previous service day's 24:xx entry when present.
   return n>=mins;
 });
 const firstLast=matching.length?[matching[0],matching[matching.length-1]].filter((r,i,arr)=>i===0||r!==arr[0]):[];
 const visible=scope==='firstLast'?firstLast:scope==='upcoming'&&todayMatches?nearNow:matching;
 const displayed=scope==='firstLast'?visible:visible.slice(0,listLimit);
 const applyLabel=stationName(selection.name,lang,false)||selection.name;
 const lineLabel=lineName(selection.line+'호선',lang);
 return <section className="tt-root" aria-label={t.subtitle}>
  <div className="tt-title"><div><span className="tt-eyebrow">TRAIN TIMETABLE</span>
    <h2>{t.subtitle}</h2><p>{t.note}</p></div><span className="tt-train-symbol">▤</span></div>
  <div className="tt-station-card">
    <div className="tt-current"><span className="tt-line-no">{selection.line}</span>
      <div><strong>{applyLabel}</strong><small>{lineLabel}</small></div>
      <button onClick={()=>{setEditing(x=>!x);setQuery('');}}>{t.change} ⌄</button></div>
    {editing&&<div className="tt-station-picker">
      <label htmlFor="tt-station-search">{t.station}</label>
      <input id="tt-station-search" autoFocus placeholder={t.placeholder} value={query} onChange={e=>setQuery(e.target.value)}/>
      {matches.length>0&&<div className="tt-station-matches">{matches.map((s,i)=>
        <button key={s.name+'-'+s.line+'-'+i} onClick={()=>choose(s)}>
          <span className="tt-mini-line">{s.line}</span>{s.display} <small>{lineName(s.line+'호선',lang)}</small>
        </button>)}</div>}
    </div>}
  </div>
  <div className="tt-toggle-wrap"><div className="tt-toggle" role="group" aria-label="운행 요일">
    {['평일','주말'].map((day,i)=><button key={day} className={selectedDay===day?'chosen':''} aria-pressed={selectedDay===day} onClick={()=>{setSelectedDay(day);setScope('full');}}>{t.day[i]}</button>)}
    </div><div className="tt-toggle" role="group" aria-label="열차 방향">
    {directions.map(d=><button key={d} className={dir===d?'chosen':''} aria-pressed={dir===d} onClick={()=>setDir(d)}>{labelForDirection(d,t)}</button>)}</div></div>
  <div className="tt-shortcuts">
    <button onClick={()=>setType('all')} className={type==='all'?'on':''}>{t.all}</button>
    <button onClick={()=>setType('express')} className={type==='express'?'on':''}>{t.express}</button>
    <button onClick={()=>{setScope('upcoming');setListLimit(15);}} className={scope==='upcoming'?'on':''}>{t.next}</button>
    <button onClick={()=>{setScope('full');setListLimit(15);}} className={scope==='full'?'on':''}>{t.full}</button>
    <button onClick={()=>setScope('firstLast')} className={scope==='firstLast'?'on':''}>{t.firstLast}</button>
  </div>
  <div className="tt-table-card">
    <div className="tt-list-head"><strong>{scope==='firstLast'?t.firstLast:scope==='upcoming'&&todayMatches?t.today:t.allPeriod}</strong>
      <small>{loading?'…':matching.length+' '+t.total}</small></div>
    {loading?<div className="tt-state" role="status">{t.loading}</div>:
     error?<div className="tt-state tt-error" role="alert">{error}<button onClick={()=>setRefreshNonce(x=>x+1)}>{t.retry}</button></div>:
     displayed.length===0?<div className="tt-state">{t.noData}</div>:
     <div className="tt-trains">{displayed.map((train,i)=>
       <div className="tt-train" key={[train.time,train.number,train.destination,i].join(':')}>
         <div className="tt-time">{scope==='firstLast'&&<small>{i===0?t.first:t.last}</small>}<strong>{train.time}</strong></div>
         <div className="tt-dest"><strong>{train.destination?stationName(train.destination,lang):t.unknown}</strong>
           <span>{train.number?('#'+train.number):''}{train.origin?' · '+stationName(train.origin,lang):''}</span></div>
         {train.express&&<span className="tt-express">{t.express}</span>}
       </div>)}</div>}
     {!loading&&!error&&visible.length>displayed.length&&<button className="tt-more" onClick={()=>setListLimit(v=>v+20)}>+ {t.full} ({visible.length-displayed.length})</button>}
     {data?.truncated&&<p className="tt-warning">{t.truncated}</p>}
  </div>
  <p className="tt-disclaimer">{t.week} {t.unavailable}</p>
  <div className="tt-source">SOURCE · 서울교통공사 열차시간표 Open API</div>
 </section>;
}
