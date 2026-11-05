'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import GuideExperience from '../components/GuideExperience';
import { recordStat, startActivityTracking } from '../lib/record-stat';
import { copy, menuItems } from './copy';
import { iconPaths } from './icons';
import './v2.css';
import './design-refresh.css';
import useTrainArrivals from './useTrainArrivals';
import { TrainSummary, ArrivalDetails } from './TrainArrivals';
import NearbyTour from './NearbyTour';
import TrainTimetable from './TrainTimetable';
import CompactLostFound from './lost-found-demo/CompactLostFound';
import FacilityDemo from './facilities-demo/FacilityDemo';
import TrainLostFinder from './TrainLostFinder';
import StationFeedback, {useFeedbackCount} from './StationFeedback';
import {DEFAULT_FEEDBACK_STATION,FEEDBACK_STATIONS} from '../lib/feedback-config';
import {feedbackCopy} from './feedback-copy';
import { CURRENT_STATION } from '../lib/train-arrivals';
import {lostFoundStation} from '../lib/lost-found-stations';
function Icon({name}) { return <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{__html:iconPaths[name] || iconPaths.train}}/>; }
const chatWarning={ko:['이름·연락처는 입력하지 마세요.','질문은 외부 AI로 전송·저장됩니다.'],en:['Do not share personal details.','Questions are sent to AI and stored.'],ja:['個人情報は入力しないでください。','質問は外部AIに送信・保存されます。'],zh:['请勿输入姓名、联系方式等个人信息。','问题将发送至外部AI并保存。']};
const navigationCopy={ko:{guide:'전체 안내',ai:'AI 질문',live:'도착정보'},en:{guide:'All guides',ai:'Ask AI',live:'Arrivals'},ja:{guide:'案内一覧',ai:'AIに質問',live:'到着情報'},zh:{guide:'全部指南',ai:'AI提问',live:'到站信息'}};
const languages=[['ko','한국어'],['en','English'],['ja','日本語'],['zh','中文']];
const views=new Set(['home','chat','live',...menuItems.map(x=>x.id)]);
function readView(){const v=new URLSearchParams(window.location.search).get('view');return views.has(v)?v:'home';}
export default function V2Guide({station=DEFAULT_FEEDBACK_STATION,stationContext=null,stationTools=null,initialLanguage='ko',onLanguageChange=null,basePath='/v2'}) {
  const feedbackStation=stationContext?FEEDBACK_STATIONS[stationContext.stationCode]:station;
  const tourStation=stationContext||station;
  const foundStation=stationContext?lostFoundStation(stationContext.stationCode):station;
  const [lang,setLang]=useState(initialLanguage),[view,setView]=useState('home'),[mounted,setMounted]=useState({}),[question,setQuestion]=useState(''),[chatRequest,setChatRequest]=useState(null),[chatBusy,setChatBusy]=useState(false);
  const homeScroll=useRef(0),titleRef=useRef(null),started=useRef(false),requestSequence=useRef(0);
  const feedbackBack=useRef(null);
  const [keyboardOpen,setKeyboardOpen]=useState(false);
  const [chatViewport,setChatViewport]=useState(null);
  const [languageOpen,setLanguageOpen]=useState(false);
  const languageTrigger=useRef(null);
  const [restoration,setRestoration]=useState(null),[detail,setDetail]=useState(false),[visits,setVisits]=useState({});
  const viewRef=useRef(view);viewRef.current=view;
  const publishStep=useCallback((key,data)=>{
    const current=window.history.state||{};const root=key==='root';
    const state={...current,sagKey:key,sagData:data,sagDetail:!root};
    if(!current.sagKey&&!root&&viewRef.current==='feedback'){window.history.replaceState({...current,sagKey:'root',sagData:{feedbackScreen:'entry'},sagDetail:false},'');state.sagV2Depth=(current.sagV2Depth||0)+1;window.history.pushState(state,'');setDetail(true);return;}
    // Changing the route origin starts a new form. Do not pop to an older
    // snapshot, which would silently overwrite the origin the user just chose.
    if(root&&current.sagDetail&&data?.routeState?.originCode&&data.routeState.originCode!==current.sagData?.routeState?.originCode){window.history.replaceState({...state,sagDetail:false},'');setDetail(false);return;}
    if(root&&current.sagDetail){window.history.back();return;}
    if(current.sagKey&&current.sagKey!==key&&key!=='feedback:done'){state.sagV2Depth=(current.sagV2Depth||0)+1;window.history.pushState(state,'');}
    else window.history.replaceState(state,'');
    setDetail(!root);
  },[]);
  const onFeedbackScreen=useCallback(handler=>{feedbackBack.current=handler;},[]);
  const feedbackCount=useFeedbackCount(feedbackStation.id,view==='home');
  const t=copy[lang];
  const arrivals=useTrainArrivals(view==='home'||view==='live',stationContext?.stationCode||null);
  const title=view==='chat'?t.chat:view==='live'?t.liveTitle:t.menu[menuItems.findIndex(x=>x.id===view)] || t.pending;
  function activate(next){if(typeof document!=='undefined')document.activeElement?.blur?.();setMounted(prev=>({...prev,[next]:true}));setView(next);}
  useEffect(()=>{
    if(started.current)return;started.current=true;
    const initial=readView();activate(initial);window.history.replaceState({...(window.history.state||{}),sagV2:true,sagV2Depth:0},'',window.location.href);
    recordStat('page_view','visit','ko');
  },[]);
  useEffect(()=>{const onPop=()=>{const next=readView();activate(next);setDetail(!!window.history.state?.sagDetail);setRestoration({view:next,data:window.history.state?.sagData,serial:Date.now()+Math.random()});};window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);},[]);
  useEffect(()=>startActivityTracking(),[]);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{if(view==='home')window.scrollTo(0,homeScroll.current);else{window.scrollTo(0,0);titleRef.current?.focus({preventScroll:true});}});
    return()=>cancelAnimationFrame(frame);
  },[view]);
  function navigate(next){
    if(next===view)return;
    if(view==='home')homeScroll.current=window.scrollY;
    if(next!=='home'&&next!=='chat'&&next!=='feedback')setVisits(prev=>({...prev,[next]:(prev[next]||0)+1}));
    setRestoration(null);setDetail(false);
    const item=menuItems.find(x=>x.id===next);
    if(['timetable','tour','found','facility','lost'].includes(next))recordStat('quick_menu',next,lang);
    if(item?.action && mounted[next])recordStat('quick_menu',item.action,lang);
    const url=new URL(window.location.href);url.searchParams.delete('place');if(next==='home')url.searchParams.delete('view');else url.searchParams.set('view',next);
    window.history.pushState({...(window.history.state||{}),sagV2:true,sagKey:null,sagData:null,sagDetail:false,sagV2Depth:(window.history.state?.sagV2Depth||0)+1},'',url.pathname+url.search+url.hash);activate(next);
  }
  function back(){if((window.history.state?.sagV2Depth||0)>0)window.history.back();else navigate('home');}

  useEffect(()=>setLang(initialLanguage),[initialLanguage]);
  function changeLanguage(next){if(next!==lang){recordStat('language_change',next,next);setLang(next);const url=new URL(window.location.href);if(next==='ko')url.searchParams.delete('lang');else url.searchParams.set('lang',next);window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);onLanguageChange?.(next);}}

  function send(text){const clean=text.trim();if(!clean||chatBusy)return;setChatRequest({id:++requestSequence.current,text:clean});setQuestion('');navigate('chat');}
  useEffect(()=>{
    if(view!=='chat'){setKeyboardOpen(false);setChatViewport(null);return;}
    // Keep the document still; only the message list should scroll in chat.
    // iOS pans the visual viewport while focusing an input, independently of resize.
    const root=document.documentElement,body=document.body,scrollY=window.scrollY;
    const previous={rootOverflow:root.style.overflow,position:body.style.position,top:body.style.top,width:body.style.width,overflow:body.style.overflow};
    root.style.overflow='hidden';body.style.position='fixed';body.style.top='0px';body.style.width='100%';body.style.overflow='hidden';
    const viewport=window.visualViewport;
    let baseline=viewport?.height||window.innerHeight,frame=0;
    const timers=new Set();
    const sync=()=>{
      const height=viewport?.height||window.innerHeight;
      const focused=!!document.activeElement?.matches('.v2-chat-pane input,.v2-chat-pane textarea');
      // Never turn Safari's temporary keyboard pan into a permanent layout offset.
      // Its scroll and keyboard closing animations can finish after focusout.
      if(window.scrollY||viewport?.offsetTop)window.scrollTo(0,0);
      const open=focused&&baseline-height>150;
      if(!focused)baseline=height;
      setKeyboardOpen(open);
      setChatViewport(previous=>previous?.height===height?previous:{height});
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(sync);};
    const settle=()=>{schedule();for(const delay of [100,300,600]){const timer=setTimeout(()=>{timers.delete(timer);schedule();},delay);timers.add(timer);}};
    viewport?.addEventListener('resize',schedule);viewport?.addEventListener('scroll',schedule);
    window.addEventListener('resize',schedule);document.addEventListener('focusin',settle);document.addEventListener('focusout',settle);window.addEventListener('scroll',schedule);sync();
    return()=>{
      cancelAnimationFrame(frame);viewport?.removeEventListener('resize',schedule);viewport?.removeEventListener('scroll',schedule);
      window.removeEventListener('resize',schedule);document.removeEventListener('focusin',settle);document.removeEventListener('focusout',settle);window.removeEventListener('scroll',schedule);timers.forEach(clearTimeout);
      root.style.overflow=previous.rootOverflow;Object.assign(body.style,{position:previous.position,top:previous.top,width:previous.width,overflow:previous.overflow});
      window.scrollTo(0,scrollY);
    };
  },[view]);
  useEffect(()=>{setLanguageOpen(false);},[view,keyboardOpen]);
  useEffect(()=>{
    if(!languageOpen)return;
    const frame=requestAnimationFrame(()=>document.querySelector('.v2-language-popover button[aria-pressed=true]')?.focus());
    const outside=e=>{if(!e.target.closest('.v2-language-picker'))setLanguageOpen(false);};
    const escape=e=>{if(e.key==='Escape'){e.preventDefault();setLanguageOpen(false);languageTrigger.current?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[languageOpen]);
  function bottomTabs(home=false){const n=navigationCopy[lang],open=languageOpen&&(home?view==='home':view!=='home'),popupId=home?'v2-home-language-popup':'v2-workspace-language-popup';return <nav className="v2-bottom-tabs" aria-label={n.guide} hidden={view==='chat'&&keyboardOpen}>
    {[['home','home',n.guide],['chat','spark',n.ai]].map(([id,icon,label])=><button key={id} aria-current={view===id?'page':undefined} onClick={()=>navigate(id)}><Icon name={icon}/><span>{label}</span></button>)}
    <div className="v2-language-picker">
      <button className="v2-language-toggle" aria-haspopup="dialog" aria-expanded={open} aria-controls={open?popupId:undefined} onClick={e=>{languageTrigger.current=e.currentTarget;setLanguageOpen(v=>!v);}}><Icon name="globe"/><span>{t.language}</span></button>
      {open&&<div id={popupId} className="v2-language-popover" role="dialog" aria-label={t.language}><p>{t.language}</p><div>{languages.map(([code,label])=><button key={code} aria-pressed={lang===code} lang={code==='zh'?'zh-CN':code} onClick={()=>{changeLanguage(code);setLanguageOpen(false);languageTrigger.current?.focus();}}>{label}</button>)}</div></div>}
    </div>
  </nav>;}
  return <main className={"v2-app v2-design-refresh"+(view==='chat'?' v2-chat-active':'')+(keyboardOpen?' v2-keyboard-open':'')} lang={lang==='zh'?'zh-CN':lang}>
    <div className="v2-home" hidden={view!=='home'}>
      <TrainSummary stationControl={null} stationContext={stationContext} state={arrivals} lang={lang} t={t} onDetails={()=>navigate('live')} active={view==='home'}/>

      <section className="v2-ai">
        <div className="v2-ai-top"><span className="v2-eyebrow"><i/>YOUR AI STATION GUIDE</span><div className="v2-ai-station-tools">{stationTools||<strong>{t.station}</strong>}</div></div>
        <h1>{t.title}</h1><p>{t.description}</p>
        <form className="v2-ask" onSubmit={e=>{e.preventDefault();send(question);}}><input aria-label={t.placeholder} placeholder={t.placeholder} value={question} onChange={e=>setQuestion(e.target.value)} maxLength={500} required disabled={chatBusy}/><button aria-label={t.send} disabled={chatBusy}><Icon name="arrow"/></button></form>
        <div className="v2-ai-footer"><div className="v2-examples">{t.examples.map(q=><button key={q} disabled={chatBusy} onClick={()=>send(q)}>{q}</button>)}</div></div>{chatBusy&&<span className="v2-waiting" role="status">{t.waiting}</span>}
      </section>
      <div className="v2-section-title"><h2>{t.quick}</h2><span>{t.quickSub}</span></div>
      <nav className="v2-grid" aria-label={t.quick}>{menuItems.map((item,index)=><button key={item.id} onClick={()=>navigate(item.id)}><span className={'v2-icon v2-icon-'+item.id}><Icon name={item.icon}/>{item.id==='feedback'&&feedbackCount>0&&<span className="sf-badge" aria-label={feedbackCopy[lang].badge+': '+feedbackCount}>{feedbackCount}</span>}</span><strong>{t.menu[index]}</strong>{!item.action&&!['timetable','tour','found','facility','lost','feedback'].includes(item.id)&&<small>{t.pending}</small>}</button>)}</nav>
      <button className="v2-discover" onClick={()=>navigate('tour')}><span className="v2-market" aria-hidden="true"><svg viewBox="0 0 80 80"><circle cx="64" cy="16" r="7" fill="#dce8c2"/><rect x="15" y="35" width="49" height="33" rx="2" fill="#f3f7f0"/><path d="m17 21-8 19h60l-8-19Z" fill="#65947b"/><path d="M23 51h12v10H23Z" fill="#d4e3d7"/><path d="M45 49h11v19H45Z" fill="#abc8b4"/></svg></span><span><small>{t.outside}</small><strong>{t.discover}</strong><span>{t.discoverSub}</span></span><b>↗</b></button>
      {bottomTabs(true)}
    </div>
    <div className={"v2-workspace "+(view==='chat'?'v2-chat-workspace':'')} style={view==='chat'&&chatViewport?{height:chatViewport.height,top:0}:undefined} hidden={view==='home'}>
      <header className="v2-view-header"><button className="v2-back-button" onClick={back} aria-label={t.back}><Icon name="back"/></button><h1 ref={titleRef} tabIndex={-1}>{title}</h1>{view==='chat'&&<p className="v2-chat-privacy" title={t.privacy} aria-label={t.privacy}>{chatWarning[lang].map((line,i)=><span key={i}>{line}</span>)}</p>}<button className="v2-home-button" onClick={()=>navigate('home')} aria-label={t.home} title={t.home}><Icon name="house"/></button></header>
      {['chat',...menuItems.filter(x=>x.action).map(x=>x.id)].map(id=>mounted[id]&&<section className={'v2-pane '+(id==='chat'?'v2-chat-pane':'v2-guide-pane')} hidden={view!==id} key={id} aria-label={id==='chat'?t.chat:t.menu[menuItems.findIndex(x=>x.id===id)]}><GuideExperience embedded showPrivacyNotice={id!=='chat'} chatStation={stationContext} onRecommendMenu={id==='chat'?navigate:null} routeStation={id==='route'?stationContext:null} resetToken={visits[id]||0} navigationSnapshot={restoration?.view===id?restoration:null} onNavigationStep={id===view&&id!=='chat'?publishStep:null} initialAction={menuItems.find(x=>x.id===id)?.action||null} language={lang} active={view===id} chatRequest={id==='chat'?chatRequest:null} onBusyChange={id==='chat'?setChatBusy:null}/></section>)}
      {mounted.tour&&<NearbyTour key={(visits.tour||0)+'-'+(tourStation.stationCode||tourStation.id)} station={tourStation} lang={lang} active={view==='tour'}/>}
      {mounted.timetable&&<div className="v2-feature-pane" hidden={view!=='timetable'}><TrainTimetable key={visits.timetable||0} lang={lang} active={view==='timetable'} stationContext={stationContext}/></div>}
      {mounted.found&&foundStation&&<div className="v2-feature-pane" hidden={view!=='found'}><CompactLostFound key={(visits.found||0)+'-'+foundStation.id} embedded station={foundStation} lang={lang} active={view==='found'} onNavigationStep={view==='found'?publishStep:null} navigationSnapshot={restoration?.view==='found'?restoration:null}/></div>}
      {mounted.facility&&<div className="v2-feature-pane" hidden={view!=='facility'}><FacilityDemo key={visits.facility||0} embedded stationContext={stationContext} lang={lang} active={view==='facility'}/></div>}
      {mounted.lost&&<div className="v2-feature-pane" hidden={view!=='lost'}><TrainLostFinder key={(visits.lost||0)+'-'+(stationContext?.stationCode||'0154')} lang={lang} active={view==='lost'} defaultStation={stationContext?.names.ko||CURRENT_STATION.name} defaultLine={stationContext?.line||String(Number(CURRENT_STATION.lineId)-1000)} defaultNames={stationContext?.names}/></div>}
      {mounted.feedback&&<StationFeedback key={feedbackStation.id} navigationSnapshot={restoration?.view==='feedback'?restoration:null} onNavigationStep={view==='feedback'?publishStep:null} station={feedbackStation} lang={lang} active={view==='feedback'} onInternalScreen={onFeedbackScreen}/>}
      {view==='live'&&<ArrivalDetails stationContext={stationContext} state={arrivals} lang={lang} t={t}/>}

      {!['home','chat','live','tour','timetable','found','facility','lost','feedback',...menuItems.filter(x=>x.action).map(x=>x.id)].includes(view)&&<section className="v2-pending"><span className="v2-pending-icon"><Icon name={menuItems.find(x=>x.id===view)?.icon||'train'}/></span><small>{t.pending}</small><h2>{title}</h2><p>{view==='live'?t.trainHelp:t.pendingText}</p><button onClick={()=>navigate('home')}>{t.home}</button></section>}
      {bottomTabs()}
    </div>
  </main>;
}
