'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {recordStat} from '../../lib/record-stat';
import {getStationByCode} from '../../lib/station-master';
import {officialStationMatches,officialStationName} from '../../lib/officialStations';

import {buildRouteStationTimeline} from '../../lib/route-station-timeline';
import './route-lab.css';

import RouteResult,{COPY,EXAMPLES,RESULT_ACTIONS,normalizeStation,lineColor,normalizeLine,lineName,stationLabel,matchesForQuery,buildRouteUrl} from './RouteResult';
import RouteShareButton from './RouteShareButton';

export default function UnifiedRouteLab({embedded=false,stationContext=null,language='ko',active=true,onNavigationStep=null,deliveryContext=null,routeRequest=null,navigationSnapshot=null}){
 const [standaloneLang,setStandaloneLang]=useState('ko'),[originCode,setOriginCode]=useState(stationContext?.stationCode||'0154');
 const [resultLang,setResultLang]=useState(language),[routeProof,setRouteProof]=useState(null),[placeProof,setPlaceProof]=useState(null);
 const lang=embedded&&COPY[language]?language:standaloneLang;
 const [query,setQuery]=useState(''),[picked,setPicked]=useState(null),[focused,setFocused]=useState(false);
 const suggestionList=useRef(null),[moreSuggestions,setMoreSuggestions]=useState(false);
 const updateSuggestionHint=()=>{const el=suggestionList.current;setMoreSuggestions(!!el&&el.scrollLeft+el.clientWidth<el.scrollWidth-3);};
 const [mode,setMode]=useState('duration'),[place,setPlace]=useState(null),[route,setRoute]=useState(null);
 const [loading,setLoading]=useState(''),[error,setError]=useState('');
 const [aiMs,setAiMs]=useState(null);
 const [feedback,setFeedback]=useState(null);
 const feedbackRef=useRef(false);
 function resetFeedback(){feedbackRef.current=false;setFeedback(null);}
 function submitFeedback(result){
  if(feedbackRef.current)return;
  feedbackRef.current=true;
  setFeedback(result);
  recordStat('feedback',result,lang);
 }
 const requestRef=useRef(null),resultRef=useRef(null),placeRef=useRef(null),scrollPendingRef=useRef(false);
 const navigationRef=useRef(null);
 navigationRef.current=embedded&&active?onNavigationStep:null;
 function saveNavigation(key,overrides={}){
  navigationRef.current?.(key,{routeState:{originCode,query,picked,mode,place,route,aiMs,resultLang,routeProof,placeProof,...overrides}});
 }
 const t=COPY[lang],actions=RESULT_ACTIONS[resultLang],origin=getStationByCode(originCode)||getStationByCode('0154');
 const originName=origin.names[lang]||origin.names.ko;
 const departureLabel=({ko:`${originName} 출발`,en:`From ${originName}`,ja:`${originName}から出発`,zh:`从${originName}出发`})[lang];
 const searchResultLanguage=lang;
 const stationMatches=useMemo(()=>matchesForQuery(query,lang),[query,lang]);
 useEffect(()=>{
  const el=suggestionList.current;if(!el){setMoreSuggestions(false);return;}
  el.scrollLeft=0;const frame=requestAnimationFrame(updateSuggestionHint);
  const observer=new ResizeObserver(updateSuggestionHint);observer.observe(el);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();};
 },[focused,picked,stationMatches]);
 useEffect(()=>{
  if(embedded)return;
  const p=new URLSearchParams(window.location.search);
  if(getStationByCode(p.get('station')))setOriginCode(p.get('station'));
  if(COPY[p.get('lang')])setStandaloneLang(p.get('lang'));
 },[embedded]);
 useEffect(()=>{if(embedded&&stationContext?.stationCode)setOriginCode(stationContext.stationCode);},[embedded,stationContext?.stationCode]);
 useEffect(()=>{
  if(!embedded||!active||!navigationRef.current)return;
  if(String(window.history.state?.sagKey||'').startsWith('route:'))return;
  saveNavigation('route:form',{route:null,place:null,aiMs:null});
 },[embedded,active]);
 useEffect(()=>{
  if(!embedded||navigationSnapshot?.view!=='route')return;
  const saved=navigationSnapshot.data?.routeState;
  if(!saved||!getStationByCode(saved.originCode))return;
  scrollPendingRef.current=false;requestRef.current?.abort();requestRef.current=null;setLoading('');setError('');resetFeedback();
  setOriginCode(embedded&&getStationByCode(stationContext?.stationCode)?stationContext.stationCode:saved.originCode);setQuery(saved.query||'');setPicked(saved.picked||null);
  setResultLang(saved.resultLang||lang);setRouteProof(saved.routeProof||null);setPlaceProof(saved.placeProof||null);setMode(saved.mode||'duration');setPlace(saved.place||null);setRoute(saved.route||null);setAiMs(saved.aiMs??null);
 },[embedded,navigationSnapshot?.serial]);
 useEffect(()=>{if(embedded&&!active){scrollPendingRef.current=false;requestRef.current?.abort();requestRef.current=null;setLoading('');}},[embedded,active]);
 useEffect(()=>()=>requestRef.current?.abort(),[]);
 useEffect(()=>{
  if(loading||!scrollPendingRef.current||(!place&&!route))return;
  scrollPendingRef.current=false;
  const frame=requestAnimationFrame(()=>{
   const target=place?placeRef.current:resultRef.current;
   if(!target)return;
   const behavior=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
   const pane=embedded?target.closest('.v2-feature-pane'):null;
   if(pane){
    pane.scrollTo({top:Math.max(0,pane.scrollTop+target.getBoundingClientRect().top-pane.getBoundingClientRect().top-12),behavior});
   }else{
    window.scrollTo({top:Math.max(0,window.scrollY+target.getBoundingClientRect().top-12),behavior});
   }
  });
  return()=>cancelAnimationFrame(frame);
 },[loading,place,route,embedded]);
 const setLanguage=value=>{
  if(embedded)return;
  setStandaloneLang(value);const u=new URL(window.location.href);u.searchParams.set('lang',value);
  window.history.replaceState(window.history.state,'',u.pathname+u.search);
 };
 const changeQuery=value=>{
  scrollPendingRef.current=false;requestRef.current?.abort();setLoading('');setAiMs(null);resetFeedback();setQuery(value);setPicked(null);setRoute(null);setPlace(null);setError('');
  if(embedded)saveNavigation('route:form',{query:value,picked:null,route:null,place:null,aiMs:null});
 };
 const choose=st=>{
  scrollPendingRef.current=false;requestRef.current?.abort();setLoading('');setAiMs(null);resetFeedback();setQuery(st[lang]||st.ko);setPicked(st);setFocused(false);setRoute(null);setPlace(null);setError('');
  if(embedded)saveNavigation('route:form',{query:st[lang]||st.ko,picked:st,route:null,place:null,aiMs:null});
 };
 async function lookupRoute(station,signal,placeResult=null,searchTerm=query){
  setLoading('route');setError('');setRoute(null);
  if(normalizeStation(station.ko)===normalizeStation(origin.names.ko)){setError(t.same);setLoading('');recordStat('route_search','failure',lang);return;}
  const response=await fetch(buildRouteUrl(originCode,station,mode),{cache:'no-store',signal});
  const result=await response.json();
  if(!response.ok||!result.ok||!result.route)throw Error(result.error||t.fail);
  if(result.route.originCode!==originCode)throw Error('ORIGIN_MISMATCH');
  if(!signal.aborted){
   setRoute(result.route);setRouteProof(result.shareProof||null);
   recordStat('route_search','success',lang);
   if(embedded)saveNavigation('route:result',{query:searchTerm,place:placeResult,route:result.route,routeProof:result.shareProof||null,placeProof:placeResult?.shareProof||null,resultLang:searchResultLanguage});
  }
 }
 const processedRouteRequest=useRef(null);
 useEffect(()=>{
  if(!embedded||!active||!routeRequest?.id||processedRouteRequest.current===routeRequest.id)return;
  processedRouteRequest.current=routeRequest.id;
  const term=typeof routeRequest.query==='string'?routeRequest.query.trim():'';
  if(!term||term.length>100)return;
  setQuery(term);setPicked(null);void perform(term);
 },[embedded,active,routeRequest?.id]);
 async function perform(requestedTerm=null){
  const term=(typeof requestedTerm==='string'?requestedTerm:query).trim();
  if(!term||loading)return;
  recordStat('route_search','request',lang,null,term);
  requestRef.current?.abort();const ctrl=new AbortController();requestRef.current=ctrl;scrollPendingRef.current=true;
  setFocused(false);setError('');setRoute(null);setPlace(null);setAiMs(null);resetFeedback();
  if(embedded)saveNavigation('route:form',{query:term,route:null,place:null,aiMs:null});
  const outputLang=searchResultLanguage;setResultLang(outputLang);setRouteProof(null);setPlaceProof(null);
  const matches=typeof requestedTerm==='string'?matchesForQuery(term,lang):stationMatches;
  const selected=typeof requestedTerm==='string'?null:picked;
  const exact=matches.find(s=>[s.ko,s.en,s.ja,s.zh,s.ko+'역'].some(x=>normalizeStation(x)===normalizeStation(term)));
  try{
   if(selected||exact){
    await lookupRoute(selected||exact,ctrl.signal,null,term);
    return;
   }
   setLoading('place');
   const aiStartedAt=performance.now();
   const response=await fetch('/api/v2/route-place-test',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({query:term,lang:outputLang,stationCode:originCode}),signal:ctrl.signal,cache:'no-store'
   });
   const result=await response.json();
   if(!response.ok||!result.ok)throw Error(result.error||t.fail);
   if(ctrl.signal.aborted)return;
   setAiMs(Math.round(performance.now()-aiStartedAt));
   setPlace(result);setPlaceProof(result.shareProof||null);
   if(result.status==='found'&&result.station){
    await lookupRoute(result.station,ctrl.signal,result,term);
   }else recordStat('route_search','failure',lang);
  }catch(e){if(!ctrl.signal.aborted){recordStat('route_search','failure',lang);setError(e.message||t.fail);}}
  finally{if(requestRef.current===ctrl){requestRef.current=null;setLoading('');}}
 }
 function searchAnotherDestination(){
  changeQuery('');
  setFocused(false);
  requestAnimationFrame(()=>document.getElementById('rl-destination')?.focus());
 }
 const Root=embedded?'section':'main';
 return <Root className={'route-lab'+(embedded?' rl-embedded':'')+(deliveryContext?' rl-delivery':'')} lang={lang==='zh'?'zh-CN':lang}>
  <div className="rl-shell">
   <header className={"rl-top"+(embedded?" rl-top-embedded":"")}>
    {!embedded&&<div className="rl-top-row"><span className="rl-lab-label"><span className="rl-pulse"/> {t.lab}</span>
     <select aria-label="Language" value={lang} onChange={e=>setLanguage(e.target.value)}><option value="ko">한국어</option><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option></select>
    </div>}
    <h1>{t.title}</h1><p>{t.subtitle}</p>
   </header>
   <section className="rl-search-card">
    <form onSubmit={e=>{e.preventDefault();void perform(false);}}>
     <div className="rl-destination-heading">
      <label htmlFor="rl-destination"><svg className="rl-destination-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>{t.dest}</span></label>
      <span className="rl-departure-chip" title={departureLabel}><span className="rl-departure-line" style={{background:lineColor(origin.line+'호선')}}>{origin.line}</span><span className="rl-departure-name">{departureLabel}</span></span>
     </div>
     <div className="rl-query-box"><span className="rl-search-icon">⌕</span><input id="rl-destination" value={query} onChange={e=>changeQuery(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),180)} placeholder={t.placeholder} maxLength={100} autoComplete="off"/>{query&&<button type="button" onClick={()=>changeQuery('')} aria-label="Clear">×</button>}</div>
     {focused&&!picked&&stationMatches.length>0&&<div className="rl-match-wrap"><div ref={suggestionList} onScroll={updateSuggestionHint} className="rl-match-list" role="listbox" aria-label={t.suggest}>{stationMatches.slice(0,6).map(s=>{const lines=(s.lines||[s.line]).map(line=>lineName(normalizeLine(line),lang)).join(' · ');return <button key={s.code} type="button" role="option" aria-selected="false" title={stationLabel(s,lang)+' · '+lines} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(s)}><strong>{stationLabel(s,lang)}</strong><small>{lines}</small></button>;})}</div>{moreSuggestions&&<span className="rl-suggestion-hint" aria-hidden="true">›</span>}</div>}
     
     <div className="rl-route-options"><div role="group" aria-label={t.options}>{['duration','distance','transfer'].map((x,i)=><button type="button" key={x} aria-pressed={mode===x} onClick={()=>{setMode(x);setRoute(null);resetFeedback();if(embedded)saveNavigation('route:form',{mode:x,route:null});}}>{t.modes[i]}</button>)}</div></div>
     <div className="rl-submit-row rl-submit-full">
     <button className="rl-submit" type="submit" disabled={!query.trim()||!!loading}>{loading==='place'?t.searchingPlace:loading==='route'?t.searchingRoute:<>{t.search}<span aria-hidden="true">→</span></>}</button></div>
     
    </form>
    <div className="rl-examples"><strong>{t.examples}</strong><div>{EXAMPLES.slice(0,3).map(ex=><button key={ex.ko} type="button" title={ex[lang]||ex.ko} onClick={()=>{changeQuery(ex[lang]||ex.ko);setFocused(false);}}>{ex[lang]||ex.ko}</button>)}</div></div>
   </section>
   {(loading||error)&&<section className={'rl-alert'+(error?' rl-error':'')} role="status"><span>{loading==='place'?'✦':loading==='route'?'🚇':'ⓘ'}</span>{error|| (loading==='place'?t.searchingPlace:t.searchingRoute)}</section>}
   <RouteResult place={place} route={route} lang={resultLang} query={query} placeRef={placeRef} resultRef={resultRef}/>
   {(route||place)&&<div className="rl-result-actions" lang={resultLang==='zh'?'zh-CN':resultLang}>
    <div className="rl-result-primary">
     {!loading&&!error&&route&&routeProof&&(!place||placeProof)&&<RouteShareButton deliveryContext={deliveryContext} routeProof={routeProof} placeProof={placeProof} language={resultLang} originName={origin.names[resultLang]||origin.names.ko} destination={place?.place||officialStationName(route.destination,resultLang,name=>name)}/>}
     <button type="button" className="rl-new-destination" onClick={searchAnotherDestination}>{actions.again}</button>
    </div>
    <div className="rl-result-feedback" role="group" aria-label={actions.label} aria-live="polite">
     {feedback?<span>{actions.thanks}</span>:<>
      <button type="button" onClick={()=>submitFeedback('solved')}>✓ {actions.yes}</button>
      <button type="button" onClick={()=>submitFeedback('not_solved')}>✕ {actions.no}</button>
     </>}
    </div>
   </div>}
   {!embedded&&<footer className="rl-footer"><p>{t.sourceNote}</p><p>{t.testing}</p></footer>}
  </div>
 </Root>;
}
