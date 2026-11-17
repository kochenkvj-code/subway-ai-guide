'use client';
import {useEffect,useRef,useState} from 'react';
import RouteLab from '../v2/route-lab/RouteLab';
import SharedRouteView from '../v2/route-lab/SharedRouteView';
import {getStationByCode} from '../lib/station-master';
import {menuItems} from '../v2/copy';
import {guidanceWords,guidanceUI,menuLabel} from './guidance-copy';
import GuidanceIcon from './GuidanceIcon';

const ordered=['route','gate','fares','live','timetable','facility','found','lost','tour','feedback'];
const menus=ordered.filter(id=>id==='live'||menuItems.some(m=>m.id===id));
export default function GuidancePanel({panel,room,token,lang,onClose,onSend}){
 const [choice,setChoice]=useState('menu'),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const t=guidanceWords[lang],u=guidanceUI[lang],closeRef=useRef(null);
 const sheet=panel.type==='choose'&&choice!=='search';
 const station=room&&getStationByCode(room.stationCode);
 const stationName=station?.names?.[lang]||station?.names?.ko;
 const title=panel.type==='share'?t.result:panel.type==='menu'?menuLabel(panel.menu,lang):choice==='search'?u.searchTitle:choice==='route'?u.routeTitle:choice==='confirm'?menuLabel(selected,lang):t.choose;
 useEffect(()=>{closeRef.current?.focus({preventScroll:true});},[panel.type,choice]);
 useEffect(()=>{const key=e=>{if(e.key==='Escape'&&!busy){e.preventDefault();onClose();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[busy,onClose]);
 async function send(type,payload){setBusy(true);setError('');try{await onSend(type,payload);onClose();}catch(e){setError({ko:'전달하지 못했습니다. 다시 시도해 주세요.',en:'Unable to send. Please retry.',ja:'送信できませんでした。再試行してください。',zh:'发送失败，请重试。'}[lang]);if(type==='route_result')throw e;}finally{setBusy(false);}}
 function choose(id){setError('');setSelected(id);setChoice(id==='route'?'route':'confirm');}
 return <section className={'it-guidance-panel '+(sheet?'it-guidance-sheet':'it-guidance-full')} role="dialog" aria-modal="true" aria-label={title}>
  {sheet&&<button className="it-guidance-scrim" tabIndex={-1} aria-hidden="true" onClick={busy?undefined:onClose}/>}
  <div className="it-guidance-surface">
   {sheet&&<div className="it-guidance-handle" aria-hidden="true"/>}
   <header className="it-guidance-header">
    {sheet&&choice!=='menu'&&<button type="button" className="it-guidance-back" aria-label={t.back} disabled={busy} onClick={()=>{setError('');setChoice('menu');}}><GuidanceIcon name="back"/></button>}
    {!sheet&&<button ref={closeRef} type="button" className="it-guidance-back" aria-label={u.close} title={t.back} disabled={busy} onClick={onClose}><GuidanceIcon name="back"/></button>}
    <div className="it-guidance-heading"><strong>{title}</strong>{!sheet&&stationName&&<small>{stationName}</small>}</div>
    {sheet?<button ref={closeRef} type="button" className="it-guidance-close" aria-label={u.close} disabled={busy} onClick={onClose}><GuidanceIcon name="close"/></button>:<button type="button" className="it-guidance-return" disabled={busy} onClick={onClose}>{t.back}</button>}
   </header>
   {sheet?<div className="it-guidance-body it-guidance-sheet-body">
     {choice==='menu'&&<div className="it-guidance-options">{menus.map(id=><button type="button" disabled={busy} key={id} onClick={()=>choose(id)}><span className="it-guidance-icon"><GuidanceIcon name={id}/></span><strong>{menuLabel(id,lang)}</strong></button>)}</div>}
     {choice==='route'&&<div className="it-guidance-route-options">
      <button type="button" disabled={busy} onClick={()=>{setSelected('route');setChoice('confirm');}}><span className="it-guidance-icon"><GuidanceIcon name="route"/></span><span><strong>{t.menu}</strong><small>{u.menuHint}</small></span><GuidanceIcon name="arrow"/></button>
      <button type="button" disabled={busy} onClick={()=>setChoice('search')}><span className="it-guidance-icon"><GuidanceIcon name="lost"/></span><span><strong>{t.proxy}</strong><small>{u.proxyHint}</small></span><GuidanceIcon name="arrow"/></button>
     </div>}
     {choice==='confirm'&&<div className="it-guidance-confirm"><div className="it-guidance-confirm-info"><span className="it-guidance-icon"><GuidanceIcon name={selected}/></span><span><strong>{menuLabel(selected,lang)}</strong>{stationName&&<small>{stationName}</small>}</span></div><p>{u.confirm}</p><button className="it-guidance-send" type="button" disabled={busy} onClick={()=>send('menu',{menu:selected})}><GuidanceIcon name="send"/>{busy?u.sending:u.sendNow}</button></div>}
     {error&&<p className="it-guidance-error" role="alert">{error}</p>}
    </div>:<div className="it-guidance-body">
     {panel.type==='share'?<SharedRouteView id={panel.shareId} initialLanguage={lang} inConversation/>:panel.type==='menu'?<iframe title={menuLabel(panel.menu,lang)} src={'/?station='+room.stationCode+'&view='+panel.menu+'&lang='+lang}/>:<RouteLab embedded language={lang} stationContext={getStationByCode(room.stationCode)} deliveryContext={{room:room.id,token,onDeliver:id=>send('route_result',{shareId:id})}}/>}
     {error&&<p className="it-guidance-error" role="alert">{error}</p>}
    </div>}
  </div>
 </section>;
}
