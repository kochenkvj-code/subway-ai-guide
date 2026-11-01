'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {FEEDBACK_TYPES,FEEDBACK_LOCATIONS} from '../lib/feedback-config';
import {feedbackCopy} from './feedback-copy';
import './station-feedback.css';
const API='/api/stats/feedback';
const tokenKey=station=>'sag_feedback_access_'+station;
function getToken(station){try{return sessionStorage.getItem(tokenKey(station))||'';}catch{return '';}}
function saveToken(station,token){try{if(token)sessionStorage.setItem(tokenKey(station),token);else sessionStorage.removeItem(tokenKey(station));}catch{}}
export function useFeedbackCount(station,active=true){
 const [value,setValue]=useState({station:null,count:0});
 useEffect(()=>{
  if(!active)return;
  let alive=true;let controller=null;
  const update=async()=>{
   if(document.visibilityState!=='visible')return;
   controller?.abort();controller=new AbortController();
   try{const r=await fetch(API+'/count?'+new URLSearchParams({station}),{cache:'no-store',signal:controller.signal});if(r.ok){const data=await r.json();if(alive)setValue({station,count:data.count});}}catch{}
  };
  void update();const timer=setInterval(update,30000);
  window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);window.addEventListener('station-feedback-change',update);
  return()=>{alive=false;controller?.abort();clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);window.removeEventListener('station-feedback-change',update);};
 },[active,station]);
 return value.station===station?value.count:0;
}
function OpinionBody({content,t}){
 const dialog=useRef(null),[expanded,setExpanded]=useState(false);
 useEffect(()=>{if(expanded)dialog.current?.showModal();else dialog.current?.close();},[expanded]);
 return <><button className="sf-expand sf-read-content" aria-label={t.more} aria-expanded={expanded} onClick={()=>setExpanded(true)}><p className="sf-clamp">{content}</p><span aria-hidden="true">↗</span></button><dialog className="sf-detail-dialog" ref={dialog} onClose={()=>setExpanded(false)} aria-label={t.content}><button onClick={()=>setExpanded(false)}>{t.less} ×</button><p>{content}</p></dialog></>;
}
export default function StationFeedback({station,lang,active,onInternalScreen,onNavigationStep=null,navigationSnapshot=null}){
 const t=feedbackCopy[lang]||feedbackCopy.ko;
 const [screen,setScreen]=useState('entry'),[type,setType]=useState(''),[location,setLocation]=useState(''),[detail,setDetail]=useState(''),[content,setContent]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[rows,setRows]=useState([]),[page,setPage]=useState(0),[total,setTotal]=useState(0),[recent,setRecent]=useState(0),[filter,setFilter]=useState(''),[stars,setStars]=useState(false),[visibility,setVisibility]=useState('visible'),[admin,setAdmin]=useState(false),[pin,setPin]=useState(''),[pinConfigured,setPinConfigured]=useState(true);
 const submission=useRef(null),inflight=useRef(false),pane=useRef(null);
 const [revision,setRevision]=useState(0);
 const [pageSize,setPageSize]=useState(4);
 useEffect(()=>{if(!active||screen!=='inbox'||!pane.current)return;let previousSize=0;const update=()=>{const height=pane.current.clientHeight;const size=height>=650?5:4;if(previousSize!==size){previousSize=size;setPageSize(size);setPage(0);}};const observer=new ResizeObserver(update);observer.observe(pane.current);update();return()=>observer.disconnect();},[active,screen]);
 const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+getToken(station.id)});
 const notify=()=>window.dispatchEvent(new Event('station-feedback-change'));
 const go=useCallback(next=>{setError('');setScreen(next);},[]);
 useEffect(()=>{onInternalScreen(screen==='entry'?null:()=>go('entry'));return()=>onInternalScreen(null);},[screen,onInternalScreen,go]);
 useEffect(()=>{if(active&&pane.current)pane.current.scrollTop=0;},[screen,page,active]);
 useEffect(()=>{
  if(!active||screen!=='inbox')return;
  let canceled=false;const controller=new AbortController();setBusy(true);setError('');
  fetch(API+'?'+new URLSearchParams({station:station.id,page,size:pageSize,type:filter,stars:stars?'1':'0',visibility}),{headers:headers(),cache:'no-store',signal:controller.signal}).then(async r=>{
   const data=await r.json();if(canceled)return;
   if(r.status===401){saveToken(station.id,'');setPinConfigured(data.pinConfigured!==false);setScreen('auth');return;}
   if(!r.ok)throw Error(data.error);
   const last=Math.max(0,Math.ceil(data.total/pageSize)-1);if(page>last){setPage(last);return;}
   setRows(data.rows);setTotal(data.total);setRecent(data.recent);setAdmin(data.admin);
  }).catch(e=>{if(!canceled&&e.name!=='AbortError')setError('error');}).finally(()=>{if(!canceled)setBusy(false);});
  return()=>{canceled=true;controller.abort();};
 // Each instance is keyed by station ID by the parent. Language changes only relabel content.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[active,screen,page,filter,stars,visibility,revision,pageSize,station.id]);
 useEffect(()=>{if(navigationSnapshot?.data?.feedbackScreen)setScreen(navigationSnapshot.data.feedbackScreen);},[navigationSnapshot]);
 useEffect(()=>{if(active&&screen!=='auth')onNavigationStep?.(screen==='entry'?'root':'feedback:'+screen,{feedbackScreen:screen});},[screen,active,onNavigationStep]);
 async function submit(e){
  e.preventDefault();if(inflight.current)return;
  if(!type||!content.trim()){setError('required');return;}
  const payload={station:station.id,type,location,detail:location?detail:'',content,language:lang};
  const fingerprint=JSON.stringify(payload);
  if(submission.current?.fingerprint!==fingerprint)submission.current={fingerprint,id:crypto.randomUUID()};
  inflight.current=true;setBusy(true);setError('');
  try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,request_id:submission.current.id})});
   if(!r.ok)throw Error(r.status===429?'limited':'saveError');
   setType('');setLocation('');setDetail('');setContent('');submission.current=null;notify();go('done');
  }catch(e){setError(e.message==='limited'?'limited':'saveError');}finally{inflight.current=false;setBusy(false);}
 }
 async function authenticate(e){
  e.preventDefault();if(inflight.current)return;inflight.current=true;setBusy(true);setError('');
  try{const r=await fetch(API+'/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({station:station.id,pin})});const data=await r.json();
   if(!r.ok)throw Error(r.status===429?'limited':data.error==='not_configured'?'unavailable':r.status===401?'incorrect':'error');
   saveToken(station.id,data.token);setPin('');go('inbox');
  }catch(e){setError(['limited','unavailable','incorrect'].includes(e.message)?e.message:'error');}finally{inflight.current=false;setBusy(false);}
 }
 async function change(row,field,value){
  if(inflight.current)return;if(field==='hidden'&&!window.confirm(value?t.hideConfirm:t.restoreConfirm))return;
  inflight.current=true;setBusy(true);setError('');
  try{const r=await fetch(API,{method:'PATCH',headers:headers(),body:JSON.stringify({station:station.id,id:row.id,field,value})});
   if(r.status===401){saveToken(station.id,'');go('auth');return;}
   if(!r.ok)throw Error();setRevision(n=>n+1);if(field==='hidden')notify();
  }catch{setError('error');}finally{inflight.current=false;setBusy(false);}
 }
 const formatTime=value=>new Intl.DateTimeFormat({ko:'ko-KR',en:'en-GB',ja:'ja-JP',zh:'zh-CN'}[lang],{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
 return <section className={"sf-pane "+(screen==='inbox'?'sf-inbox':'')} hidden={!active} ref={pane} aria-label={t.title}>
  <div className="sf-inner"><div className="sf-heading"><h2>{screen==='inbox'&&<span className="sf-line-badge" style={{background:station.color||'#24559b'}} aria-label={station.line}>{station.line}</span>}{screen==='inbox'?`${station.names[lang]||station.names.ko} ${t.inbox}`:screen==='write'?t.write:t.title}</h2>{screen==='inbox'?<span className="sf-inline-count">{t.recentShort} <strong>{recent}</strong>{t.unit}</span>:<div className="sf-station"><span style={{background:station.color||'#24559b'}}>{station.line}</span>{station.names[lang]||station.names.ko}</div>}</div>
  {screen==='entry'&&<><h2>{t.intro}</h2><p>{t.description}</p><button className="sf-choice" onClick={()=>go('write')}><span className="sf-icon">✎</span><span><strong>{t.write}</strong><small>{t.writeSub}</small></span><b>›</b></button><button className="sf-choice" onClick={()=>{setPage(0);go('inbox');}}><span className="sf-icon">▤</span><span><strong>{t.inbox}</strong><small>{t.inboxSub}</small></span><b>›</b></button><p className="sf-note">{t.notice}</p></>}
  {screen==='write'&&<><p>{t.writeIntro}</p><form onSubmit={submit}><fieldset disabled={busy}><legend>{t.type}</legend><div className="sf-chips">{FEEDBACK_TYPES.filter(id=>id!=='praise').map((id,i)=><button type="button" key={id} aria-pressed={type===id} onClick={()=>setType(id)}>{t.types[i]}</button>)}</div></fieldset><fieldset disabled={busy}><legend>{t.location} <small>{t.optional}</small></legend><div className="sf-chips sf-locations">{FEEDBACK_LOCATIONS.map((id,i)=><button type="button" key={id} aria-pressed={location===id} onClick={()=>{setLocation(location===id?'':id);setDetail('');}}>{t.locations[i]}</button>)}</div></fieldset>{location&&<><label htmlFor="sf-detail">{t.detail} <small>{t.optional}</small></label><input id="sf-detail" value={detail} maxLength={60} placeholder={t.detailHint} disabled={busy} onChange={e=>setDetail(e.target.value)}/></>}<label className="sf-content-label" htmlFor="sf-content">{t.content}<small>{content.length} / 500</small></label><textarea id="sf-content" value={content} required maxLength={500} placeholder={t.placeholder} disabled={busy} onChange={e=>setContent(e.target.value)}/><p className="sf-note sf-write-note">{t.shortNotice}</p><button className="sf-primary" disabled={busy}>{busy?t.sending:t.submit}</button></form></>}
  {screen==='done'&&<div className="sf-success"><span>✓</span><h2>{t.done}</h2><p>{t.doneSub}<br/>{t.notice}</p><button className="sf-primary" onClick={()=>go('entry')}>{t.return}</button></div>}
  {screen==='auth'&&<><h2>{t.pin}</h2><p>{pinConfigured?t.pinHint:t.unavailable}</p>{pinConfigured?<form onSubmit={authenticate}><label htmlFor="sf-pin">{t.pinLabel}</label><input id="sf-pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{4}" minLength={4} maxLength={4} required value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))}/><button className="sf-primary" disabled={busy}>{busy?t.loading:t.enter}</button></form>:<a className="sf-admin-link" href="/admin/stats">{t.adminLogin}</a>}</>}
  {screen==='inbox'&&<><div className="sf-chips sf-type-filter" role="group" aria-label={t.type}>{['',...FEEDBACK_TYPES.filter(id=>id!=='praise')].map((id,i)=><button key={id} aria-pressed={filter===id} onClick={()=>{setFilter(id);setPage(0);}}>{i?t.types[i-1]:t.allTypes}</button>)}</div><div className="sf-filter-row"><div className="sf-chips sf-extra-filters"><button title={t.starNote} aria-pressed={stars} onClick={()=>{setStars(v=>!v);setPage(0);}}>{stars?'★':'☆'} {t.stars}</button></div>{admin&&<div className="sf-chips sf-visibility" role="group" aria-label={t.visibility}>{[['visible',t.visible],['all',t.allVisibility],['hidden',t.hiddenOnly]].map(([id,label])=><button key={id} aria-pressed={visibility===id} onClick={()=>{setVisibility(id);setPage(0);}}>{label}</button>)}</div>}</div><div className="sf-tools"><button onClick={()=>setRevision(n=>n+1)}>{t.refresh}</button><button onClick={()=>{saveToken(station.id,'');go('entry');}}>{t.logout}</button></div>{busy?<p role="status">{t.loading}</p>:!error&&<>{rows.map(row=><article className="sf-opinion" key={row.id}><div className="sf-meta"><span>{t.types[FEEDBACK_TYPES.indexOf(row.type==='praise'?'other':row.type)]}</span>{row.hidden&&<span>{t.hiddenLabel}</span>}<time dateTime={row.created_at}>{formatTime(row.created_at)}</time><button className="sf-star" disabled={busy} aria-label={row.starred?t.unstar:t.star} aria-pressed={row.starred} onClick={()=>change(row,'starred',!row.starred)}>{row.starred?'★':'☆'}</button></div><OpinionBody content={row.content} t={t}/><div className="sf-bottom"><small>{row.location?t.locations[FEEDBACK_LOCATIONS.indexOf(row.location)]:t.none}{row.location_detail?' · '+row.location_detail:''}</small>{admin&&<button onClick={()=>change(row,'hidden',!row.hidden)}>{row.hidden?t.restore:t.hide}</button>}</div></article>)}{!rows.length&&<p>{t.empty}</p>}<div className="sf-pager"><button disabled={!page} onClick={()=>setPage(v=>v-1)}>{t.previous}</button><span>{page+1} / {Math.max(1,Math.ceil(total/pageSize))}</span><button disabled={(page+1)*pageSize>=total} onClick={()=>setPage(v=>v+1)}>{t.next}</button></div></>}<p className="sf-star-note">{t.starNote}</p></>}
  {error&&<p className="sf-error" role="alert">{t[error]||t.error}</p>}
 </div></section>;
}
