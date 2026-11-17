'use client';
import {useEffect,useState} from 'react';
import RouteResult from './RouteResult';
import {shareCopy} from './RouteShareButton';
import {sanitizePassengerText} from '../../lib/route-place-policy';
import './route-lab.css';
const words={ko:{loading:'안내를 번역하고 있습니다…',fail:'번역을 불러오지 못했습니다.',retry:'다시 시도',original:'원문 보기',source:'원문 안내'},en:{loading:'Translating guidance…',fail:'Translation unavailable.',retry:'Retry',original:'Show original',source:'Original guidance'},ja:{loading:'案内を翻訳しています…',fail:'翻訳を取得できませんでした。',retry:'再試行',original:'原文を見る',source:'原文の案内'},zh:{loading:'正在翻译指南…',fail:'暂时无法获取翻译。',retry:'重试',original:'查看原文',source:'原文指南'}};
export default function SharedRouteView({id,initialLanguage=null,inConversation=false}){
 const [language,setLanguage]=useState(initialLanguage||'en'),[data,setData]=useState(null),[error,setError]=useState(false),[fields,setFields]=useState(null),[state,setState]=useState('loading'),[original,setOriginal]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{if(initialLanguage)return;const u=new URL(window.location.href),raw=u.searchParams.get('lang')||navigator.language?.split('-')[0];setLanguage(['ko','en','ja','zh'].includes(raw)?raw:'en');},[initialLanguage]);
 useEffect(()=>{let alive=true;setData(null);setError(false);fetch('/api/route-shares?id='+encodeURIComponent(id),{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();const d=await r.json();if(alive)setData(d);}).catch(()=>{if(alive)setError(true);});return()=>{alive=false;};},[id]);
 useEffect(()=>{if(!data)return;let alive=true,timer;setFields(null);setOriginal(false);const s=data.snapshot;
 if(!s.place||s.language===language){setFields(s.place);setState('ready');return;}
 setState('loading');const deadline=Date.now()+150000;
 async function load(){try{const r=await fetch('/api/route-shares/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,language})});const result=await r.json();if(!alive)return;if(r.status===202&&Date.now()<deadline){timer=setTimeout(load,3000);return;}if(!r.ok||result.pending)throw Error();setFields(result.fields);setState('ready');}catch{if(alive)setState('failed');}}
 void load();return()=>{alive=false;clearTimeout(timer);};
 },[data,id,language,retry]);
 const s=data?.snapshot,t=shareCopy[language],w=words[language];
 let place=null;if(s?.place&&(state==='ready'||original)){const p=original?s.place:{...s.place,...fields};place={...p,mapQuery:s.place.mapQuery||s.place.place,answer:sanitizePassengerText(p.answer,original?s.language:language),walk:sanitizePassengerText(p.walk,original?s.language:language)};}
 return <section className={'route-lab rl-shared'+(inConversation?' rl-shared-conversation':'')} lang={language==='zh'?'zh-CN':language}><div className="rl-shell">
  <header className="rl-top rl-shared-top">
   <div className="rl-shared-heading"><h1>{t.saved}</h1><select aria-label="Language" value={language} onChange={e=>setLanguage(e.target.value)}>{[['ko','한국어'],['en','English'],['ja','日本語'],['zh','中文']].map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></div>
   {s&&<p className="rl-shared-time">{new Date(s.searchedAt).toLocaleString(language,{timeZone:'Asia/Seoul'})} · KST</p>}
   {s&&!inConversation&&<div className="rl-shared-links"><a href={'/?station='+s.originCode+'&lang='+language}>{t.home}</a><a href={'/route-share/'+id+'?lang='+language} target="_blank" rel="noopener noreferrer">{t.share} ↗</a></div>}
  </header>
  {error?<p className="rl-shared-empty" role="alert">{t.expired}</p>:!s?<p className="rl-shared-empty" role="status"><span className="rl-translation-spinner" aria-hidden="true"/>…</p>:<>
   {state!=='ready'&&s.place&&!original&&<div className={'rl-shared-status'+(state==='failed'?' rl-shared-failed':'')} role="status">{state==='loading'?<><span className="rl-translation-spinner" aria-hidden="true"/>{w.loading}</>:<><span>{w.fail}</span><div className="rl-shared-status-actions"><button type="button" onClick={()=>setRetry(x=>x+1)}>{w.retry}</button><button type="button" onClick={()=>setOriginal(true)}>{w.original}</button></div></>}</div>}
   {original&&<div className="rl-shared-status"><span>{w.source}</span><button type="button" onClick={()=>setRetry(x=>x+1)}>{w.retry}</button></div>}
   <RouteResult route={s.route} place={place} lang={language}/>
  </>}
 </div></section>;
}
