'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {officialStationMatches} from '../lib/officialStations';
import {stationName,lineName} from '../lib/stationNameI18n';
import './timetable.css';
const words={
 ko:{overview:'요약',hourly:'전체 시간표',soon:'다음 운행 열차',firstLastSummary:'첫차 · 막차',hourSelect:'시간대 선택',moreRows:'열차 더 보기',backSummary:'요약으로 돌아가기',noUpcoming:'이후 예정된 열차가 없습니다.',noHour:'선택한 시간대의 열차가 없습니다.',firstLastCaution:'※ 목적지에 따라 마지막으로 이용할 수 있는 열차가 다릅니다.',allData:'전체 조회 결과',allDirections:'전체',partial:'일부 방향 조회에 실패해 나머지만 표시합니다:',subtitle:'역별 열차 시각표',station:'역 검색',stationHint:'다른 역을 검색할 수 있어요',day:['평일','주말'],direction:['상행','하행','내선','외선'],all:'전체',express:'급행만',next:'지금부터',full:'전체 시간표',firstLast:'첫차·막차',first:'첫차',last:'막차',route:'행선지',scheduled:'출발 예정시각',search:'시간표 조회',loading:'시간표를 불러오는 중…',missing:'현재 조건에 해당하는 열차가 없습니다.',invalid:'역 검색 결과에서 역과 호선을 선택해 주세요.',stationNotFound:'선택한 역이 없습니다.',retry:'다시 조회',note:'서울교통공사 제공 예정 운행시각입니다. 실제 운행 및 실시간 도착시각과 다를 수 있습니다.',week:'주말은 제공기관의 주말 시간표로 표시합니다. 토요일·공휴일 구분은 이 API에 별도로 없습니다.',more:'검색결과',placeholder:'역명 입력 (예: 종로5가)',change:'역 변경',total:'편',unknown:'행선지 확인',allPeriod:'전체 운행시각',today:'지금 기준',expressOnly:'급행열차만 표시',notReady:'시간표 자료를 조회할 수 없어요.',noData:'조건에 해당하는 시간표를 찾지 못했어요.',unavailable:'일부 노선의 급행이나 코레일 운영 열차는 제공되지 않을 수 있어요.',truncated:'일부 시간표만 제공될 수 있습니다.'},
 en:{overview:'Summary',hourly:'Full timetable',soon:'Upcoming trains',firstLastSummary:'First & last trains',hourSelect:'Choose an hour',moreRows:'Show more trains',backSummary:'Back to summary',noUpcoming:'No more scheduled trains.',noHour:'No trains in this hour.',firstLastCaution:'Last usable trains vary by destination.',allData:'All scheduled services',allDirections:'Both',partial:'Partial results; unavailable direction:',subtitle:'Station train timetable',station:'Find station',stationHint:'Search another station',day:['Weekdays','Weekend'],direction:['Upbound','Downbound','Inner loop','Outer loop'],all:'All trains',express:'Express only',next:'Upcoming',full:'Full timetable',firstLast:'First & last',first:'First train',last:'Last train',route:'Destination',scheduled:'Scheduled time',search:'Show timetable',loading:'Loading timetable…',missing:'No trains match these filters.',invalid:'Please select a station from search results.',stationNotFound:'Station not selected',retry:'Try again',note:'Published scheduled times, not live arrival estimates. Service may change.',week:'The provider groups weekend trains together, without a separate Sunday timetable.',more:'Matches',placeholder:'Search station',change:'Change station',total:'trains',unknown:'Not confirmed',allPeriod:'All day',today:'From now',expressOnly:'Express trains only',notReady:'Timetable unavailable',noData:'No timetable for these filters.',unavailable:'Some express/Korail services may not be covered.',truncated:'Some timetable rows may be missing.'},
 ja:{overview:'概要',hourly:'全時刻表',soon:'次の列車',firstLastSummary:'始発・終電',hourSelect:'時間帯を選択',moreRows:'さらに表示',backSummary:'概要に戻る',noUpcoming:'これ以降の列車はありません。',noHour:'この時間帯の列車はありません。',firstLastCaution:'※ 最終列車は行先によって異なります。',allData:'全運行予定',allDirections:'すべて',partial:'一部の方向を取得できませんでした:',subtitle:'駅別列車時刻表',station:'駅検索',stationHint:'他の駅も検索できます',day:['平日','週末'],direction:['上り','下り','内回り','外回り'],all:'すべて',express:'急行のみ',next:'これから',full:'全時刻表',firstLast:'始発・終電',first:'始発',last:'終電',route:'行先',scheduled:'予定時刻',search:'時刻表を見る',loading:'読み込み中…',missing:'該当列車はありません。',invalid:'候補から駅を選択してください。',stationNotFound:'駅未選択',retry:'再検索',note:'公表されている予定時刻であり、リアルタイム到着予測とは異なります。',week:'提供元の週末時刻表を使用します。',more:'検索結果',placeholder:'駅名を入力',change:'駅を変更',total:'本',unknown:'未確認',allPeriod:'全時間',today:'今から',expressOnly:'急行のみ',notReady:'時刻表を取得できません',noData:'該当する時刻表がありません',unavailable:'一部の急行・Korail列車は対象外の場合があります。',truncated:'時刻表が一部のみ表示されている可能性があります。'},
 zh:{overview:'概览',hourly:'完整时刻表',soon:'后续列车',firstLastSummary:'首末班车',hourSelect:'选择时段',moreRows:'查看更多',backSummary:'返回概览',noUpcoming:'暂无后续计划列车。',noHour:'该时段没有列车。',firstLastCaution:'※ 末班车因目的地而异。',allData:'全部计划班次',allDirections:'全部',partial:'部分方向查询失败:',subtitle:'车站列车时刻表',station:'搜索车站',stationHint:'可搜索其他车站',day:['工作日','周末'],direction:['上行','下行','内环','外环'],all:'全部列车',express:'仅快车',next:'即将出发',full:'全天时刻表',firstLast:'首末班车',first:'首班',last:'末班',route:'终点站',scheduled:'计划时间',search:'查看时刻表',loading:'正在加载…',missing:'没有符合条件的列车。',invalid:'请从搜索结果中选择车站。',stationNotFound:'未选择车站',retry:'重试',note:'所示为官方计划时刻，并非实时到站预测。',week:'运营方统一提供周末时刻表。',more:'搜索结果',placeholder:'输入车站名',change:'更改车站',total:'班',unknown:'待确认',allPeriod:'全天',today:'从现在起',expressOnly:'仅显示快车',notReady:'无法获取时刻表',noData:'没有符合条件的时刻表',unavailable:'部分快车及韩国铁路运营列车可能未涵盖。',truncated:'可能未显示全部班次。'}
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

function CompactTrainRow({train,lang,t,showDirection=false}){
 return <div className="tt2-train-row">
   <strong className="tt2-train-time">{train.time}</strong>
   <div className="tt2-train-dest"><strong>{train.destination?stationName(train.destination,lang):t.unknown}</strong>{train.number&&<small>#{train.number}</small>}</div>
   {showDirection&&<span className="tt2-dir-badge">{labelForDirection(train.direction,t)}</span>}
   {train.express&&<span className="tt2-express-badge">{t.express}</span>}
 </div>;
}

export default function TrainTimetable({lang='ko',active=true,stationContext=null}){
 const t=words[lang]||words.ko;
 const [selection,setSelection]=useState({name:stationContext?.names.ko||'종로5가',line:stationContext?.line||'1'});
 const [query,setQuery]=useState('');
 const [editing,setEditing]=useState(false);
 const [selectedDay,setSelectedDay]=useState(()=>['Sat','Sun'].includes(seoulNow().weekday)?'주말':'평일');
 const [dir,setDir]=useState('전체');
 const [type,setType]=useState('all');
 const [mode,setMode]=useState('overview');
 const [hourChoice,setHourChoice]=useState(null);
 const [data,setData]=useState(null);
 const [error,setError]=useState('');
 const [partialWarning,setPartialWarning]=useState('');
 const [loading,setLoading]=useState(false);
 const [now,setNow]=useState(()=>seoulNow());
 const [listLimit,setListLimit]=useState(8);
 const [refreshNonce,setRefreshNonce]=useState(0);
 const fetched=useRef(0);
 const matches=useMemo(()=>query.trim()?officialStationMatches(query,lang,12)
   .flatMap(s=>(s.lines||[s.line]).filter(l=>normalizeLine(l)).map(l=>({name:s.ko.replace(/역$/,''),line:normalizeLine(l),display:s[lang]||s.ko}))):[],[query,lang]);
 useEffect(()=>{const timer=setInterval(()=>setNow(seoulNow()),30000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{
   if(!active)return;
   const ticket=++fetched.current, controller=new AbortController();
   setLoading(true);setError('');setPartialWarning('');setData(null);setListLimit(8);
   const requested=selection.line==='2'?['내선','외선']:['상행','하행'];
   async function loadOne(direction){
     const params=new URLSearchParams({station:selection.name,line:selection.line,day:selectedDay,direction});
     if(stationContext)params.set('stationCode',stationContext.stationCode);
     const response=await fetch('/api/v2/timetable?'+params.toString(),{cache:'no-store',signal:controller.signal});
     const result=await response.json();
     if(stationContext&&result.stationCode!==stationContext.stationCode)throw Error(t.notReady);
     if(!response.ok||!result.ok)throw Error(result.message||t.notReady);
     return {...result,rows:(result.rows||[]).map(train=>({...train,direction}))};
   }
   Promise.allSettled(requested.map(loadOne))
     .then(results=>{
       if(ticket!==fetched.current||controller.signal.aborted)return;
       const good=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
       const missing=results.map((r,i)=>r.status==='rejected'?requested[i]:null).filter(Boolean);
       if(!good.length){
         const reason=results.find(r=>r.status==='rejected')?.reason;
         throw Error(reason?.message||t.notReady);
       }
       const combined=good.flatMap(g=>g.rows).sort((a,b)=>a.time.localeCompare(b.time)||
         a.direction.localeCompare(b.direction,'ko')||a.number.localeCompare(b.number));
       setData({rows:combined,truncated:good.some(g=>g.truncated),total:good.reduce((n,g)=>n+(g.total||0),0)});
       if(missing.length)setPartialWarning(t.partial+' '+missing.map(d=>labelForDirection(d,t)).join(', '));
     })
     .catch(e=>{if(ticket===fetched.current&&!controller.signal.aborted)setError(e.message||t.notReady);})
     .finally(()=>{if(ticket===fetched.current&&!controller.signal.aborted)setLoading(false);});
   return()=>controller.abort();
 },[selection.name,selection.line,selectedDay,active,refreshNonce]);
 function choose(s){
   setSelection({name:s.name,line:s.line});
   setDir('전체');
   setQuery('');setEditing(false);
   setType('all');setMode('overview');setHourChoice(null);
 }
 const directions=selection.line==='2'?['내선','외선']:['상행','하행'];
 const currentDay=['Sat','Sun'].includes(now.weekday)?'주말':'평일';
 const todayMatches=selectedDay===currentDay;
 const mins=Number(now.hour)*60+Number(now.minute);
 const raw=data?.rows||[];
 // Fetch both directions once; local direction/express/hour controls do not refetch.
 const matching=raw.filter(r=>(dir==='전체'||r.direction===dir)&&(type!=='express'||r.express));
 const summaryDirs=(dir==='전체'?directions:[dir]).map(direction=>{
   const rows=matching.filter(r=>r.direction===direction);
   const upcoming=(todayMatches?rows.filter(r=>minuteOf(r.time)>=mins):rows).slice(0,3);
   return {direction,rows,upcoming,first:rows[0]||null,last:rows[rows.length-1]||null};
 });
 const availableHours=[...new Set(matching.map(r=>Math.floor(minuteOf(r.time)/60)).filter(h=>h>=0))].sort((a,b)=>a-b);
 const selectedHour=hourChoice!==null&&availableHours.includes(hourChoice)?hourChoice:
   (todayMatches?availableHours.find(h=>h>=Number(now.hour)):null)??availableHours[0];
 const hourRows=matching.filter(r=>Math.floor(minuteOf(r.time)/60)===selectedHour);
 const shownHourRows=hourRows.slice(0,listLimit);
 const applyLabel=stationContext?.names[lang]||stationName(selection.name,lang,false)||selection.name;
 const lineLabel=lineName(selection.line+'호선',lang);
 const chooseDirection=(direction)=>{setDir(direction);setHourChoice(null);setListLimit(8);};
 return <section className="tt-root tt2-root" aria-label={t.subtitle}>
   <header className="tt2-heading"><div><span className="tt-eyebrow">TRAIN TIMETABLE</span><h2>{t.subtitle}</h2></div><span className="tt2-heading-icon" aria-hidden="true">▤</span></header>
   <div className="tt2-topbar">
     <div className="tt2-station">
       <span className="tt2-line-no" style={stationContext?{background:stationContext.color}:undefined}>{selection.line}</span>
       <div className="tt2-station-text"><strong>{applyLabel}</strong><small>{lineLabel}</small></div>
       {!stationContext&&<button className="tt2-change-station" onClick={()=>{setEditing(x=>!x);setQuery('');}}>{t.change} ⌄</button>}
     </div>
     {!stationContext&&editing&&<div className="tt-station-picker">
       <label htmlFor="tt-station-search">{t.station}</label>
       <input id="tt-station-search" autoFocus placeholder={t.placeholder} value={query} onChange={e=>setQuery(e.target.value)}/>
       {matches.length>0&&<div className="tt-station-matches">{matches.map((s,i)=>
         <button key={s.name+'-'+s.line+'-'+i} onClick={()=>choose(s)}><span className="tt-mini-line">{s.line}</span>{s.display}<small>{lineName(s.line+'호선',lang)}</small></button>
       )}</div>}
     </div>}
     <div className="tt2-day-switch" role="group" aria-label={t.day.join(' / ')}>
       {['평일','주말'].map((day,i)=><button key={day} type="button" className={selectedDay===day?'active':''} aria-pressed={selectedDay===day} onClick={()=>{setSelectedDay(day);setHourChoice(null);}}>{t.day[i]}</button>)}
     </div>
   </div>
   <div className="tt2-direction" role="group" aria-label={t.allDirections}>
     {['전체',...directions].map(direction=><button key={direction} type="button" className={dir===direction?'active':''} aria-pressed={dir===direction} onClick={()=>chooseDirection(direction)}>{direction==='전체'?t.allDirections:labelForDirection(direction,t)}</button>)}
   </div>
   <div className="tt2-actions">
     <div className="tt2-mode-tabs" role="group" aria-label={t.subtitle}>
       <button type="button" className={mode==='overview'?'active':''} aria-pressed={mode==='overview'} onClick={()=>setMode('overview')}>{t.overview}</button>
       <button type="button" className={mode==='hourly'?'active':''} aria-pressed={mode==='hourly'} onClick={()=>{setMode('hourly');setListLimit(8);}}>{t.hourly}</button>
     </div>
     <button type="button" className={'tt2-express-filter '+(type==='express'?'active':'')} aria-pressed={type==='express'} onClick={()=>{setType(v=>v==='express'?'all':'express');setHourChoice(null);setListLimit(8);}}>{t.express}</button>
   </div>
   {partialWarning&&!loading&&!error&&<p className="tt-warning" role="status">{partialWarning}</p>}
   {loading?<div className="tt-state" role="status">{t.loading}</div>:
    error?<div className="tt-state tt-error" role="alert">{error}<button onClick={()=>setRefreshNonce(x=>x+1)}>{t.retry}</button></div>:
    mode==='overview'?<div className="tt2-body">
      <div className="tt2-section-label"><strong>{todayMatches?t.soon:t.allPeriod}</strong><small>{selectedDay===currentDay?t.today:t.day[selectedDay==='평일'?0:1]}</small></div>
      {summaryDirs.map(group=><div className="tt2-panel" key={group.direction}>
        <div className="tt2-panel-head"><strong>{labelForDirection(group.direction,t)}</strong><small>{group.rows.length} {t.total}</small></div>
        {group.upcoming.length?group.upcoming.map((train,i)=><CompactTrainRow key={train.time+'-'+train.number+'-'+i} train={train} lang={lang} t={t}/>):<p className="tt2-empty">{group.rows.length?t.noUpcoming:t.noData}</p>}
      </div>)}
      <div className="tt2-section-label tt2-first-title"><strong>{t.firstLastSummary}</strong></div>
      <div className="tt2-panel tt2-first-panel">
        {summaryDirs.map(group=><div className="tt2-first-group" key={group.direction}>
          <div className="tt2-first-direction">{labelForDirection(group.direction,t)}</div>
          <div className="tt2-first-pair">
            <div><small>{t.first}</small><strong>{group.first?.time||'—'}</strong><span>{group.first?.destination?stationName(group.first.destination,lang):''}</span></div>
            <div><small>{t.last}</small><strong>{group.last?.time||'—'}</strong><span>{group.last?.destination?stationName(group.last.destination,lang):''}</span></div>
          </div>
        </div>)}
        <p className="tt2-first-note">{t.firstLastCaution}</p>
      </div>
      <button type="button" className="tt2-full-cta" onClick={()=>{setMode('hourly');setListLimit(8);}}>{t.hourly}<span aria-hidden="true">→</span></button>
    </div>:<div className="tt2-body">
      <div className="tt2-section-label"><strong>{t.hourSelect}</strong><small>{matching.length} {t.total}</small></div>
      <div className="tt2-hour-strip" role="group" aria-label={t.hourSelect}>
        {availableHours.map(h=><button type="button" key={h} className={selectedHour===h?'active':''} aria-pressed={selectedHour===h} onClick={()=>{setHourChoice(h);setListLimit(8);}}>{String(h).padStart(2,'0')}:00</button>)}
      </div>
      <div className="tt2-panel">
        <div className="tt2-panel-head"><strong>{selectedHour!==undefined?String(selectedHour).padStart(2,'0')+':00':'—'} · {dir==='전체'?t.allDirections:labelForDirection(dir,t)}</strong><small>{hourRows.length} {t.total}</small></div>
        {shownHourRows.length?shownHourRows.map((train,i)=><CompactTrainRow key={train.time+'-'+train.direction+'-'+train.number+'-'+i} train={train} lang={lang} t={t} showDirection={dir==='전체'}/>):<p className="tt2-empty">{t.noHour}</p>}
        {hourRows.length>shownHourRows.length&&<button type="button" className="tt2-load-more" onClick={()=>setListLimit(n=>n+12)}>{t.moreRows} ({hourRows.length-shownHourRows.length})</button>}
      </div>
      <button type="button" className="tt2-back-summary" onClick={()=>setMode('overview')}>← {t.backSummary}</button>
    </div>}
   {data?.truncated&&<p className="tt-warning">{t.truncated}</p>}
   <p className="tt-disclaimer">{t.note} {t.week} {t.unavailable}</p>
   <div className="tt-source">SOURCE · 서울교통공사 열차시간표 Open API</div>
 </section>;
}
