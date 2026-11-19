'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {timetableStation,timetableStations,serviceClock,defaultDay} from '../../lib/timetable-lab-model';
import {officialStationName} from '../../lib/officialStations';
import {copy} from './copy';
import {crowdingHalves,crowdingGradient,crowdingColors,crowdingSourceDate,crowdingThresholds} from '../../lib/timetable-lab-crowding';
import './timetable-lab.css';
const days=['평일','주말','공휴일'];
const colors={1:'#24559b',2:'#219052',3:'#ef8928',4:'#238cc4',5:'#9256ab',6:'#a77935',7:'#687a32',8:'#d13e78',9:'#ae8c35'};
const responses=new Map();
const two=n=>String(n).padStart(2,'0');
export default function TimetableLab(){
 const [ready,setReady]=useState(false);
 const [code,setCode]=useState('0154'),[lang,setLang]=useState('ko'),[clock,setClock]=useState(()=>serviceClock()),[day,setDay]=useState(()=>defaultDay(serviceClock()));
 const [hour,setHour]=useState(null),[express,setExpress]=useState(false),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(false),[retry,setRetry]=useState(0),[anim,setAnim]=useState('');
 const [query,setQuery]=useState('');const picker=useRef(null),crowdHelp=useRef(null),timer=useRef(null),dayRef=useRef(clock.businessDate);
 const station=timetableStation(code)||timetableStation('0154'),t=copy[lang];
 const directionLabel=name=>lang==='en'?`To ${stationName(name)}`:`${stationName(name)} ${t.toward}`;
 const stationName=name=>{const canonical=timetableStations.find(s=>s.line===station.line&&s.aliases?.includes(name))?.names.ko||name;return officialStationName(canonical,lang,value=>value);},stationLabel=s=>stationName(s.names.ko);
 useEffect(()=>{const q=new URLSearchParams(location.search),s=timetableStation(q.get('station'));if(s)setCode(s.stationCode);const raw=q.get('lang')||navigator.language?.split('-')[0];if(copy[raw])setLang(raw);setReady(true);},[]);
 useEffect(()=>{const timer=setInterval(()=>{const next=serviceClock();setClock(next);if(dayRef.current!==next.businessDate){dayRef.current=next.businessDate;setDay(defaultDay(next));setHour(null);}},30000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{const u=new URL(location.href);u.searchParams.set('station',code);u.searchParams.set('lang',lang);history.replaceState(history.state,'',u.pathname+u.search);},[code,lang]);
 useEffect(()=>{
 if(!ready)return;
 const key=code+'|'+day+'|'+clock.businessDate,cached=responses.get(key),controller=new AbortController();let live=true;
 setError(false);setHour(null);setExpress(false);
 if(!retry&&cached&&Date.now()-cached.at<300000){setData(cached.data);setLoading(false);return;}
 setLoading(true);setData(null);
 fetch('/api/v2/timetable-lab?'+new URLSearchParams({stationCode:code,day}),{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok||!d.ok||d.stationCode!==code)throw Error();if(live){responses.set(key,{data:d,at:Date.now()});if(responses.size>30)responses.delete(responses.keys().next().value);setData(d);}}).catch(()=>{if(live&&!controller.signal.aborted)setError(true);}).finally(()=>{if(live)setLoading(false);});
 return()=>{live=false;controller.abort();};
 },[ready,code,day,clock.businessDate,retry]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const hours=data?.hours||Array.from({length:21},(_,i)=>i+5);
 const selected=hour!==null&&hours.includes(hour)?hour:hours.includes(clock.hour)?clock.hour:hours.find(h=>h>=clock.hour)??hours.at(-1);
 const filtered=useMemo(()=>(data?.rows||[]).filter(row=>!express||row.express),[data,express]);
 const rows=filtered.filter(row=>Math.floor(row.minute/60)===selected);
 const current=day===defaultDay(clock)&&data?.businessDate===clock.businessDate;
 const next=current?filtered.find(row=>row.minute>=clock.minutes):null;
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
 const columns=data?.columns||[];
 const crowdFor=h=>crowdingHalves(station,day,h,columns);
 const selectedCrowd=crowdFor(selected);
 const hasCrowd=hours.some(h=>crowdFor(h).flat().some(v=>v!==null));
 const referenceDay=t.crowdDays[days.indexOf(day)];
 function goNow(){setDay(defaultDay(clock));setHour(null);setExpress(false);}
 const hourDescription=(h,halves)=>halves.map((levels,half)=>levels.map((level,i)=>level===null?'':two(h%24)+':'+(half?'30':'00')+' '+directionLabel(columns[i].next)+': '+t.crowdLevels[level]).filter(Boolean).join(' · ')).filter(Boolean).join(' / ');
 const exampleColumns=[{next:'강남',providerDir:'0'},{next:'선릉',providerDir:'1'}];
 const exampleCrowd=crowdingHalves({line:'2',stationCode:'0221',names:{ko:'역삼'}},'평일',18,exampleColumns);
 const exampleName=name=>officialStationName(name,lang,value=>value);
 return <div className="tl-page" lang={lang==='zh'?'zh-CN':lang}><main className="tl-shell">
 <header className="tl-top"><div><p className="tl-test">{t.test}</p><h1>{t.title}</h1></div><div className="tl-station-tools"><button className="tl-station" onClick={()=>picker.current?.showModal()} aria-label={t.change}><b style={{background:colors[station.line]}}>{station.line}</b><strong>{stationLabel(station)}</strong><span aria-hidden="true">⌄</span></button><button className="tl-refresh" onClick={()=>setRetry(n=>n+1)} aria-label={t.refresh}>↻</button></div></header>
 <div className="tl-days" role="group" aria-label={t.days.join(' / ')}>{days.map((value,i)=><button key={value} aria-pressed={day===value} onClick={()=>{setDay(value);setHour(null);}}>{t.days[i]}</button>)}</div>
 <div className="tl-hour-grid" role="group" aria-label={t.hour}>{hours.map(value=>{const levels=crowdFor(value),description=hourDescription(value,levels);return <button key={value} onClick={()=>chooseHour(value)} aria-pressed={selected===value} aria-label={(value>=24?t.nextDay+' ':'')+two(value%24)+':00'} aria-description={description||undefined} title={description||undefined} className={levels.flat().some(v=>v!==null)?'tl-crowded-hour':undefined}>{levels.flat().some(v=>v!==null)&&<span className="tl-crowd-halves" aria-hidden="true">{levels.map((half,i)=><span key={i} style={{backgroundImage:crowdingGradient(half)}}/>)}</span>}<span className="tl-hour-number">{two(value%24)}</span>{value>=24&&<sup aria-hidden="true">+1</sup>}</button>;})}</div>
 {hasCrowd&&<div className="tl-crowd-legend" aria-label={t.crowdTitle}><div className="tl-crowd-keys">{t.crowdLevels.map((level,i)=><span key={level}><i style={{background:crowdingColors[i]}}/>{level}</span>)}</div><button type="button" className="tl-crowd-help" onClick={()=>crowdHelp.current?.showModal()} aria-label={t.crowdHelpTitle}>{t.crowdHelp} <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 9v5" strokeLinecap="round"/><circle cx="10" cy="6" r=".8" fill="currentColor" stroke="none"/></svg></button></div>}

 {loading?<div className="tl-state" role="status"><span className="tl-spinner"/>{t.loading}</div>:error?<div className="tl-state" role="alert">{t.failed}<button onClick={()=>setRetry(n=>n+1)}>{t.retry}</button></div>:<>
 {data?.issues?.length>0&&<p className="tl-alert" role="status">{data.issues.some(i=>i.type==='request')?t.partial:t.unclassified}</p>}
 {!data?.rows?.length?<div className="tl-state">{data?.issues?.some(i=>i.type==='request')?t.failed:data?.issues?.some(i=>i.type==='unclassified')?t.unclassified:t.noData}{day==='공휴일'&&<small>{t.missingHoliday}</small>}</div>:<div className={'tl-table '+(anim?'tl-slide-'+anim:'')} style={{'--columns':data.columns.length}}>
 {columns.map((column,index)=>{const items=rows.filter(row=>row.column===column.id);return <section className="tl-column" key={column.id}><header><h3 aria-label={directionLabel(column.next)}>{columns.length===2?<><span className="tl-heading-arrow" aria-hidden="true">{index===0?'←':''}</span>{stationName(column.next)}<span className="tl-heading-arrow" aria-hidden="true">{index===1?'→':''}</span></>:directionLabel(column.next)}</h3>{column.branch&&<small>{t.branch[column.branch]||column.branch}</small>}</header><ol>{items.length?items.map((row,i)=><li key={row.time+'|'+row.number+'|'+i} className={(current&&row.minute<clock.minutes?'tl-past ':'')+(next===row?'tl-next':'')} aria-label={next===row?t.upcoming:undefined}><time className={selectedCrowd[row.minute%60<30?0:1]?.[index]!=null?'tl-crowd-minute':undefined} style={selectedCrowd[row.minute%60<30?0:1]?.[index]!=null?{backgroundColor:crowdingColors[selectedCrowd[row.minute%60<30?0:1][index]]}:undefined} title={selectedCrowd[row.minute%60<30?0:1]?.[index]!=null?t.crowdTitle+' · '+t.crowdLevels[selectedCrowd[row.minute%60<30?0:1][index]]:undefined}>{two(row.minute%60)}</time><div><span>{row.destination?stationName(row.destination):'—'}</span>{row.express&&<small className="tl-express">{row.kind==='limited'?t.limited:t.expressTag}</small>}</div>{next===row&&<i aria-hidden="true"/>}</li>):<li className="tl-no-hour">{t.noHour}</li>}</ol></section>;})}
 </div>}
 </>}
 <p className="tl-note">{t.note}</p>{hasCrowd&&<p className="tl-note tl-crowd-note">{t.crowdNote} · {referenceDay} · {crowdingSourceDate}</p>}{day==='주말'&&<p className="tl-note tl-data-note">{t.weekend}</p>}{!clock.businessDate.startsWith('2026-')&&<p className="tl-note">{t.holidayYear}</p>}
 <div className="tl-hour-nav" role="group" aria-label={t.hour}>
 <button type="button" className="tl-arrow tl-arrow-left" disabled={hours.indexOf(selected)===0||loading} title={t.previous} aria-label={t.previous} onClick={()=>shift(-1)}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg></button>
 <button type="button" className="tl-arrow tl-now" title={t.now} aria-label={t.now} onClick={goNow}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 6.5v5.5l3.5 2"/></svg></button>
 <button type="button" className="tl-arrow tl-arrow-right" disabled={hours.indexOf(selected)===hours.length-1||loading} title={t.next} aria-label={t.next} onClick={()=>shift(1)}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg></button>
 <div className="tl-shortcuts">
 {data?.hasExpress&&<button type="button" className="tl-arrow tl-shortcut" aria-label={t.express} aria-pressed={express} title={t.express} onClick={()=>setExpress(v=>!v)}><span>{t.expressRail}</span></button>}
 <button type="button" className="tl-arrow tl-shortcut" disabled={loading||error||!data?.rows?.length} title={t.last} onClick={()=>jumpBoundary(true)}><span>{t.last}</span></button>
 <button type="button" className="tl-arrow tl-shortcut" disabled={loading||error||!data?.rows?.length} title={t.first} onClick={()=>jumpBoundary(false)}><span>{t.first}</span></button>
 </div></div>
 <footer className="tl-footer"><a href={'/?station='+code+'&lang='+lang} aria-label={t.home}>⌂</a><div>{[['ko','한국어'],['en','English'],['ja','日本語'],['zh','中文']].map(([value,label])=><button key={value} lang={value==='zh'?'zh-CN':value} aria-pressed={lang===value} onClick={()=>setLang(value)}>{label}</button>)}</div></footer>
 <dialog ref={picker} className="tl-dialog" aria-label={t.change}><header><h2>{t.change}</h2><button onClick={()=>picker.current?.close()} aria-label={t.close}>×</button></header><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search} aria-label={t.search}/><div className="tl-station-list">{matches.length?matches.map(s=><button key={s.stationCode} onClick={()=>chooseStation(s)}><b style={{background:colors[s.line]}}>{s.line}</b><span>{stationLabel(s)}</span><small>{s.stationCode}</small></button>):<p>{t.noMatch}</p>}</div></dialog>
 <dialog ref={crowdHelp} className="tl-dialog tl-crowd-dialog" aria-label={t.crowdHelpTitle}><header><h2>{t.crowdHelpTitle}</h2><button onClick={()=>crowdHelp.current?.close()} aria-label={t.close}>×</button></header>
 <div className="tl-help-example">
  <p className="tl-example-title"><strong><b className="tl-example-line" style={{background:colors[2]}}>2</b><span className="tl-example-station">{exampleName('역삼')}</span></strong><span>{t.exampleDay}</span><span>{t.exampleHour}</span></p><strong className="tl-example-direction">← {exampleName(exampleColumns[0].next)}</strong><strong className="tl-example-direction">{exampleName(exampleColumns[1].next)} →</strong>
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
 <p className="tl-help-note">{t.crowdNote} · {crowdingSourceDate}<br/>{t.crowdPolicy}</p>
 <button type="button" className="tl-help-close" onClick={()=>crowdHelp.current?.close()}>{t.close}</button></dialog>
 </main></div>;
}
