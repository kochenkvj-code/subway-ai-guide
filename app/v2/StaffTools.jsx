'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import QRCode from 'qrcode';
import './staff-tools.css';
const words={
 ko:{qr:'접속 QR',title:'내 휴대폰에서 안내받기',scan:'QR을 스캔하면 이 역의 안내가 열립니다.',install:'설치 없이 이용할 수 있습니다.',copy:'링크 복사',copied:'복사했어요',close:'닫기',interpreter:'통역 시작'},
 en:{qr:'Access QR',title:'Continue on your phone',scan:'Scan to open this station’s guide.',install:'No app installation required.',copy:'Copy link',copied:'Copied',close:'Close',interpreter:'Interpreter'},
 ja:{qr:'案内QR',title:'自分のスマートフォンで案内を見る',scan:'QRを読み取ると、この駅の案内が開きます。',install:'アプリのインストールは不要です。',copy:'リンクをコピー',copied:'コピーしました',close:'閉じる',interpreter:'通訳を開始'},
 zh:{qr:'访问二维码',title:'在自己的手机上查看指南',scan:'扫描二维码即可打开本站指南。',install:'无需安装应用。',copy:'复制链接',copied:'已复制',close:'关闭',interpreter:'开始口译'}
};
export function useStaffTools(){
 const [access,setAccess]=useState({qr:false,interpreter:false});
 useEffect(()=>{
  let alive=true;
  async function load(){
   // Existing /api/stats-only sessions exchange for a separate, purpose-bound staff cookie.
   try{await fetch('/api/stats/auth',{cache:'no-store'});const r=await fetch('/api/interpreter-access',{cache:'no-store'});if(r.ok&&alive)setAccess(await r.json());}catch{}
  }
  void load();window.addEventListener('focus',load);
  return()=>{alive=false;window.removeEventListener('focus',load);};
 },[]);
 return access;
}
export function InterpreterButton({stationCode,lang}){
 const t=words[lang]||words.en;
 return <a className="v2-interpreter-entry" href={'/interpreter-test?station='+encodeURIComponent(stationCode)} title={t.interpreter} aria-label={t.interpreter}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 6 6m-7 0 6-6 2-3H3m5-3v3M13 21l5-11 5 11m-8-4h6"/></svg></a>;
}
export function AccessQR({stationCode,stationName,view,menuName,basePath,lang}){
 const [open,setOpen]=useState(false),[qr,setQr]=useState(''),[link,setLink]=useState(''),[copied,setCopied]=useState(false),[error,setError]=useState('');
 const dialog=useRef(null),trigger=useRef(null);const t=words[lang]||words.en;
 useEffect(()=>{
  if(!open)return;let alive=true;
  const url=new URL(basePath==='/'?'/':'/v2',window.location.origin);
  url.searchParams.set('station',stationCode);if(view!=='home')url.searchParams.set('view',view);
  setQr('');setCopied(false);setError('');setLink(url.href);
  QRCode.toDataURL(url.href,{width:300,margin:4,errorCorrectionLevel:'M'}).then(x=>{if(alive)setQr(x);}).catch(()=>{if(alive)setError('QR unavailable');});
  dialog.current?.showModal();
  return()=>{alive=false;};
 },[open,stationCode,view,basePath]);
 function close(){setOpen(false);trigger.current?.focus();}
 return <>
  <button ref={trigger} type="button" className="v2-access-qr" onClick={()=>setOpen(true)} aria-label={t.qr} title={t.qr}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 13h2v4M13 19v2h4M19 19h2v2h-2M13 11v4M5 11v2M11 3v4"/></svg></button>
  {open&&createPortal(<dialog ref={dialog} className="sag-qr-dialog" aria-labelledby="sag-qr-title" onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close();}}>
   <button type="button" className="sag-qr-close" aria-label={t.close} onClick={close}>×</button>
   <h2 id="sag-qr-title">{t.title}</h2><p>{stationName} · {menuName}</p>
   {qr?<img src={qr} width="280" height="280" alt={t.qr}/>:<p role="status">{error||'QR…'}</p>}
   <p>{t.scan}<br/>{t.install}</p><p lang="en" className="sag-qr-english">Scan for station guidance · No app needed</p>
   <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(link);setCopied(true);}catch{setError(t.copy+' — '+link);}}}>{copied?t.copied:t.copy}</button>
   {error&&<p role="status">{error}</p>}
  </dialog>,document.body)}
 </>;
}
