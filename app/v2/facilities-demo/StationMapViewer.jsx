'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './station-map.css';

const TEXT={
 ko:{title:'역 이용 및 비상대피 안내도',view:'전체화면으로 확대',zoom:'확대·축소',reset:'원래 크기',close:'닫기',missing:'이 역의 이용안내도는 아직 제공되지 않습니다.',hint:'두 손가락으로 확대하거나 화면을 움직여 위치를 확인하세요.',retry:'이미지를 불러오지 못했습니다.'},
 en:{title:'Station & emergency evacuation map',view:'View full-screen map',zoom:'Zoom',reset:'Reset',close:'Close',missing:'No station map is available for this station.',hint:'Pinch to zoom and drag to explore the station.',retry:'Unable to load the station map.'},
 ja:{title:'駅構内・非常避難案内図',view:'全画面で拡大',zoom:'拡大・縮小',reset:'元のサイズ',close:'閉じる',missing:'この駅の案内図はまだ提供されていません。',hint:'指2本で拡大し、スワイプして位置を確認できます。',retry:'案内図を読み込めませんでした。'},
 zh:{title:'车站及紧急疏散导览图',view:'全屏查看',zoom:'缩放',reset:'恢复原尺寸',close:'关闭',missing:'该站暂无导览图。',hint:'双指缩放，拖动查看车站布局。',retry:'无法加载车站导览图。'}
};
const MAP_ALIASES={'2:이대':'이대입구','4:불암산':'당고개'};
function mapPath(station){
 const line=String(station?.line||'1');
 if(!/^[1-8]$/.test(line))return null;
 let name=String(station?.names?.ko||'종로5가').normalize('NFKC').trim().replace(/역$/,'');
 name=MAP_ALIASES[line+':'+name]||name;
 return '/station-maps/'+line+'/'+encodeURIComponent(name)+'.webp';
}
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export default function StationMapViewer({stationContext,lang='ko'}){
 const t=TEXT[lang]||TEXT.ko;
 const path=mapPath(stationContext);
 const [unavailable,setUnavailable]=useState(false);
 const [open,setOpen]=useState(false);
 const [zoom,setZoom]=useState(1);
 const viewport=useRef(null),pinch=useRef(null);
 useEffect(()=>{setUnavailable(false);setOpen(false);setZoom(1);},[path]);
 useEffect(()=>{
  if(!open)return;
  const closeOnEscape=e=>{if(e.key==='Escape')setOpen(false);};
  window.addEventListener('keydown',closeOnEscape);
  const originalOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{window.removeEventListener('keydown',closeOnEscape);document.body.style.overflow=originalOverflow;};
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const node=viewport.current;
  if(!node)return;
  const distance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
  const start=e=>{if(e.touches.length===2)pinch.current={distance:distance(e.touches),zoom};};
  const move=e=>{
   if(e.touches.length!==2||!pinch.current)return;
   e.preventDefault();
   setZoom(clamp(pinch.current.zoom*distance(e.touches)/pinch.current.distance,1,4));
  };
  const end=e=>{if(e.touches.length<2)pinch.current=null;};
  node.addEventListener('touchstart',start,{passive:true});
  node.addEventListener('touchmove',move,{passive:false});
  node.addEventListener('touchend',end);
  return()=>{node.removeEventListener('touchstart',start);node.removeEventListener('touchmove',move);node.removeEventListener('touchend',end);};
 },[open,zoom]);
 const title=String(stationContext?.names?.[lang]||stationContext?.names?.ko||'종로5가');
 const failed=path===null||unavailable;
 return <section className="sf-map-section" aria-label={t.title}>
  {failed?<div className="sf-map-empty" role="status">{path===null?t.missing:t.retry}</div>:<>
   <button type="button" className="sf-map-preview" onClick={()=>{setZoom(1);setOpen(true);}} aria-label={t.view}>
    <img src={path} alt={title+' '+t.title} loading="lazy" onError={()=>setUnavailable(true)}/>
    <span className="sf-map-preview-action">⛶ {t.view}</span>
   </button>
   <p className="sf-map-help">{t.hint}</p>
  </>}
  {open&&!failed&&createPortal(<div className="sf-map-overlay" role="dialog" aria-modal="true" aria-label={title+' '+t.title}>
   <div className="sf-map-toolbar">
    <strong>{title}</strong>
    <div className="sf-map-controls">
     <button type="button" onClick={()=>setZoom(z=>clamp(z/1.5,1,4))} aria-label={t.zoom+' -'} disabled={zoom<=1}>−</button>
     <span aria-live="polite">{Math.round(zoom*100)}%</span>
     <button type="button" onClick={()=>setZoom(z=>clamp(z*1.5,1,4))} aria-label={t.zoom+' +'} disabled={zoom>=4}>＋</button>
     <button type="button" onClick={()=>{setZoom(1);viewport.current?.scrollTo(0,0)}}>{t.reset}</button>
     <button type="button" className="sf-map-close" onClick={()=>setOpen(false)} aria-label={t.close}>✕</button>
    </div>
   </div>
   <div ref={viewport} className="sf-map-viewport">
    <img src={path} alt={title+' '+t.title} draggable="false" style={{width:(zoom*100)+'%'}} onError={()=>{setUnavailable(true);setOpen(false);}}/>
   </div>
   <div className="sf-map-caption">{t.hint}</div>
  </div>,document.body)}
 </section>;
}
