'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {timetableStation,timetableStations,serviceClock,defaultDay,nextDeparturesByColumn} from '../../lib/timetable-lab-model';
import {officialStationName} from '../../lib/officialStations';
import {copy as baseCopy} from '../timetable-lab/copy';
import {operationTimetableColumns} from '../../lib/operation-timetable-model';
import {CONGESTION_THRESHOLDS} from '../../lib/congestion-data';
import {createCrowdingModel,crowdingGradient,crowdingColors} from '../../lib/timetable-lab-crowding-view';
import '../timetable-lab/timetable-lab.css';

function CrowdGuideScene({level}){
 const standing=[[],[88],[40,62,86],[24,41,58,75,92,106]][level];
 return <svg viewBox="0 0 120 78" focusable="false" aria-hidden="true">
  <rect width="120" height="78" rx="9" fill="#e7f2fb"/>
  <rect x="7" y="8" width="106" height="48" rx="5" fill="#c2def1" stroke="#8ca9be" strokeWidth="1.5"/>
  <path d="M12 8h96" stroke="#7893a7" strokeWidth="2"/>
  {[25,60,95].map(x=><g key={x}><path d={"M"+x+" 9v8"} stroke="#607f95" strokeWidth="1.6"/><path d={"M"+(x-3)+" 20q3 7 6 0q-3-7-6 0"} fill="none" stroke="#607f95" strokeWidth="1.4"/></g>)}
  <rect x="12" y="55" width="96" height="19" rx="4" fill="#8dafe0"/>
  {[29,69].map((x,i)=><g key={x}>
   <circle cx={x} cy="47" r="6.4" fill={i===0?"#d9ac8a":"#edc09e"}/>
   <path d={"M"+(x-9)+" 66v-9q9-10 18 0v9"} fill={i===0?"#446fa8":"#f3e3ce"}/>
   <path d={"M"+(x-7)+" 44q6-10 13 0"} stroke="#455366" strokeWidth="3" fill="none"/>
  </g>)}
  {standing.map((x,i)=><g key={x}>
   <path d={"M"+x+" 47V27"} stroke="#64768b" strokeWidth="2"/>
   <circle cx={x} cy={34+(i%2)*3} r="6.7" fill={i%2?"#e7b48d":"#c79578"}/>
   <path d={"M"+(x-9)+" 62v-12q9-10 18 0v12"} fill={["#315b86","#587f9d","#ded1ba","#3f6b7a"][i%4]}/>
   <path d={"M"+(x-6)+" "+(31+(i%2)*3)+"q6-8 12 0"} stroke="#394657" strokeWidth="3" fill="none"/>
  </g>)}
 </svg>;
}

const guideWords={
 ko:{intro:'예상혼잡도(%)란?',introDesc:'열차 정원 대비 승차인원의 비율을 나타냅니다.',introBadge:'요일별 · 30분 평균',gradeSummary:'열차 정원 대비 승차인원 비율 · 요일별 30분 평균 통계',example:'예시',exampleStation:'역삼역 18시',directionExplain:'좌우 · 운행 방면',timeExplain:'상하 · 30분 시간대',benchmarks:[['34%','좌석이 모두 찼다고 볼 수 있는 수준'],['100%','설계상 정원에 도달한 수준'],['110%','혼잡 단계 시작 (정원을 넘은 수준)']],notice:['예상혼잡도는 해당 요일의 30분 시간대 평균 통계입니다.','실제 혼잡도는 열차 상황(지연, 사고 등)에 따라 달라질 수 있습니다.']},
 en:{intro:'What is estimated crowding (%)?',introDesc:'The ratio of passengers to designed train capacity.',introBadge:'By day · 30-min avg',gradeSummary:'Train occupancy · 30-min averages by day',example:'Example',exampleStation:'Yeoksam 18:00',directionExplain:'Direction',timeExplain:'30-min periods',benchmarks:[['34%','All seats occupied'],['100%','At rated capacity'],['110%','Crowding begins']],notice:['Crowding levels are averages for 30-minute periods on the selected day.','Actual conditions may vary due to delays and disruptions.']},
 ja:{intro:'予想混雑度(%)とは？',introDesc:'列車定員に対する乗車人数の割合です。',introBadge:'曜日別 · 30分平均',gradeSummary:'列車定員に対する乗車人数の比率 · 曜日別30分平均',example:'例',exampleStation:'ヨクサム駅 18時',directionExplain:'左右 · 運行方面',timeExplain:'上下 · 30分単位',benchmarks:[['34%','座席がすべて埋まる目安'],['100%','設計上の定員に到達'],['110%','混雑段階の開始']],notice:['予想混雑度は該当曜日の30分単位の平均統計です。','遅延や事故などにより実際の混雑状況と異なる場合があります。']},
 zh:{intro:'什么是预计拥挤度(%)？',introDesc:'乘车人数相对于列车额定容量的比例。',introBadge:'按星期 · 30分钟平均',gradeSummary:'乘车人数占列车定员的比例 · 按星期30分钟平均',example:'示例',exampleStation:'驿三站 18时',directionExplain:'左右 · 运行方向',timeExplain:'上下 · 30分钟时段',benchmarks:[['34%','所有座位坐满的水平'],['100%','达到设计额定容量'],['110%','进入拥挤等级']],notice:['预计拥挤度为对应日期30分钟时段的平均统计。','实际拥挤程度会随延误、事故等情况变化。']}
};
const guideArt=[{x:51,bg:'#e7fbe9',badge:'#078c22',fg:'#fff'},{x:330,bg:'#e3f3ff',badge:'#078cd3',fg:'#fff'},{x:600,bg:'#fff5dc',badge:'#ffca00',fg:'#4b3100'},{x:875,bg:'#ffe8eb',badge:'#e92345',fg:'#fff'}];
const days=['평일','주말','공휴일'];
const emptySource={data:{},hours:[5,25],thresholds:CONGESTION_THRESHOLDS,sourceDate:null};
const testWords={ko:{test:'신규 API 테스트',days:['평일','토요일','공휴일'],unknown:'방면 미확인',refreshWarning:'이전 정상 조회 자료입니다. 갱신에 실패했습니다.'},en:{test:'New API test',days:['Weekdays','Saturday','Holidays'],unknown:'Direction unavailable',refreshWarning:'Showing the last successful result. Refresh failed.'},ja:{test:'新APIテスト',days:['平日','土曜日','祝日'],unknown:'方面未確認',refreshWarning:'更新に失敗したため前回のデータを表示しています。'},zh:{test:'新API测试',days:['工作日','星期六','节假日'],unknown:'方向未确认',refreshWarning:'更新失败，正在显示上次成功查询的数据。'}};
const colors={1:'#24559b',2:'#219052',3:'#ef8928',4:'#238cc4',5:'#9256ab',6:'#a77935',7:'#687a32',8:'#d13e78',9:'#ae8c35'};
const responses=new Map();
const two=n=>String(n).padStart(2,'0');
// Verified presentation shared by the administrator view and isolated test page.
export default function OperationTimetableTest({embedded=false,stationContext=null,language='ko',endpoint='/api/v2/operation-timetable-test'}){
 const [crowdingSource,setCrowdingSource]=useState(emptySource);
 const {crowdingHalves,crowdingSourceDate,crowdingThresholds}=useMemo(()=>createCrowdingModel(crowdingSource),[crowdingSource]);
 const [ready,setReady]=useState(false);
 const [code,setCode]=useState(()=>timetableStation(stationContext?.stationCode)?.stationCode||'0154'),[localLang,setLang]=useState('ko'),[clock,setClock]=useState(()=>serviceClock()),[day,setDay]=useState(()=>defaultDay(serviceClock()));
 const lang=embedded?language:localLang;
 const [hour,setHour]=useState(null),[express,setExpress]=useState(false),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(false),[retry,setRetry]=useState(0),[anim,setAnim]=useState('');
 const [query,setQuery]=useState('');const picker=useRef(null),crowdHelp=useRef(null),timer=useRef(null),railAnchor=useRef(null),railRef=useRef(null);
 const station=timetableStation(code)||timetableStation('0154'),t={...baseCopy[lang],...testWords[lang]};
 const directionLabel=name=>lang==='en'?`To ${stationName(name)}`:`${stationName(name)} ${t.toward}`;
 const stationName=name=>{const canonical=timetableStations.find(s=>s.line===station.line&&s.aliases?.includes(name))?.names.ko||name;return officialStationName(canonical,lang,value=>value);},stationLabel=s=>stationName(s.names.ko);
 useEffect(()=>{if(!embedded){const q=new URLSearchParams(location.search),s=timetableStation(q.get('station'));if(s)setCode(s.stationCode);const raw=q.get('lang')||navigator.language?.split('-')[0];if(baseCopy[raw])setLang(raw);}setReady(true);},[embedded]);
 useEffect(()=>{const timer=setInterval(()=>setClock(serviceClock()),30000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(embedded||!ready)return;const u=new URL(location.href);u.searchParams.set('station',code);u.searchParams.set('lang',lang);history.replaceState(history.state,'',u.pathname+u.search);},[embedded,ready,code,lang]);
 useEffect(()=>{
 if(!ready)return;
 const key=endpoint+'|'+code+'|'+day+'|'+clock.businessDate,cached=responses.get(key),controller=new AbortController();let live=true;
 setError(false);setHour(null);setExpress(false);
 if(!retry&&cached&&Date.now()-cached.at<300000){setData(cached.data);setLoading(false);return;}
 setLoading(true);setData(null);
 fetch(endpoint+'?'+new URLSearchParams({stationCode:code,day}),{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok||!d.ok||d.stationCode!==code)throw Error();if(live){responses.set(key,{data:d,at:Date.now()});if(responses.size>30)responses.delete(responses.keys().next().value);setData(d);}}).catch(()=>{if(live&&!controller.signal.aborted)setError(true);}).finally(()=>{if(live)setLoading(false);});
 return()=>{live=false;controller.abort();};
 },[ready,code,day,clock.businessDate,retry,endpoint]);
 useEffect(()=>{
  let live=true,pending=false,controller;setCrowdingSource(emptySource);
  async function load(){
   if(!live||pending||document.visibilityState!=='visible')return;
   pending=true;controller=new AbortController();
   try{
    const r=await fetch('/api/v2/timetable-lab/crowding?station='+encodeURIComponent(code),{cache:'no-store',signal:controller.signal});
    if(!r.ok)throw Error();const value=await r.json();
    if(value.stationCode!==code||!value.data||!Array.isArray(value.thresholds))throw Error();
    if(live)setCrowdingSource(value);
   }catch{if(live)setCrowdingSource(emptySource);}finally{pending=false;}
  }
  void load();const timer=setInterval(load,300000);
  const wake=()=>{if(document.visibilityState==='visible')void load();};
  document.addEventListener('visibilitychange',wake);
  return()=>{live=false;clearInterval(timer);controller?.abort();document.removeEventListener('visibilitychange',wake);};
 },[code,retry]);
 useEffect(()=>{
  if(embedded&&stationContext?.stationCode&&timetableStation(stationContext.stationCode)&&code!==stationContext.stationCode){setCode(stationContext.stationCode);setData(null);setLoading(true);setHour(null);}
 },[embedded,stationContext?.stationCode,code]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const hours=data?.hours||Array.from({length:21},(_,i)=>i+5);
 const selected=hour!==null&&hours.includes(hour)?hour:hours.includes(clock.hour)?clock.hour:hours.find(h=>h>=clock.hour)??hours.at(-1);
 const filtered=useMemo(()=>(data?.rows||[]).filter(row=>!express||row.express),[data,express]);
 const rows=filtered.filter(row=>Math.floor(row.minute/60)===selected);
 const current=day===defaultDay(clock)&&data?.businessDate===clock.businessDate;
 const nextByColumn=useMemo(()=>current?nextDeparturesByColumn(filtered,clock.minutes):new Map(),[current,filtered,clock.minutes]);
 const matches=useMemo(()=>timetableStations.filter(s=>{const q=query.toLowerCase().replace(/\s/g,'');return !q||[s.stationCode,...Object.values(s.names),...s.aliases].some(x=>String(x).toLowerCase().replace(/\s/g,'').includes(q));}).slice(0,query?24:12),[query]);
 function chooseHour(value,direction=''){setHour(value);setAnim(direction);clearTimeout(timer.current);timer.current=setTimeout(()=>setAnim(''),180);}
 function shift(delta){const index=hours.indexOf(selected)+delta;if(index>=0&&index<hours.length)chooseHour(hours[index],delta<0?'back':'forward');}
 function chooseStation(s){setCode(s.stationCode);setQuery('');setHour(null);picker.current?.close();}
 function jumpBoundary(last=false){
  const departures=data?.rows||[];
  if(!departures.length||loading||error)return;
  const minute=departures.reduce((best,row)=>last?Math.max(best,row.minute):Math.min(best,row.minute),departures[0].minute);
  setExpress(false);
  chooseHour(Math.floor(minute/60));
 }
 const columns=useMemo(()=>data?.columns||operationTimetableColumns(station),[data,station]);
 const crowdFor=h=>crowdingHalves(station,day,h,columns);
 const selectedCrowd=crowdFor(selected);
 const hasCrowd=hours.some(h=>crowdFor(h).flat().some(v=>v!==null));
 const referenceDay=t.crowdDays[days.indexOf(day)];
 // The embedded rail must stay below the time controls and above the shared bottom tabs.
 useLayoutEffect(()=>{
  if(!embedded)return;
  const rail=railRef.current,anchor=railAnchor.current,pane=anchor?.closest('.v2-feature-pane');
  if(!rail||!anchor||!pane)return;
  function position(){
   const bounds=pane.getBoundingClientRect(),start=anchor.getBoundingClientRect().top;
   const top=Math.max(start+2,bounds.top+Math.min(108,bounds.height*.22));
   const available=Math.floor(bounds.bottom-top-8);
   rail.style.setProperty('--tl-rail-top',top+'px');
   rail.style.setProperty('--tl-rail-right',Math.max(0,window.innerWidth-bounds.right)+'px');
   rail.style.setProperty('--tl-rail-height',Math.max(0,available)+'px');
   rail.style.visibility=available>=40?'visible':'hidden';
  }
  position();
  pane.addEventListener('scroll',position,{passive:true});
  window.addEventListener('resize',position);
  window.visualViewport?.addEventListener('resize',position);
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(position);
  observer?.observe(pane);observer?.observe(anchor.parentElement);
  return()=>{pane.removeEventListener('scroll',position);window.removeEventListener('resize',position);window.visualViewport?.removeEventListener('resize',position);observer?.disconnect();};
 },[embedded,hasCrowd,lang,loading,error,data?.hasExpress]);
 function goNow(){const now=serviceClock();setClock(now);setDay(defaultDay(now));setHour(null);setExpress(false);}
 const hourDescription=(h,halves)=>halves.map((levels,half)=>levels.map((level,i)=>level===null?'':two(h%24)+':'+(half?'30':'00')+' '+directionLabel(columns[i].next)+': '+t.crowdLevels[level]).filter(Boolean).join(' · ')).filter(Boolean).join(' / ');
 const exampleColumns=[{next:'강남',providerDir:'0'},{next:'선릉',providerDir:'1'}];
 const exampleCrowd=crowdingHalves({line:'2',stationCode:'0221',names:{ko:'역삼'}},'평일',18,exampleColumns);
 const exampleName=name=>officialStationName(name,lang,value=>value);
 return <div className={'tl-page'+(embedded?' tl-embedded':'')} lang={lang==='zh'?'zh-CN':lang}><section className="tl-shell">
 {!embedded&&<header className="tl-top"><div><p className="tl-test">{t.test}</p><h1>{t.title}</h1></div><div className="tl-station-tools"><button className="tl-station" onClick={()=>picker.current?.showModal()} aria-label={t.change}><b style={{background:colors[station.line]}}>{station.line}</b><strong>{stationLabel(station)}</strong><span aria-hidden="true">⌄</span></button><button className="tl-refresh" onClick={()=>setRetry(n=>n+1)} aria-label={t.refresh}>↻</button></div></header>}
 <div className="tl-days" role="group" aria-label={t.days.join(' / ')}>{days.map((value,i)=><button key={value} aria-pressed={day===value} onClick={()=>{if(day!==value){setData(null);setLoading(true);setDay(value);setHour(null);}}}>{t.days[i]}</button>)}</div>
 <div className="tl-hour-grid" role="group" aria-label={t.hour}>{hours.map(value=>{const levels=crowdFor(value),description=hourDescription(value,levels);return <button key={value} onClick={()=>chooseHour(value)} aria-pressed={selected===value} aria-label={(value>=24?t.nextDay+' ':'')+two(value%24)+':00'} aria-description={description||undefined} title={description||undefined} className={levels.flat().some(v=>v!==null)?'tl-crowded-hour':undefined}>{levels.flat().some(v=>v!==null)&&<span className="tl-crowd-halves" data-directions={columns.length===3?3:2} aria-hidden="true">{levels.map((half,i)=><span key={i} style={{backgroundImage:crowdingGradient(half,columns[0]?.providerDir===(station.line==='2'?'0':'1')?'left':'right')}}/>)}</span>}<span className="tl-hour-number">{two(value%24)}</span>{value>=24&&<sup aria-hidden="true">+1</sup>}</button>;})}</div>
 {(embedded||hasCrowd)&&<div className="tl-crowd-legend">{embedded&&<div className="tl-current-station" title={stationLabel(station)}><b className="tl-current-line" style={{background:colors[station.line]}}>{station.line}</b><strong>{stationLabel(station)}</strong></div>}{hasCrowd&&<div className="tl-crowd-group" role="group" aria-label={t.crowdTitle}><div className="tl-crowd-keys">{t.crowdLevels.map((level,i)=><span key={level}><i style={{background:crowdingColors[i]}}/>{level}</span>)}</div><button type="button" className="tl-crowd-help" onClick={()=>crowdHelp.current?.showModal()} aria-label={t.crowdHelpTitle}>{t.crowdHelp} <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 9v5" strokeLinecap="round"/><circle cx="10" cy="6" r=".8" fill="currentColor" stroke="none"/></svg></button></div>}</div>}

 {embedded&&<div ref={railAnchor} className="tl-rail-anchor" aria-hidden="true"/>}
 {loading?<div className="tl-state" role="status"><span className="tl-spinner"/>{t.loading}</div>:error?<div className="tl-state" role="alert">{t.failed}<button onClick={()=>setRetry(n=>n+1)}>{t.retry}</button></div>:<>
 {data?.issues?.length>0&&<p className="tl-alert" role="status">{data.issues.some(i=>i.type==='refresh')?t.refreshWarning+' · '+new Date(data.source.fetchedAt).toLocaleString(lang==='zh'?'zh-CN':lang,{timeZone:'Asia/Seoul',hour12:false})+' KST':data.issues.some(i=>i.type==='request')?t.partial:t.unclassified}</p>}
 {!data?.rows?.length?<div className="tl-state">{data?.issues?.some(i=>i.type==='request')?t.failed:data?.issues?.some(i=>i.type==='unclassified')?t.unclassified:t.noData}</div>:<div className={'tl-table '+(anim?'tl-slide-'+anim:'')} style={{'--columns':data.columns.length}}>
 {columns.map((column,index)=>{const items=rows.filter(row=>row.column===column.id),next=nextByColumn.get(column.id);return <section className="tl-column" key={column.id}><header><h3 aria-label={column.unknown?t.unknown:directionLabel(column.next)}>{column.unknown?t.unknown:columns.length===2?<><span className="tl-heading-arrow" aria-hidden="true">{index===0?'←':''}</span>{stationName(column.next)}<span className="tl-heading-arrow" aria-hidden="true">{index===1?'→':''}</span></>:directionLabel(column.next)}</h3>{column.branch&&<small>{t.branch[column.branch]||column.branch}</small>}</header><ol>{items.length?items.map((row,i)=>{const level=selectedCrowd[row.minute%60<30?0:1]?.[index],name=row.destination?stationName(row.destination):'—';return <li key={row.time+'|'+row.number+'|'+i} className={(current&&row.minute<clock.minutes?'tl-past ':'')+(next===row?'tl-next ':'')+(level!=null?'tl-crowd-row':'')} data-crowd-level={level!=null?level:undefined} aria-label={[next===row?t.upcoming:'',row.express?(row.kind==='limited'?t.limited:t.expressTag):'',name].filter(Boolean).join(' · ')}><time className={level!=null?'tl-crowd-minute':undefined} title={level!=null?t.crowdTitle+' · '+t.crowdLevels[level]:undefined}>{two(row.minute%60)}</time><div className="tl-row-dest"><span title={name}>{name}</span>{row.express&&<small className="tl-express" title={row.kind==='limited'?t.limited:t.expressTag}>{row.kind==='limited'?t.limitedShort:t.expressShort}</small>}</div>{next===row&&<i aria-hidden="true"/>}</li>}):<li className="tl-no-hour">{t.noHour}</li>}</ol></section>;})}
 </div>}
 </>}
 <p className="tl-note">{t.note}</p>{hasCrowd&&<p className="tl-note tl-crowd-note">{t.crowdNote} · {referenceDay}{crowdingSourceDate?' · '+crowdingSourceDate:''}</p>}{!clock.businessDate.startsWith('2026-')&&<p className="tl-note">{t.holidayYear}</p>}
 <div ref={railRef} className="tl-hour-nav" role="group" aria-label={t.hour}>
 <button type="button" className="tl-arrow tl-arrow-left" disabled={hours.indexOf(selected)===0||loading} title={t.previous} aria-label={t.previous} onClick={()=>shift(-1)}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg></button>
 <button type="button" className="tl-arrow tl-now" title={t.now} aria-label={t.now} onClick={goNow}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 6.5v5.5l3.5 2"/></svg></button>
 <button type="button" className="tl-arrow tl-arrow-right" disabled={hours.indexOf(selected)===hours.length-1||loading} title={t.next} aria-label={t.next} onClick={()=>shift(1)}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg></button>
 <div className="tl-shortcuts">
 {data?.hasExpress&&<button type="button" className="tl-arrow tl-shortcut" aria-label={t.express} aria-pressed={express} title={t.express} onClick={()=>setExpress(v=>!v)}><span>{t.expressRail}</span></button>}
 <button type="button" className="tl-arrow tl-shortcut" disabled={loading||error||!data?.rows?.length} title={t.last} onClick={()=>jumpBoundary(true)}><span>{t.last}</span></button>
 <button type="button" className="tl-arrow tl-shortcut" disabled={loading||error||!data?.rows?.length} title={t.first} onClick={()=>jumpBoundary(false)}><span>{t.first}</span></button>
 </div></div>
 {!embedded&&<footer className="tl-footer"><a href={'/?station='+code+'&lang='+lang} aria-label={t.home}>⌂</a><div>{[['ko','한국어'],['en','English'],['ja','日本語'],['zh','中文']].map(([value,label])=><button key={value} lang={value==='zh'?'zh-CN':value} aria-pressed={lang===value} onClick={()=>setLang(value)}>{label}</button>)}</div></footer>}
 {!embedded&&<dialog ref={picker} className="tl-dialog" aria-label={t.change}><header><h2>{t.change}</h2><button onClick={()=>picker.current?.close()} aria-label={t.close}>×</button></header><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search} aria-label={t.search}/><div className="tl-station-list">{matches.length?matches.map(s=><button key={s.stationCode} onClick={()=>chooseStation(s)}><b style={{background:colors[s.line]}}>{s.line}</b><span>{stationLabel(s)}</span><small>{s.stationCode}</small></button>):<p>{t.noMatch}</p>}</div></dialog>}
 <dialog ref={crowdHelp} className="tl-dialog tl-crowd-dialog tl-visual-guide" lang={lang==='zh'?'zh-CN':lang} aria-label={t.crowdHelpTitle}>
  <div className="tl-vg-layout">
   <header className="tl-vg-topbar">
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="4"/><path d="M8 8h8v6H8zM8 24l2-3m6 0 2 3"/></svg>
    <h2>{t.crowdHelpTitle}</h2>
   </header>
   <div className="tl-vg-content">
    <section className="tl-vg-section">
     <div className="tl-vg-grade-heading">
      <h3 className="tl-vg-heading">{t.crowdGuideGrades}</h3>
      <p className="tl-vg-grade-subtext">{guideWords[lang].gradeSummary}</p>
     </div>
     <div className="tl-vg-grades">{guideArt.map((art,i)=>
      <div className="tl-vg-grade" key={i} style={{'--vg-background':art.bg,'--vg-label':art.badge,'--vg-fg':art.fg}}>
       <div className="tl-vg-grade-head"><b className="tl-vg-grade-label">{t.crowdLevels[i]}</b><strong className="tl-vg-grade-range">{t.crowdRange(i,crowdingThresholds)}</strong></div>
       <div className="tl-vg-grade-detail">
        <svg className="tl-vg-scene" viewBox={art.x+' 316 '+(i===0?140:254)+' 108'} preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="/images/congestion-guide-ko.webp" x="0" y="0" width="1168" height="1279"/></svg>
        <span className="tl-vg-grade-desc">{t.crowdGuideDescriptions[i]}</span>
       </div>
      </div>)}
     </div>
    </section>
    <section className="tl-vg-section">
     <h3 className="tl-vg-heading">{t.crowdGuideBenchmarks}</h3>
     <div className="tl-vg-benchmarks">{guideWords[lang].benchmarks.map(([num,description],i)=>
      <div className="tl-vg-benchmark" key={num}>
       <div className="tl-vg-bench-top">
        {i===0?
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4v10h13M8 11V5h6a3 3 0 0 1 3 3v6M6 14v6m11-6v6M4 20h15"/></svg>:
         i===1?
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17a9 9 0 1 1 16 0"/><path d="M7 16l5-7 5 7" opacity=".35"/><path d="M12 16l6-9"/><circle cx="12" cy="16" r="2" fill="currentColor" stroke="none"/><path d="M4 20h16"/></svg>:
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="5" cy="5.5" r="2.2"/><circle cx="12" cy="4.5" r="2.4"/><circle cx="19" cy="5.5" r="2.2"/><path d="M2 21v-9a3 3 0 0 1 6 0v9M9 21v-10a3 3 0 0 1 6 0v10M16 21v-9a3 3 0 0 1 6 0v9"/><path d="M8 15h8"/></svg>}
        <strong>{num}</strong>
       </div>
       <p>{description}</p>
      </div>)}
     </div>
    </section>
    <section className="tl-vg-reading">
     <div className="tl-vg-reading-head">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18"/></svg>
      <strong className="tl-vg-reading-title">{t.crowdGuideReading}</strong>
      <span className="tl-vg-example">{guideWords[lang].example}</span>
      <span className="tl-vg-line2" aria-label={lang==='ko'?'2호선':'Line 2'}>2</span>
      <strong className="tl-vg-station">{guideWords[lang].exampleStation}</strong>
     </div>
     <div className="tl-vg-reading-body">
      <div className="tl-vg-demo">
       <div className="tl-vg-directions"><span>← {lang==='en'?'Gangnam':directionLabel('강남')}</span><span>{lang==='en'?'Seolleung':directionLabel('선릉')} →</span></div>
       <div className="tl-vg-timeline">
        <div className="tl-vg-times"><div><b>18:00</b><span>~ 18:30</span></div><div><b>18:30</b><span>~ 19:00</span></div></div>
        <div className="tl-vg-heat">
         <div className="tl-vg-quadrant tl-vg-q1">{t.crowdLevels[1]}</div><div className="tl-vg-quadrant tl-vg-q2">{t.crowdLevels[2]}</div>
         <div className="tl-vg-quadrant tl-vg-q3">{t.crowdLevels[0]}</div><div className="tl-vg-quadrant tl-vg-q4">{t.crowdLevels[3]}</div>
         <span className="tl-vg-hour">18</span>
        </div>
       </div>
      </div>
      <div className="tl-vg-legend">
       <div className="tl-vg-legend-line">
        <svg viewBox="0 0 24 24" fill="none" stroke="#0966d4" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true"><path d="M3 12h18m-5-5 5 5-5 5M8 7l-5 5 5 5"/></svg>
        <span>{guideWords[lang].directionExplain}</span>
       </div>
       <div className="tl-vg-legend-line">
        <svg viewBox="0 0 24 24" fill="none" stroke="#0966d4" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true"><path d="M12 3v18m-5-5 5 5 5-5M7 8l5-5 5 5"/></svg>
        <span>{guideWords[lang].timeExplain}</span>
       </div>
      </div>
     </div>
    </section>
    <button type="button" className="tl-vg-close" onClick={()=>crowdHelp.current?.close()}>{t.close}</button>
   </div>
  </div>
 </dialog>
 </section></div>;
}
