'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import GuideExperience from '../components/GuideExperience';
import UnifiedRouteLab from './route-lab/RouteLab';
import { recordStat, startActivityTracking } from '../lib/record-stat';
import { copy, menuItems } from './copy';
import { iconPaths } from './icons';
import './v2.css';
import './design-refresh.css';
import {keyboardWorkspaceHeight} from './keyboard-viewport';
import {HOME_CHAT_HANDOFF_KEY,HOME_CHAT_HANDOFF_PARAM,isIOSPhone,stageHomeChatHandoff,takeHomeChatHandoff} from './home-chat-handoff';
import usePositionArrivals from './usePositionArrivals';
import { PositionTrainSummary, PositionArrivalDetails } from './PositionArrivals';
import './position-arrivals.css';
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
  const [lang,setLang]=useState(initialLanguage),[view,setView]=useState('home'),[mounted,setMounted]=useState({}),[question,setQuestion]=useState(''),[chatRequest,setChatRequest]=useState(null),[chatBusy,setChatBusy]=useState(false),[routeRequest,setRouteRequest]=useState(null);
  const homeScroll=useRef(0),homeFocusScroll=useRef(0),homeSubmitPending=useRef(false),homeSubmitCancel=useRef(null),homeComposerResync=useRef(false),titleRef=useRef(null),started=useRef(false),requestSequence=useRef(0);
  const feedbackBack=useRef(null);
  const chatWorkspace=useRef(null);
  const [restoration,setRestoration]=useState(null),[detail,setDetail]=useState(false),[visits,setVisits]=useState({});
  const routeHandoffRef=useRef(false);
  useEffect(()=>{if(view==='chat')routeHandoffRef.current=false;},[view]);
  const viewRef=useRef(view);viewRef.current=view;
  const publishStep=useCallback((key,data)=>{
    const current=window.history.state||{};
    if(key==='route:form'||key==='route:result'){
      const result=key==='route:result';
      const state={...current,sagKey:key,sagData:data,sagDetail:result};
      if(current.sagKey&&current.sagKey!==key){
        state.sagV2Depth=(current.sagV2Depth||0)+1;
        window.history.pushState(state,'');
      }else window.history.replaceState(state,'');
      setDetail(result);return;
    }
    const root=key==='root';
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
  const arrivals=usePositionArrivals(view==='home'||view==='live',stationContext?.stationCode||'0154');
  const title=view==='chat'?t.chat:view==='live'?t.liveTitle:t.menu[menuItems.findIndex(x=>x.id===view)] || t.pending;
  function activate(next){if(typeof document!=='undefined')document.activeElement?.blur?.();setMounted(prev=>({...prev,[next]:true}));setView(next);}
  useEffect(()=>{
    if(started.current)return;started.current=true;
    const initial=readView();activate(initial);
    // Switching the station in the SPA is not a new site visit; StationEntry
    // records the station change with its own timestamp before remounting.
    const switchedStation=window.history.state?.sagStationSwitch===true;
    window.history.replaceState({...(window.history.state||{}),sagStationSwitch:false,sagV2:true,sagV2Depth:0},'',window.location.href);
    // An iPhone keyboard handoff is likewise the same visit.
    if(!switchedStation&&!new URLSearchParams(window.location.search).has(HOME_CHAT_HANDOFF_PARAM))
      recordStat('page_view','visit',initialLanguage,stationContext?.stationCode?'station:'+stationContext.stationCode:null);
  },[]);
  useEffect(()=>{
    // Consume the exact question once after the iPhone's full-page navigation.
    // The URL only contains a nonce; the user's text is never placed in it.
    const url=new URL(window.location.href);
    const token=url.searchParams.get(HOME_CHAT_HANDOFF_PARAM);
    if(!token)return;
    url.searchParams.delete(HOME_CHAT_HANDOFF_PARAM);
    window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
    let text=null;
    try{text=takeHomeChatHandoff(window.sessionStorage,token);}catch{}
    if(text&&readView()==='chat')setChatRequest({id:++requestSequence.current,text});
  },[]);
  useEffect(()=>{const onPop=()=>{const next=readView();activate(next);setDetail(!!window.history.state?.sagDetail);setRestoration({view:next,data:window.history.state?.sagData,serial:Date.now()+Math.random()});};window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);},[]);
  useEffect(()=>startActivityTracking(),[]);
  useEffect(()=>()=>homeSubmitCancel.current?.(),[]);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{if(view==='home')window.scrollTo(0,homeScroll.current);else{window.scrollTo(0,0);titleRef.current?.focus({preventScroll:true});}});
    return()=>cancelAnimationFrame(frame);
  },[view]);
  function navigate(next,{keepHomeScroll=false,routeQuery=null}={}){
    if(next==='route'&&routeQuery){if(routeHandoffRef.current)return;routeHandoffRef.current=true;}
    if(next===view)return;
    // A different navigation cancels a home composer submission that is
    // waiting for iOS Safari to finish dismissing the software keyboard.
    if(!keepHomeScroll)homeSubmitCancel.current?.();
    if(view==='home'&&!keepHomeScroll)homeScroll.current=window.scrollY;
    if(next!=='home'&&next!=='chat'&&next!=='feedback')setVisits(prev=>({...prev,[next]:(prev[next]||0)+1}));
    setRestoration(null);setDetail(false);
    if(next==='route')setRouteRequest(routeQuery?{id:window.crypto.randomUUID(),query:routeQuery,returnDepth:window.history.state?.sagV2Depth||0}:null);
    const item=menuItems.find(x=>x.id===next);
    if(['timetable','tour','found','facility','lost','feedback','live'].includes(next))recordStat('quick_menu',next,lang);
    if(item?.action && (mounted[next]||next==='route'))recordStat('quick_menu',item.action,lang);
    const url=new URL(window.location.href);url.searchParams.delete('place');if(next==='home')url.searchParams.delete('view');else url.searchParams.set('view',next);
    window.history.pushState({...(window.history.state||{}),sagV2:true,sagKey:null,sagData:null,sagDetail:false,sagV2Depth:(window.history.state?.sagV2Depth||0)+1},'',url.pathname+url.search+url.hash);activate(next);
  }
  function back(){if(view==='route'&&routeRequest){const steps=(window.history.state?.sagV2Depth||0)-routeRequest.returnDepth;if(steps>0){window.history.go(-steps);return;}}if((window.history.state?.sagV2Depth||0)>0)window.history.back();else navigate('home');}

  useEffect(()=>setLang(initialLanguage),[initialLanguage]);
  function changeLanguage(next){if(next!==lang){recordStat('language_change',next,next);setLang(next);const url=new URL(window.location.href);if(next==='ko')url.searchParams.delete('lang');else url.searchParams.set('lang',next);window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);onLanguageChange?.(next);}}

  function send(text,{fromHomeComposer=false}={}){
    const clean=text.trim();
    if(!clean||chatBusy||homeSubmitPending.current)return;
    if(fromHomeComposer&&isIOSPhone(window.navigator.userAgent)){
      // Unlike tabs/quick-menu entry, the home input has just opened the
      // iPhone keyboard. Repeated scroll fixes cannot reset the hit-test map
      // on affected Safari builds, but a new document can. Preserve the
      // question privately and navigate to the normal chat URL.
      const token=window.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
      try{
        stageHomeChatHandoff(window.sessionStorage,token,clean);
        const url=new URL(window.location.href);
        url.searchParams.delete('place');
        url.searchParams.set('view','chat');
        url.searchParams.set(HOME_CHAT_HANDOFF_PARAM,token);
        homeSubmitPending.current=true;
        document.activeElement?.blur?.();
        window.location.assign(url.pathname+url.search+url.hash);
        return;
      }catch{
        homeSubmitPending.current=false;
        try{window.sessionStorage.removeItem(HOME_CHAT_HANDOFF_KEY);}catch{}
        // Storage blocked: retain the existing same-document fallback.
      }
    }
    const deliver=()=>{
      homeSubmitPending.current=false;
      homeSubmitCancel.current=null;
      // This transition is unique: the home input loses focus before the
      // non-home keyboard listeners exist. Resync touch hit testing after the
      // fixed chat workspace has actually mounted (not just after blur).
      if(fromHomeComposer)homeComposerResync.current=true;
      setChatRequest({id:++requestSequence.current,text:clean});
      setQuestion('');
      navigate('chat',{keepHomeScroll:fromHomeComposer});
    };
    if(!fromHomeComposer){deliver();return;}
    // The home composer is the only entry that opens the software keyboard
    // before navigating to chat. Defer mounting the fixed chat shell until
    // Safari has restored its visual viewport after that keyboard closes.
    // Example questions and bottom-tab navigation keep their instant path.
    homeScroll.current=homeFocusScroll.current;
    const viewport=window.visualViewport;
    const keyboardOpen=viewport&&window.innerHeight-viewport.height>120;
    document.activeElement?.blur?.();
    if(!keyboardOpen){deliver();return;}
    homeSubmitPending.current=true;
    let finished=false;
    let timeout=0;
    const cleanup=()=>{
      viewport.removeEventListener('resize',check);
      viewport.removeEventListener('scroll',check);
      window.removeEventListener('resize',check);
      window.clearTimeout(timeout);
      homeSubmitCancel.current=null;
    };
    const finish=()=>{
      if(finished)return;
      finished=true;
      cleanup();
      // The keyboard may have panned the document to reveal the home input.
      // Restore the page before the fixed chat viewport is measured.
      window.scrollTo(0,0);
      requestAnimationFrame(deliver);
    };
    const check=()=>{
      const recovered=viewport.height>=window.innerHeight-70;
      const originRestored=Math.max(0,viewport.offsetTop||0)<16;
      if(recovered&&originRestored)finish();
    };
    homeSubmitCancel.current=()=>{if(finished)return;finished=true;cleanup();homeSubmitPending.current=false;};
    viewport.addEventListener('resize',check);
    viewport.addEventListener('scroll',check);
    window.addEventListener('resize',check);
    // A slow keyboard animation must not force the fixed chat UI to mount
    // while WebKit still reports a keyboard-shrunken visual viewport.
    // The post-mount touch-map resync also covers this safety fallback.
    timeout=window.setTimeout(finish,2200);
    check();
  }
  useLayoutEffect(()=>{
    if(view==='home')return;
    const shell=chatWorkspace.current;
    if(!shell)return;
    const viewport=window.visualViewport;
    let frame=0;
    const timeouts=new Set();
    // Every non-home view shares a single fixed workspace and bottom tab bar.
    // A destination field can open iOS Safari's keyboard, after which 100dvh
    // may remain temporarily shrunk and the tab hit area can drift. Restore the
    // layout viewport on blur and whenever the view changes, not only in chat
    // or the train-lost view. Only use visualViewport while a field is edited.
    const sync=()=>{
      frame=0;
      const focused=document.activeElement;
      const editing=!!focused&&shell.contains(focused)&&
        (focused.matches?.('input:not([type=checkbox]):not([type=radio]),textarea,[contenteditable="true"]')||false);
      const height=keyboardWorkspaceHeight({
        layoutHeight:Math.max(window.innerHeight,document.documentElement.clientHeight),
        visualHeight:viewport?.height,
        offsetTop:viewport?.offsetTop,
        editing,
      });
      if(height!==null)shell.style.height=height+'px';
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
    // On iPadOS, a fixed dock can visually recover while WebKit's touch hit
    // map still uses the keyboard-shrunken viewport. The root must really
    // scroll (a nonzero scroll range), then settle back to zero next frame.
    const restoreHitMap=()=>{
      const root=document.scrollingElement;
      if(!root)return;
      root.scrollTop=1;
      requestAnimationFrame(()=>{
        root.scrollTop=0;
        window.scrollTo(0,0);
      });
    };
    if(view==='chat'&&homeComposerResync.current){
      homeComposerResync.current=false;
      // The home input's focusout happens before this listener is mounted.
      // On iOS that can leave fixed buttons drawn in the right place but
      // touch-targeted at their OLD keyboard-shifted positions. Safari needs
      // a real root scroll after the fixed workspace is mounted.
      // Repeat around the final frames of its keyboard-close animation.
      for(const delay of [0,100,300,650]){
        const timer=window.setTimeout(()=>{
          timeouts.delete(timer);
          const active=document.activeElement;
          const editing=!!active&&shell.contains(active)&&
            active.matches?.('input:not([type=checkbox]):not([type=radio]),textarea,[contenteditable="true"]');
          if(!editing){
            schedule();
            restoreHitMap();
          }
        },delay);
        timeouts.add(timer);
      }
    }
    const onViewportResize=()=>{
      schedule();
      // Some iPad keyboard Done paths close without blurring the input.
      // Check the viewport one frame after resize, not the focus state.
      requestAnimationFrame(()=>{
        const layout=Math.max(window.innerHeight,document.documentElement.clientHeight);
        if(viewport?.height>=layout-72)restoreHitMap();
      });
    };
    const onFocusOut=()=>{
      schedule();
      // The viewport may finish resizing after blur. Restore repeatedly
      // through Safari's keyboard animation, only when no field is editing.
      for(const delay of [80,250,550]){
        const timer=window.setTimeout(()=>{
          timeouts.delete(timer);
          schedule();
          const active=document.activeElement;
          const editing=!!active&&shell.contains(active)&&
            active.matches?.('input:not([type=checkbox]):not([type=radio]),textarea,[contenteditable="true"]');
          if(!editing)restoreHitMap();
        },delay);
        timeouts.add(timer);
      }
    };
    viewport?.addEventListener('resize',onViewportResize);
    viewport?.addEventListener('scroll',schedule);
    window.addEventListener('resize',schedule);
    document.addEventListener('focusin',schedule);
    document.addEventListener('focusout',onFocusOut);
    sync();
    return()=>{
      cancelAnimationFrame(frame);
      for(const timer of timeouts)window.clearTimeout(timer);
      viewport?.removeEventListener('resize',onViewportResize);
      viewport?.removeEventListener('scroll',schedule);
      window.removeEventListener('resize',schedule);
      document.removeEventListener('focusin',schedule);
      document.removeEventListener('focusout',onFocusOut);
      shell.style.removeProperty('height');
    };
  },[view]);
  function bottomTabs(){const n=navigationCopy[lang];return <nav className="v2-bottom-tabs" aria-label={n.guide}>
    {[['home','home',n.guide],['chat','spark',n.ai]].map(([id,icon,label])=><button key={id} aria-current={view===id?'page':undefined} onClick={()=>navigate(id)}><Icon name={icon}/><span>{label}</span></button>)}
    <div className="v2-bottom-languages" role="group" aria-label={t.language}>
      {languages.map(([code,label])=><button key={code} aria-pressed={lang===code} lang={code==='zh'?'zh-CN':code} onClick={()=>changeLanguage(code)}>{label}</button>)}
    </div>
  </nav>;}
  return <main className={"v2-app v2-design-refresh"+(view==='chat'?' v2-chat-active':'')+(view==='lost'?' v2-keyboard-active':'')+(view!=='home'?' v2-workspace-active':'')} lang={lang==='zh'?'zh-CN':lang}>
    <div className="v2-home" hidden={view!=='home'}>
      <PositionTrainSummary stationContext={stationContext} state={arrivals} lang={lang} t={t} onDetails={()=>navigate('live')}/>

      <section className="v2-ai">
        <div className="v2-ai-top"><span className="v2-eyebrow"><i aria-hidden="true"/><span className="v2-eyebrow-text">YOUR AI STATION GUIDE</span></span><div className="v2-ai-station-tools">{stationTools||<strong>{t.station}</strong>}</div></div>
        <h1>{t.title}</h1><p>{t.description}</p>
        <form className="v2-ask" onSubmit={e=>{e.preventDefault();send(question,{fromHomeComposer:true});}}><input aria-label={t.placeholder} placeholder={t.placeholder} value={question} onFocus={()=>{homeFocusScroll.current=window.scrollY;}} onChange={e=>setQuestion(e.target.value)} maxLength={500} required disabled={chatBusy}/><button aria-label={t.send} disabled={chatBusy}><Icon name="arrow"/></button></form>
        <div className="v2-ai-footer"><div className="v2-examples">{t.examples.map(q=><button key={q} disabled={chatBusy} onClick={()=>send(q)}>{q}</button>)}</div></div>{chatBusy&&<span className="v2-waiting" role="status">{t.waiting}</span>}
      </section>
      <div className="v2-section-title"><h2>{t.quick}</h2><span>{t.quickSub}</span></div>
      <nav className="v2-grid" aria-label={t.quick}>{menuItems.map((item,index)=><button key={item.id} onClick={()=>navigate(item.id)}><span className={'v2-icon v2-icon-'+item.id}><Icon name={item.icon}/>{item.id==='feedback'&&feedbackCount>0&&<span className="sf-badge" aria-label={feedbackCopy[lang].badge+': '+feedbackCount}>{feedbackCount}</span>}</span><strong>{t.menu[index]}</strong>{!item.action&&!['timetable','tour','found','facility','lost','feedback'].includes(item.id)&&<small>{t.pending}</small>}</button>)}</nav>
      <button className="v2-discover" onClick={()=>navigate('tour')}><span className="v2-market" aria-hidden="true"><svg viewBox="0 0 80 80"><circle cx="64" cy="16" r="7" fill="#dce8c2"/><rect x="15" y="35" width="49" height="33" rx="2" fill="#f3f7f0"/><path d="m17 21-8 19h60l-8-19Z" fill="#65947b"/><path d="M23 51h12v10H23Z" fill="#d4e3d7"/><path d="M45 49h11v19H45Z" fill="#abc8b4"/></svg></span><span><small>{t.outside}</small><strong>{t.discover}</strong><span>{t.discoverSub}</span></span><b>↗</b></button>
      {bottomTabs()}
    </div>
    <div className={"v2-workspace "+(view==='chat'?'v2-chat-workspace ':'')+(view!=='home'?'v2-keyboard-workspace':'')} ref={chatWorkspace} hidden={view==='home'}>
      <header className="v2-view-header"><button className="v2-back-button" onClick={back} aria-label={t.back}><Icon name="back"/></button><h1 ref={titleRef} tabIndex={-1}>{title}</h1>{view==='chat'&&<p className="v2-chat-privacy" title={t.privacy} aria-label={t.privacy}>{chatWarning[lang].map((line,i)=><span key={i}>{line}</span>)}</p>}<button className="v2-home-button" onClick={()=>navigate('home')} aria-label={t.home} title={t.home}><Icon name="house"/></button></header>
      {['chat',...menuItems.filter(x=>x.action&&x.id!=='route').map(x=>x.id)].map(id=>mounted[id]&&<section className={'v2-pane '+(id==='chat'?'v2-chat-pane':'v2-guide-pane')} hidden={view!==id} key={id} aria-label={id==='chat'?t.chat:t.menu[menuItems.findIndex(x=>x.id===id)]}><GuideExperience embedded showPrivacyNotice={id!=='chat'} chatStation={stationContext} onRecommendMenu={id==='chat'?navigate:null} routeStation={id==='route'?stationContext:null} resetToken={visits[id]||0} navigationSnapshot={restoration?.view===id?restoration:null} onNavigationStep={id===view&&id!=='chat'?publishStep:null} initialAction={menuItems.find(x=>x.id===id)?.action||null} language={lang} active={view===id} chatRequest={id==='chat'?chatRequest:null} onBusyChange={id==='chat'?setChatBusy:null}/></section>)}
      {mounted.route&&<div className="v2-feature-pane v2-route-pane" hidden={view!=='route'}><UnifiedRouteLab routeRequest={routeRequest} key={(visits.route||0)+'-'+(stationContext?.stationCode||'0154')} embedded stationContext={stationContext} language={lang} active={view==='route'} onNavigationStep={view==='route'?publishStep:null} navigationSnapshot={restoration?.view==='route'?restoration:null}/></div>}
       {mounted.tour&&<NearbyTour key={(visits.tour||0)+'-'+(tourStation.stationCode||tourStation.id)} station={tourStation} lang={lang} active={view==='tour'}/>}
      {mounted.timetable&&<div className="v2-feature-pane" hidden={view!=='timetable'}><TrainTimetable key={visits.timetable||0} lang={lang} active={view==='timetable'} stationContext={stationContext}/></div>}
      {mounted.found&&foundStation&&<div className="v2-feature-pane" hidden={view!=='found'}><CompactLostFound key={(visits.found||0)+'-'+foundStation.id} embedded station={foundStation} lang={lang} active={view==='found'} onNavigationStep={view==='found'?publishStep:null} navigationSnapshot={restoration?.view==='found'?restoration:null}/></div>}
      {mounted.facility&&<div className="v2-feature-pane" hidden={view!=='facility'}><FacilityDemo key={visits.facility||0} embedded stationContext={stationContext} lang={lang} active={view==='facility'}/></div>}
      {mounted.lost&&<div className="v2-feature-pane" hidden={view!=='lost'}><TrainLostFinder key={(visits.lost||0)+'-'+(stationContext?.stationCode||'0154')} lang={lang} active={view==='lost'} defaultStation={stationContext?.names.ko||CURRENT_STATION.name} defaultLine={stationContext?.line||String(Number(CURRENT_STATION.lineId)-1000)} defaultNames={stationContext?.names}/></div>}
      {mounted.feedback&&<StationFeedback key={feedbackStation.id} navigationSnapshot={restoration?.view==='feedback'?restoration:null} onNavigationStep={view==='feedback'?publishStep:null} station={feedbackStation} lang={lang} active={view==='feedback'} onInternalScreen={onFeedbackScreen}/>}
      {view==='live'&&<PositionArrivalDetails stationContext={stationContext} state={arrivals} lang={lang} t={t}/>}

      {!['home','chat','live','tour','timetable','found','facility','lost','feedback',...menuItems.filter(x=>x.action).map(x=>x.id)].includes(view)&&<section className="v2-pending"><span className="v2-pending-icon"><Icon name={menuItems.find(x=>x.id===view)?.icon||'train'}/></span><small>{t.pending}</small><h2>{title}</h2><p>{view==='live'?t.trainHelp:t.pendingText}</p><button onClick={()=>navigate('home')}>{t.home}</button></section>}
      {bottomTabs()}
    </div>
  </main>;
}
