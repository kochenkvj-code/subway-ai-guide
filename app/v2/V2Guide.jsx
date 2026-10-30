'use client';
import { useEffect, useRef, useState } from 'react';
import GuideExperience from '../components/GuideExperience';
import { recordStat, startActivityTracking } from '../lib/record-stat';
import { copy, menuItems } from './copy';
import { iconPaths } from './icons';
import './v2.css';
function Icon({name}) { return <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{__html:iconPaths[name] || iconPaths.train}}/>; }
const languages=[['ko','한국어'],['en','English'],['ja','日本語'],['zh','中文']];
const views=new Set(['home','chat',...menuItems.map(x=>x.id)]);
function readView(){const v=new URLSearchParams(window.location.search).get('view');return views.has(v)?v:'home';}
export default function V2Guide() {
  const [lang,setLang]=useState('ko'),[view,setView]=useState('home'),[mounted,setMounted]=useState({}),[question,setQuestion]=useState(''),[chatRequest,setChatRequest]=useState(null),[chatBusy,setChatBusy]=useState(false);
  const homeScroll=useRef(0),titleRef=useRef(null),started=useRef(false),requestSequence=useRef(0);
  const t=copy[lang];
  const title=view==='chat'?t.chat:t.menu[menuItems.findIndex(x=>x.id===view)] || t.pending;
  function activate(next){setMounted(prev=>({...prev,[next]:true}));setView(next);}
  useEffect(()=>{
    if(started.current)return;started.current=true;
    const initial=readView();activate(initial);window.history.replaceState({...(window.history.state||{}),sagV2:true,sagV2Depth:0},'',window.location.href);
    recordStat('page_view','visit','ko');
  },[]);
  useEffect(()=>{const onPop=()=>activate(readView());window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);},[]);
  useEffect(()=>startActivityTracking(),[]);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{if(view==='home')window.scrollTo(0,homeScroll.current);else{window.scrollTo(0,0);titleRef.current?.focus({preventScroll:true});}});
    return()=>cancelAnimationFrame(frame);
  },[view]);
  function navigate(next){
    if(next===view)return;
    if(view==='home')homeScroll.current=window.scrollY;
    const item=menuItems.find(x=>x.id===next);
    if(item?.action && mounted[next])recordStat('quick_menu',item.action,lang);
    const url=new URL(window.location.href);if(next==='home')url.searchParams.delete('view');else url.searchParams.set('view',next);
    window.history.pushState({...(window.history.state||{}),sagV2:true,sagV2Depth:(window.history.state?.sagV2Depth||0)+1},'',url.pathname+url.search+url.hash);activate(next);
  }
  function back(){if((window.history.state?.sagV2Depth||0)>0)window.history.back();else navigate('home');}

  function changeLanguage(next){if(next!==lang){recordStat('language_change',next,next);setLang(next);}}

  function send(text){const clean=text.trim();if(!clean||chatBusy)return;setChatRequest({id:++requestSequence.current,text:clean});setQuestion('');navigate('chat');}
  function Language(){return <label className="v2-language"><Icon name="globe"/><select aria-label={t.language} value={lang} onChange={e=>changeLanguage(e.target.value)}>{languages.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>;}
  return <main className="v2-app" lang={lang==='zh'?'zh-CN':lang}>
    <div className="v2-home" hidden={view!=='home'}>
      <section className="v2-trains" aria-label={t.next}>
        <div className="v2-train-head"><div><span className="v2-line">1</span><strong>{t.station}</strong><span className="v2-separator">·</span><span>{t.next}</span></div><button onClick={()=>navigate('live')}>{t.detail} ↗</button></div>
        <div className="v2-directions">{t.direction.map(direction=><div key={direction}><span>{direction}</span><b>—</b></div>)}</div><p>{t.trainNote}</p>
      </section>
      <section className="v2-ai">
        <div className="v2-ai-top"><span className="v2-eyebrow"><i/>YOUR AI STATION GUIDE</span><Language/></div>
        <h1>{t.title}</h1><p>{t.description}</p>
        <form className="v2-ask" onSubmit={e=>{e.preventDefault();send(question);}}><input aria-label={t.placeholder} placeholder={t.placeholder} value={question} onChange={e=>setQuestion(e.target.value)} maxLength={500} required disabled={chatBusy}/><button aria-label={t.send} disabled={chatBusy}><Icon name="arrow"/></button></form>
        <div className="v2-examples">{t.examples.map(q=><button key={q} disabled={chatBusy} onClick={()=>send(q)}>{q}</button>)}{mounted.chat&&<button onClick={()=>navigate('chat')}>{t.chat} ↗</button>}</div>{chatBusy&&<span className="v2-waiting" role="status">{t.waiting}</span>}
      </section>
      <div className="v2-section-title"><h2>{t.quick}</h2><span>{t.quickSub}</span></div>
      <nav className="v2-grid" aria-label={t.quick}>{menuItems.map((item,index)=><button key={item.id} onClick={()=>navigate(item.id)}><span className={'v2-icon v2-icon-'+item.id}><Icon name={item.icon}/></span><strong>{t.menu[index]}</strong>{!item.action&&<small>{t.pending}</small>}</button>)}</nav>
      <button className="v2-discover" onClick={()=>navigate('tour')}><span className="v2-market" aria-hidden="true"><svg viewBox="0 0 80 80"><circle cx="64" cy="16" r="7" fill="#dce8c2"/><rect x="15" y="35" width="49" height="33" rx="2" fill="#f3f7f0"/><path d="m17 21-8 19h60l-8-19Z" fill="#65947b"/><path d="M23 51h12v10H23Z" fill="#d4e3d7"/><path d="M45 49h11v19H45Z" fill="#abc8b4"/></svg></span><span><small>{t.outside}</small><strong>{t.discover}</strong><span>{t.discoverSub}</span></span><b>↗</b></button>
      <footer className="v2-footer"><span>{t.footer}</span><span>SUBWAY AI GUIDE</span></footer><p className="v2-notice">{t.notice}</p>
    </div>
    <div className="v2-workspace" hidden={view==='home'}>
      <header className="v2-view-header"><button onClick={back} aria-label={t.back}>←</button><h1 ref={titleRef} tabIndex={-1}>{title}</h1><button onClick={()=>navigate('home')}>{t.home}</button><Language/></header>
      {['chat',...menuItems.filter(x=>x.action).map(x=>x.id)].map(id=>mounted[id]&&<section className={'v2-pane '+(id==='chat'?'v2-chat-pane':'v2-guide-pane')} hidden={view!==id} key={id} aria-label={id==='chat'?t.chat:t.menu[menuItems.findIndex(x=>x.id===id)]}><GuideExperience embedded initialAction={menuItems.find(x=>x.id===id)?.action||null} language={lang} active={view===id} chatRequest={id==='chat'?chatRequest:null} onBusyChange={id==='chat'?setChatBusy:null}/></section>)}
      {!['home','chat',...menuItems.filter(x=>x.action).map(x=>x.id)].includes(view)&&<section className="v2-pending"><span className="v2-pending-icon"><Icon name={menuItems.find(x=>x.id===view)?.icon||'train'}/></span><small>{t.pending}</small><h2>{title}</h2><p>{view==='live'?t.trainHelp:t.pendingText}</p><button onClick={()=>navigate('home')}>{t.home}</button></section>}
    </div>
  </main>;
}
