'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import QRCode from 'qrcode';
import {recordStat} from '../../lib/record-stat';
import {useStaffTools} from '../StaffTools';
import {lineColor} from './RouteResult';
import '../staff-tools.css';
export const shareCopy={ko:{share:'검색 결과 공유',title:'AI 길찾기 결과 공유',copy:'링크 복사',close:'닫기',note:'QR을 스캔하면 저장된 검색 결과가 열립니다.',saved:'저장된 검색 결과',home:'메인으로',expired:'공유 결과가 만료되었거나 존재하지 않습니다.'},en:{share:'Share route result',title:'Share AI Route Finder result',copy:'Copy link',close:'Close',note:'Scan to open the saved route result.',saved:'Saved route result',home:'Home',expired:'This shared result has expired or is unavailable.'},ja:{share:'検索結果を共有',title:'AI 経路検索結果の共有',copy:'リンクをコピー',close:'閉じる',note:'QRを読み取ると保存された検索結果が開きます。',saved:'保存された検索結果',home:'ホームへ',expired:'共有結果の有効期限が切れたか、見つかりません。'},zh:{share:'分享查询结果',title:'分享 AI 路线查询结果',copy:'复制链接',close:'关闭',note:'扫描二维码查看已保存的查询结果。',saved:'已保存的查询结果',home:'首页',expired:'分享结果已过期或不存在。'}};
function QrStationBadge({line}){
 const match=String(line||'').match(/^0?([1-9])(?:호선)?$/);
 if(!match)return null;
 return <span className="sag-qr-line" style={{backgroundColor:lineColor(match[1]+'호선')}} aria-label={match[1]+'호선'}>{match[1]}</span>;
}
export default function RouteShareButton({routeProof,placeProof,language,originName,originLine,destination,destinationLine,deliveryContext=null,displayLanguage=language}){
 const access=useStaffTools(),t=shareCopy[displayLanguage];const deliveryLabel={ko:'승객에게 전달',en:'Send to passenger',ja:'乗客に送信',zh:'发送给乘客'}[displayLanguage];const shortLabel={ko:'결과 공유',en:'Share',ja:'結果共有',zh:'分享结果'}[displayLanguage]||t.share;const [record,setRecord]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[qr,setQr]=useState(''),[copied,setCopied]=useState(false);const dialog=useRef(null),button=useRef(null);
 useEffect(()=>{setRecord(null);setError('');},[routeProof,placeProof,language]);
 useEffect(()=>{if(record)dialog.current?.showModal();},[record]);
 async function share(){if(!deliveryContext)void recordStat('ui_action','route_qr_open',displayLanguage);setBusy(true);setError('');setCopied(false);try{const r=await fetch('/api/route-shares',{method:'POST',headers:{'Content-Type':'application/json',...(deliveryContext?{'x-interpreter-room':deliveryContext.room,Authorization:'Bearer '+deliveryContext.token}:{})},body:JSON.stringify({routeProof,placeProof,language})});const data=await r.json();if(!r.ok)throw Error(data.error);if(deliveryContext){await deliveryContext.onDeliver(data.id);return;}setQr(await QRCode.toDataURL(data.url,{width:300,margin:4}));setRecord(data);}catch{setError(({ko:'공유하지 못했습니다. 다시 검색한 뒤 시도해 주세요.',en:'Unable to share. Search again and retry.',ja:'共有できませんでした。再検索してお試しください。',zh:'无法分享，请重新查询后重试。'})[displayLanguage]);}finally{setBusy(false);}}
 function close(){setRecord(null);button.current?.focus();}
 if(!access.routeShare&&!deliveryContext)return null;
 return <div className={'rl-share'+(deliveryContext?' rl-deliver':'')}><button ref={button} type="button" onClick={share} disabled={busy} aria-label={deliveryContext?deliveryLabel:t.share} title={deliveryContext?deliveryLabel:t.share}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={deliveryContext?"m3 3 18 9-18 9 4-9-4-9Zm4 9h14":"M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 13h2v4M13 19v2h4M19 19h2v2h-2M13 11v4"}/></svg><span>{busy?'…':deliveryContext?deliveryLabel:shortLabel}</span></button>{error&&<p role="alert">{error}</p>}{record&&createPortal(<dialog className="sag-qr-dialog" ref={dialog} aria-label={t.title} onCancel={close}><button className="sag-qr-close" onClick={close} aria-label={t.close}>×</button><h2>{t.title}</h2><p className="sag-qr-context"><span className="sag-qr-station-group"><QrStationBadge line={originLine}/><span className="sag-qr-station-name">{originName}</span></span><span className="sag-qr-route-arrow" aria-hidden="true">→</span><span className="sag-qr-station-group"><QrStationBadge line={destinationLine}/><span className="sag-qr-station-name">{destination}</span></span></p><img src={qr} width="280" height="280" alt={t.title}/><p>{t.note}</p><button onClick={async()=>{try{await navigator.clipboard.writeText(record.url);setCopied(true);}catch{setError(record.url);}}}>{copied?'✓':t.copy}</button></dialog>,document.body)}</div>;
}
