'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {timetableStation,timetableStations,serviceClock,defaultDay} from '../../lib/timetable-lab-model';
import {officialStationName} from '../../lib/officialStations';
import {copy} from './copy';
import './timetable-lab.css';
const days=['평일','주말','공휴일'];
const colors={1:'#24559b',2:'#219052',3:'#ef8928',4:'#238cc4',5:'#9256ab',6:'#a77935',7:'#687a32',8:'#d13e78',9:'#ae8c35'};
const responses=new Map();
const two=n=>String(n).padStart(2,'0');
export default function TimetableLab(){
 const [ready,setReady]=useState(false);
 const [code,setCode]=useState('0154'),[lang,setLang]=useState('ko'),[clock,setClock]=useState(()=>serviceClock()),[day,setDay]=useState(()=>defaultDay(serviceClock()));
 const [hour,setHour]=useState(null),[express,setExpress]=useState(false),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(false),[retry,setRetry]=useState(0),[anim,setAnim]=useState('');
 const [query,setQuery]=useState('');const picker=useRef(null),firstLast=useRef(null),timer=useRef(null),dayRef=useRef(clock.businessDate);
 const station=timetableStation(code)||timetableStation('0154'),t=copy[lang];
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
 const displayTime=minute=>(minute>=1440?t.nextDay+' ':'')+two(Math.floor(minute/60)%24)+':'+two(minute%60);
 return <div className="tl-page" lang={lang==='zh'?'zh-CN':lang}><main className="tl-shell">
 <header className="tl-top"><div><p className="tl-test">{t.test}</p><h1>{t.title}</h1></div><div className="tl-station-tools"><button className="tl-station" onClick={()=>picker.current?.showModal()} aria-label={t.change}><b style={{background:colors[station.line]}}>{station.line}</b><strong>{stationLabel(station)}</strong><span aria-hidden="true">⌄</span></button><button className="tl-refresh" onClick={()=>setRetry(n=>n+1)} aria-label={t.refresh}>↻</button></div></header>
 <div className="tl-days" role="group" aria-label={t.days.join(' / ')}>{days.map((value,i)=><button key={value} aria-pressed={day===value} onClick={()=>{setDay(value);setHour(null);}}>{t.days[i]}</button>)}</div>
 <div className="tl-hour-grid" role="group" aria-label={t.hour}>{hours.map(value=><button key={value} onClick={()=>chooseHour(value)} aria-pressed={selected===value} aria-label={(value>=24?t.nextDay+' ':'')+two(value%24)+':00'}><span>{two(value%24)}</span>{value>=24&&<small>{t.nextDay}</small>}</button>)}</div>
 <div className="tl-controls"><span>{t.service} <time>{clock.businessDate.slice(5).replace('-','.')}</time></span><div>{data?.hasExpress&&<button aria-pressed={express} onClick={()=>setExpress(v=>!v)}>{t.express}</button>}<button disabled={!data?.rows?.length} onClick={()=>firstLast.current?.showModal()}>{t.firstLast}</button></div></div>
 <div className="tl-hour-heading"><h2>{selected>=24&&<small>{t.nextDay} </small>}{two(selected%24)}<span>:00—{two(selected%24)}:59</span></h2><span>{rows.length} {t.count}</span></div>
 {loading?<div className="tl-state" role="status"><span className="tl-spinner"/>{t.loading}</div>:error?<div className="tl-state" role="alert">{t.failed}<button onClick={()=>setRetry(n=>n+1)}>{t.retry}</button></div>:<>
 {data?.issues?.length>0&&<p className="tl-alert" role="status">{data.issues.some(i=>i.type==='request')?t.partial:t.unclassified}</p>}
 {!data?.rows?.length?<div className="tl-state">{data?.issues?.some(i=>i.type==='request')?t.failed:data?.issues?.some(i=>i.type==='unclassified')?t.unclassified:t.noData}{day==='공휴일'&&<small>{t.missingHoliday}</small>}</div>:<div className={'tl-table '+(anim?'tl-slide-'+anim:'')} style={{'--columns':data.columns.length}}>
 {data.columns.map(column=>{const items=rows.filter(row=>row.column===column.id);return <section className="tl-column" key={column.id}><header><h3>{stationName(column.next)} <span>{t.toward}</span></h3>{column.branch&&<small>{t.branch[column.branch]||column.branch}</small>}</header><div className="tl-column-label">{t.minutes}</div><ol>{items.length?items.map((row,i)=><li key={row.time+'|'+row.number+'|'+i} className={(current&&row.minute<clock.minutes?'tl-past ':'')+(next===row?'tl-next':'')} aria-label={next===row?t.upcoming:undefined}><time>{two(row.minute%60)}</time><div><span>{row.destination?stationName(row.destination):'—'}</span>{row.express&&<small className="tl-express">{row.kind==='limited'?t.limited:t.expressTag}</small>}</div>{next===row&&<i aria-hidden="true"/>}</li>):<li className="tl-no-hour">{t.noHour}</li>}</ol></section>;})}
 </div>}
 </>}
 <p className="tl-note">{t.note}</p>{day==='주말'&&<p className="tl-note tl-data-note">{t.weekend}</p>}{!clock.businessDate.startsWith('2026-')&&<p className="tl-note">{t.holidayYear}</p>}
 <button className="tl-arrow tl-arrow-left" disabled={hours.indexOf(selected)===0||loading} aria-label={t.previous} onClick={()=>shift(-1)}>‹</button><button className="tl-arrow tl-arrow-right" disabled={hours.indexOf(selected)===hours.length-1||loading} aria-label={t.next} onClick={()=>shift(1)}>›</button>
 <footer className="tl-footer"><a href={'/?station='+code+'&lang='+lang} aria-label={t.home}>⌂</a><div>{[['ko','한국어'],['en','English'],['ja','日本語'],['zh','中文']].map(([value,label])=><button key={value} lang={value==='zh'?'zh-CN':value} aria-pressed={lang===value} onClick={()=>setLang(value)}>{label}</button>)}</div></footer>
 <dialog ref={picker} className="tl-dialog" aria-label={t.change}><header><h2>{t.change}</h2><button onClick={()=>picker.current?.close()} aria-label={t.close}>×</button></header><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search} aria-label={t.search}/><div className="tl-station-list">{matches.length?matches.map(s=><button key={s.stationCode} onClick={()=>chooseStation(s)}><b style={{background:colors[s.line]}}>{s.line}</b><span>{stationLabel(s)}</span><small>{s.stationCode}</small></button>):<p>{t.noMatch}</p>}</div></dialog>
 <dialog ref={firstLast} className="tl-dialog tl-firstlast" aria-label={t.firstLast}><header><div><h2>{t.firstLast}</h2><small>{t.allTrains}</small></div><button onClick={()=>firstLast.current?.close()} aria-label={t.close}>×</button></header>{data?.columns?.map(column=>{const groups=new Map();for(const row of data.rows.filter(row=>row.column===column.id)){if(!groups.has(row.destination))groups.set(row.destination,[]);groups.get(row.destination).push(row);}return <section key={column.id}><h3>{stationName(column.next)} {t.toward}</h3><div className="tl-first-label"><span/>{[t.first,t.last].map(label=><span key={label}>{label}</span>)}</div>{[...groups].map(([destination,entries])=><div className="tl-first-row" key={destination}><span>{stationName(destination)}</span><time>{displayTime(entries[0].minute)}</time><time>{displayTime(entries.at(-1).minute)}</time></div>)}</section>;})}</dialog>
 </main></div>;
}
