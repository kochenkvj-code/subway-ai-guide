'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {timetableStation,timetableStations,serviceClock,defaultDay,nextDeparturesByColumn} from '../../lib/timetable-lab-model';
import {officialStationName} from '../../lib/officialStations';
import {copy as baseCopy} from '../timetable-lab/copy';
import {operationTimetableColumns} from '../../lib/operation-timetable-model';
import {CONGESTION_THRESHOLDS} from '../../lib/congestion-data';
import {createCrowdingModel,crowdingGradient,crowdingColors} from '../../lib/timetable-lab-crowding-view';
import '../timetable-lab/timetable-lab.css';
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
 <dialog ref={crowdHelp} className="tl-dialog tl-crowd-dialog" aria-label={t.crowdHelpTitle}><header><h2>{t.crowdHelpTitle}</h2><button onClick={()=>crowdHelp.current?.close()} aria-label={t.close}>×</button></header>
 <div className="tl-help-example">
  <p className="tl-example-title"><strong><b className="tl-example-line" style={{background:colors[2]}}>2</b><span className="tl-example-station">{exampleName('역삼')}</span></strong><span>{t.exampleDay} {t.exampleHour}</span></p><strong className="tl-example-direction">← {exampleName(exampleColumns[0].next)}</strong><strong className="tl-example-direction">{exampleName(exampleColumns[1].next)} →</strong>
  <div className="tl-example-times"><span>18:00–18:30</span><span>18:30–19:00</span></div>
  <div className="tl-example-tile">
   <div className="tl-example-quadrants">{exampleCrowd.flat().map((level,i)=><div className="tl-help-cell" key={i} style={{background:crowdingColors[level??4]}}>{level===null?'—':t.crowdLevels[level]}</div>)}</div>
   <strong className="tl-help-hour">18</strong>
  </div>
 </div>
 <div className="tl-help-steps">
  {t.crowdHelpSteps.map(([heading,detail],i)=><div className="tl-help-step" key={i}><span className="tl-help-symbol" aria-hidden="true">{i===0?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M7 8l-4 4 4 4m10-8 4 4-4 4"/></svg>:i===1?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M8 7l4-4 4 4m-8 10 4 4 4-4"/></svg>:<span className="tl-help-mini-grid">{crowdingColors.slice(0,4).map(color=><i key={color} style={{background:color}}/>)}</span>}</span><div><strong>{heading}</strong><span>{detail}</span></div></div>)}
 <div className="tl-help-scale tl-help-step tl-help-scale-card" role="img" aria-label={t.crowdLevels.map((label,i)=>label+' '+(i===0?' < '+crowdingThresholds[0]+'%':i===3?' ≥ '+crowdingThresholds[2]+'%':crowdingThresholds[i-1]+'% – < '+crowdingThresholds[i]+'%')).join(' · ')}>
  <div className="tl-help-scale-ranges" aria-hidden="true">{t.crowdLevels.map((label,i)=><div className="tl-help-range" key={i}><span className="tl-help-range-label" style={{background:crowdingColors[i]}}>{label}</span><span className="tl-help-range-value">{t.crowdRange(i,crowdingThresholds)}</span></div>)}</div>
 </div>
 </div>
 <p className="tl-help-note">{t.crowdNote}{crowdingSourceDate?' · '+crowdingSourceDate:''}<br/>{t.crowdPolicy}</p>
 <button type="button" className="tl-help-close" onClick={()=>crowdHelp.current?.close()}>{t.close}</button></dialog>
 </section></div>;
}
