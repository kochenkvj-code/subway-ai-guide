'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import QRCode from 'qrcode';
import {recordStat} from '../lib/record-stat';
import {getStationByCode} from '../lib/station-master';
import './staff-tools.css';
const words={
 ko:{qr:'접속 QR',title:'내 휴대폰에서 안내받기',scan:'QR을 스캔하면 이 역의 안내가 열립니다.',stationTitle:'역별 접속 QR코드',stationScan:'QR코드를 스캔하면 선택한 역의 메인 화면으로 연결됩니다.',install:'설치 없이 이용할 수 있습니다.',copy:'링크 복사',copied:'복사했어요',download:'QR 다운로드',close:'닫기',interpreter:'통역 시작'},
 en:{qr:'Access QR',title:'Continue on your phone',scan:'Scan to open this station’s guide.',stationTitle:'Station access QR code',stationScan:'Scan to open the selected station’s main screen.',install:'No app installation required.',copy:'Copy link',copied:'Copied',download:'Download QR',close:'Close',interpreter:'Interpreter'},
 ja:{qr:'案内QR',title:'自分のスマートフォンで案内を見る',scan:'QRを読み取ると、この駅の案内が開きます。',stationTitle:'駅別アクセスQRコード',stationScan:'QRコードを読み取ると、選択した駅のメイン画面が開きます。',install:'アプリのインストールは不要です。',copy:'リンクをコピー',copied:'コピーしました',download:'QRを保存',close:'閉じる',interpreter:'通訳を開始'},
 zh:{qr:'访问二维码',title:'在自己的手机上查看指南',scan:'扫描二维码即可打开本站指南。',stationTitle:'各站访问二维码',stationScan:'扫描二维码即可打开所选车站的主页面。',install:'无需安装应用。',copy:'复制链接',copied:'已复制',download:'下载二维码',close:'关闭',interpreter:'开始口译'}
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
 return <a className="v2-interpreter-entry" href={'/interpreter-test?station='+encodeURIComponent(stationCode)+'&lang='+encodeURIComponent(lang)} title={t.interpreter} aria-label={t.interpreter}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 6 6m-7 0 6-6 2-3H3m5-3v3M13 21l5-11 5 11m-8-4h6"/></svg></a>;
}
export function AccessQR({stationCode,stationName,view,menuName,basePath,lang,stationPicker=false}){
 const [open,setOpen]=useState(false),[qr,setQr]=useState(''),[downloadUrl,setDownloadUrl]=useState(''),[link,setLink]=useState(''),[copied,setCopied]=useState(false),[error,setError]=useState('');
 const dialog=useRef(null),trigger=useRef(null);const t=words[lang]||words.en;
 const stationInfo=getStationByCode(stationCode);
 const fileName='Subway_AI_Guide_'+stationCode+'_'+stationName.replace(/[\\/:*?"<>|]/g,'_')+'_'+(view||'home').replace(/[^a-z0-9_-]/gi,'_')+'.png';
 useEffect(()=>{
  if(!open)return;let alive=true,pngUrl='';
  const url=new URL(basePath==='/'?'/':'/v2',window.location.origin);
  url.searchParams.set('station',stationCode);if(view!=='home')url.searchParams.set('view',view);
  setQr('');setDownloadUrl('');setCopied(false);setError('');setLink(url.href);
  QRCode.toDataURL(url.href,{width:300,margin:4,errorCorrectionLevel:'M'}).then(dataUrl=>{
   if(!alive)return;
   // A PNG Blob URL is download-friendly on mobile Safari as well as desktop browsers.
   const bytes=Uint8Array.from(atob(dataUrl.split(',')[1]),char=>char.charCodeAt(0));
   pngUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
   setQr(dataUrl);setDownloadUrl(pngUrl);
  }).catch(()=>{if(alive)setError('QR unavailable');});
  dialog.current?.showModal();
  return()=>{alive=false;if(pngUrl)URL.revokeObjectURL(pngUrl);};
 },[open,stationCode,view,basePath]);
 function close(){setOpen(false);trigger.current?.focus();}
 return <>
  <button ref={trigger} type="button" className="v2-access-qr" onClick={()=>{void recordStat('ui_action','menu_qr_open',lang,view);setOpen(true);}} aria-label={t.qr} title={t.qr}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 13h2v4M13 19v2h4M19 19h2v2h-2M13 11v4M5 11v2M11 3v4"/></svg></button>
  {open&&createPortal(<dialog ref={dialog} className="sag-qr-dialog" aria-labelledby="sag-qr-title" onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close();}}>
   <button type="button" className="sag-qr-close" aria-label={t.close} onClick={close}>×</button>
   <h2 id="sag-qr-title">{stationPicker?t.stationTitle:t.title}</h2><p className="sag-qr-context">{stationInfo&&<span className="sag-qr-line" style={{backgroundColor:stationInfo.color}} aria-label={stationInfo.line+'호선'}>{stationInfo.line}</span>}<span className="sag-qr-station-name">{stationName}</span><span aria-hidden="true">·</span><span className="sag-qr-menu-name">{menuName}</span></p>
   {qr?<img src={qr} width="280" height="280" alt={t.qr}/>:<p role="status">{error||'QR…'}</p>}
   <p>{stationPicker?t.stationScan:t.scan}<br/>{t.install}</p><p lang="en" className="sag-qr-english">Scan for station guidance · No app needed</p>
   <div className="sag-qr-actions"><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(link);setCopied(true);}catch{setError(t.copy+' — '+link);}}}>{copied?t.copied:t.copy}</button><a className="sag-qr-download" href={downloadUrl||undefined} download={fileName}>{t.download}</a></div>
   {error&&<p role="status">{error}</p>}
  </dialog>,document.body)}
 </>;
}
