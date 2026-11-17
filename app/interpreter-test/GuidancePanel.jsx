'use client';
import {useState} from 'react';
import RouteLab from '../v2/route-lab/RouteLab';
import SharedRouteView from '../v2/route-lab/SharedRouteView';
import {getStationByCode} from '../lib/station-master';
import {copy,menuItems} from '../v2/copy';
import {guidanceWords,menuLabel} from './guidance-copy';
export default function GuidancePanel({panel,room,token,lang,onClose,onSend}){
 const [choice,setChoice]=useState('menu'),[busy,setBusy]=useState(false),[error,setError]=useState('');const t=guidanceWords[lang];
 async function send(type,payload){setBusy(true);setError('');try{await onSend(type,payload);onClose();}catch{setError({ko:'전달하지 못했습니다. 다시 시도해 주세요.',en:'Unable to send. Please retry.',ja:'送信できませんでした。再試行してください。',zh:'发送失败，请重试。'}[lang]);}finally{setBusy(false);}}
 return <section className="it-guidance-panel" role="dialog" aria-modal="true" aria-label={t.choose}><header><button onClick={onClose}>{t.back}</button><strong>{t.choose}</strong></header><div className="it-guidance-body">
 {panel.type==='share'?<SharedRouteView id={panel.shareId} initialLanguage={lang}/>:panel.type==='menu'?<iframe title={menuLabel(panel.menu,lang)} src={'/?station='+room.stationCode+'&view='+panel.menu+'&lang='+lang}/>:choice==='search'?<RouteLab embedded language={lang} stationContext={getStationByCode(room.stationCode)} deliveryContext={{room:room.id,token,onDeliver:id=>send('route_result',{shareId:id})}}/>:<div className="it-guidance-options">{[...menuItems,{id:'live'}].map(m=><button disabled={busy} key={m.id} onClick={()=>m.id==='route'?setChoice('route'):send('menu',{menu:m.id})}>{menuLabel(m.id,lang)}</button>)}{choice==='route'&&<><button disabled={busy} onClick={()=>send('menu',{menu:'route'})}>{t.menu}</button><button onClick={()=>setChoice('search')}>{t.proxy}</button></>}</div>}
 {error&&<p role="alert">{error}</p>}</div></section>;
}
