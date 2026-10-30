'use client';
import { useEffect, useRef, useState } from 'react';
import { currentLocation, requestTour } from '../lib/tour-client';
import { tourCopy, tourTypes } from './tour-copy';
import { iconPaths } from './icons';
import './tour.css';
const RADII=['500','1500','3000','5000'];
function Icon({name}){return <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{__html:iconPaths[name]||iconPaths.tour}}/>;}
function distance(value){const n=Number(value);return value!==''&&value!=null&&Number.isFinite(n)&&n>=0?(n>=1000?`${(n/1000).toFixed(1)}km`:`${Math.round(n)}m`):'';}
function Picture({src,label}){const[failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);return src&&!failed?<img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<div className="tour-image-fallback"><Icon name="tour"/><span>{label}</span></div>;}
function ExplorerArt(){return <svg className="tour-explorer-art" viewBox="0 0 260 150" aria-hidden="true"><circle cx="184" cy="43" r="31" fill="#dde9d7"/><path d="m36 100 54-35 49 30 73-46v66l-72 29-51-26-53 21Z" fill="#e3eee6" stroke="#b4cfbd"/><path d="M90 65v53m49-23v49" fill="none" stroke="#b4cfbd"/><path d="m52 110 38-25 48 32 56-38" fill="none" stroke="#a3bd8c" strokeWidth="3" strokeDasharray="5 6"/><path d="M155 49c0-18 28-18 28 0 0 12-14 26-14 26s-14-14-14-26" fill="#3d7964"/><circle cx="169" cy="48" r="5" fill="#f6faf4"/><path d="m55 50 13-15 13 15v27H55Z" fill="#b9cdb8"/><path d="m50 51 18-21 19 21Z" fill="#6d9278"/><rect x="65" y="62" width="8" height="15" fill="#f6faf4"/><circle cx="219" cy="112" r="17" fill="#f7faf4" stroke="#bdcfc0"/><path d="m213 119 4-14 8-2-4 14Z" fill="#759b82"/></svg>;}
export default function NearbyTour({lang='ko',active=false}) {
  const t=tourCopy[lang];
  const currentLanguage=useRef(lang),previousLanguage=useRef(lang);currentLanguage.current=lang;
  const [coords,setCoords]=useState(null),[radius,setRadius]=useState('1500'),[type,setType]=useState('');
  const [data,setData]=useState(null),[loading,setLoading]=useState(false),[locating,setLocating]=useState(false),[error,setError]=useState(null);
  const [selected,setSelected]=useState(null),[details,setDetails]=useState({}),[detailBusy,setDetailBusy]=useState(false),[detailError,setDetailError]=useState(false);
  const [photos,setPhotos]=useState({}),[photoBusy,setPhotoBusy]=useState(false),[photoError,setPhotoError]=useState(false);
  const scroller=useRef(null),listScroll=useRef(0),catalog=useRef(new Map()),request=useRef(null),sequence=useRef(0),detailAbort=useRef(null),photoAbort=useRef(null);
  function selectedFromUrl(){
    const id=new URLSearchParams(window.location.search).get('place');
    if(window.history.state?.tourLanguage && window.history.state.tourLanguage!==lang)return null;
    return id&&/^\d{1,15}$/.test(id)?catalog.current.get(id)||{id,title:'',language:lang}:null;
  }
  useEffect(()=>{const sync=()=>setSelected(selectedFromUrl());sync();window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[lang]);
  useEffect(()=>{if(active){setSelected(selectedFromUrl());return;}sequence.current++;request.current?.abort();detailAbort.current?.abort();photoAbort.current?.abort();setLoading(false);setLocating(false);setDetailBusy(false);setPhotoBusy(false);},[active]);
  useEffect(()=>{
    if(previousLanguage.current!==lang){
      previousLanguage.current=lang;sequence.current++;request.current?.abort();detailAbort.current?.abort();photoAbort.current?.abort();
      setData(null);setSelected(null);setDetails({});setPhotos({});catalog.current.clear();setError(null);setDetailError(false);setPhotoError(false);setPhotoBusy(false);setDetailBusy(false);setLoading(false);setLocating(false);
      const url=new URL(window.location.href);if(url.searchParams.has('place')){url.searchParams.delete('place');window.history.replaceState({...window.history.state,tourDetail:false,tourLanguage:lang},'',url.pathname+url.search);}
    }
    if(active&&coords&&data?.language!==lang)void search(coords);
  },[lang,active]);
  useEffect(()=>()=>{sequence.current++;request.current?.abort();detailAbort.current?.abort();photoAbort.current?.abort();},[]);
  useEffect(()=>{const frame=requestAnimationFrame(()=>{if(scroller.current)scroller.current.scrollTop=selected?0:listScroll.current;});return()=>cancelAnimationFrame(frame);},[selected?.id,active,lang]);
  useEffect(()=>{
    if(!active||!selected||selected.language!==lang||details[selected.id]){setDetailBusy(false);return;}
    const controller=new AbortController();detailAbort.current=controller;setDetailBusy(true);setDetailError(false);
    requestTour({mode:'detail',id:selected.id,lang},{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setDetails(previous=>({...previous,[selected.id]:result.items?.[0]||{}}));}).catch(()=>{if(!controller.signal.aborted)setDetailError(true);}).finally(()=>{if(!controller.signal.aborted)setDetailBusy(false);});
    return()=>controller.abort();
  },[selected?.id,active,lang]);
  async function search(location,newRadius=radius,newType=type,id=++sequence.current){
    const requestLanguage=lang;
    request.current?.abort();const controller=new AbortController();request.current=controller;setLoading(true);setData(null);setError(null);
    try{
      const result=await requestTour({mode:'nearby',lang:requestLanguage,longitude:String(location.longitude),latitude:String(location.latitude),radius:newRadius,type:newType},{signal:controller.signal});
      if(id!==sequence.current||controller.signal.aborted||requestLanguage!==currentLanguage.current)return;
      const items=(result.items||[]).slice().sort((a,b)=>(Number.isFinite(Number(a.distance))?Number(a.distance):Infinity)-(Number.isFinite(Number(b.distance))?Number(b.distance):Infinity));
      items.forEach(item=>catalog.current.set(String(item.id),{...item,language:requestLanguage}));setData({...result,language:requestLanguage,items});
    }catch(e){if(id===sequence.current&&!controller.signal.aborted)setError({kind:'api',code:e.code});}
    finally{if(id===sequence.current){setLoading(false);setLocating(false);}}
  }
  async function locate(){
    const id=++sequence.current,requestLanguage=lang;request.current?.abort();setError(null);setLocating(true);setLoading(true);setData(null);
    try{const position=await currentLocation();if(id!==sequence.current||requestLanguage!==currentLanguage.current)return;const location={longitude:position.coords.longitude,latitude:position.coords.latitude,accuracy:position.coords.accuracy};setCoords(location);setLocating(false);await search(location,radius,type,id);}
    catch(e){if(id===sequence.current){setError({kind:'location',code:e.code});setLoading(false);setLocating(false);}}
  }
  function changeRadius(value){setRadius(value);if(coords)void search(coords,value,type);}
  function changeType(value){setType(value);if(coords)void search(coords,radius,value);}
  function open(place){
    if(!place.id)return;photoAbort.current?.abort();setPhotoBusy(false);listScroll.current=scroller.current?.scrollTop||0;setDetailError(false);setPhotoError(false);
    const url=new URL(window.location.href);url.searchParams.set('place',place.id);window.history.pushState({...(window.history.state||{}),sagV2Depth:(window.history.state?.sagV2Depth||0)+1,tourDetail:true,tourLanguage:lang},'',url.pathname+url.search);setSelected({...place,language:lang});
  }
  function close(){photoAbort.current?.abort();setPhotoBusy(false);if(window.history.state?.tourDetail)window.history.back();else{const url=new URL(window.location.href);url.searchParams.delete('place');window.history.replaceState(window.history.state,'',url.pathname+url.search);setSelected(null);}}
  async function loadPhotos(){if(!selected||photos[selected.id])return;photoAbort.current?.abort();const controller=new AbortController();photoAbort.current=controller;setPhotoBusy(true);setPhotoError(false);try{const result=await requestTour({mode:'images',id:selected.id,lang},{signal:controller.signal});if(!controller.signal.aborted)setPhotos(previous=>({...previous,[selected.id]:result.images||[]}));}catch{if(!controller.signal.aborted)setPhotoError(true);}finally{if(!controller.signal.aborted)setPhotoBusy(false);}}
  const failText=error?.kind==='location'?({1:t.denied,2:t.unavailable,3:t.timeout,UNSUPPORTED:t.unsupported}[error.code]||t.unavailable):t.apiError;
  const place=selected&&selected.language===lang?{...selected,...details[selected.id]}:null;
  return <section ref={scroller} className="v2-tour" hidden={!active} aria-label={t.nearby}>
    {place?<>
      <button className="tour-back-list" onClick={close}>← {t.back}</button>
      <div className="tour-detail-image"><Picture key={place.id} src={place.image} label={t.photoMissing}/></div>
      <div className="tour-detail-copy"><span className="tour-category-tag">{t.categories[tourTypes.indexOf(String(place.type))]||t.categories[0]}</span><h2>{place.title||t.details}</h2>{place.distance&&<p className="tour-distance"><Icon name="route"/>{distance(place.distance)} · {t.origin}</p>}
      {detailBusy&&<p className="tour-muted" role="status">{t.loading}</p>}{detailError&&<p className="tour-alert" role="alert">{t.apiError}</p>}
      <h3>{t.details}</h3><p className="tour-description">{place.description||(!detailBusy?t.noDescription:'')}</p>
      <dl><dt>{t.address}</dt><dd>{place.address||t.unknown}</dd><dt>{t.phone}</dt><dd>{place.phone||t.unknown}</dd></dl>
      {place.homepage&&<a className="tour-site-link" href={place.homepage} target="_blank" rel="noopener noreferrer">{t.homepage} ↗</a>}
      {place.title&&<a className="tour-primary tour-map-link" href={`https://map.naver.com/p/search/${encodeURIComponent(place.title+' '+(place.address||''))}`} target="_blank" rel="noopener noreferrer"><Icon name="route"/>{t.map} ↗</a>}
      <button className="tour-secondary" disabled={photoBusy} onClick={loadPhotos}>{photoBusy?t.loading:t.photos}</button>{photoError&&<p className="tour-alert" role="alert">{t.apiError}</p>}
      {photos[place.id]&&<div className="tour-gallery">{photos[place.id].length?photos[place.id].map((photo,i)=><figure key={i}><Picture src={photo.url} label={t.photoMissing}/><figcaption>{photo.title}</figcaption></figure>):<p className="tour-muted">{t.noPhotos}</p>}</div>}
      <p className="tour-source">{t.source}</p><p className="tour-muted">{t.distanceNote}</p>{lang!=='ko'&&<p className="tour-muted">{t.apiLanguage}</p>}</div>
    </>:<>
      {!coords?<><div className="tour-welcome"><span className="tour-eyebrow">{t.eyebrow}</span><h2>{t.title}</h2><p>{t.intro}</p><ExplorerArt/></div><div className="tour-permission"><span className="tour-location-icon"><Icon name="search"/></span><h3>{t.permission}</h3><p>{t.permissionText}</p><button className="tour-primary" onClick={locate} disabled={loading}><Icon name="search"/>{locating?t.locating:t.locate}</button><small>{t.locationHint}</small><span className="tour-radius-hint">1.5km</span></div></>:<>
        <div className="tour-location-bar"><div><span className="tour-location-dot"/><strong>{t.origin}</strong><small>{radius==='500'?'500m':`${Number(radius)/1000}km`}</small></div><button disabled={loading} onClick={locate}>{locating?t.locating:t.update} ↻</button></div>
        <div className="tour-filter-row" role="group" aria-label={t.radius}>{RADII.map(value=><button key={value} aria-pressed={radius===value} disabled={loading} onClick={()=>changeRadius(value)}>{value==='500'?'500m':`${Number(value)/1000}km`}</button>)}</div>
        <div className="tour-category-row" role="group" aria-label={t.category}>{tourTypes.map((value,i)=><button key={value} aria-pressed={type===value} disabled={loading} onClick={()=>changeType(value)}>{t.categories[i]}</button>)}</div>
      </>}
      {error&&<div className="tour-error" role="alert"><p>{failText}</p><button onClick={()=>coords&&error.kind==='api'?search(coords):locate()}>{t.retry} ↻</button></div>}
      {loading&&<div className="tour-loading" role="status"><span/>{locating?t.locating:t.loading}</div>}
      {data&&data.language===lang&&!loading&&<><div className="tour-results-heading"><h2>{t.count(data.items.length)}</h2><span>{t.total(data.total)}</span></div>{!data.items.length?<div className="tour-empty"><Icon name="tour"/><h3>{t.empty}</h3><p>{t.emptyHelp}</p></div>:<div className="tour-places">{data.items.map((item,i)=><button className="tour-place" key={item.id||i} disabled={!item.id} onClick={()=>open(item)}><div className="tour-card-image"><Picture src={item.image} label={t.photoMissing}/></div><div className="tour-card-copy"><small>{t.categories[tourTypes.indexOf(String(item.type))]||t.categories[0]}</small><strong>{item.title}</strong><span><Icon name="route"/>{distance(item.distance)||'—'}</span></div></button>)}</div>}<p className="tour-muted">{t.distanceNote}</p>{Number.isFinite(coords?.accuracy)&&<p className="tour-muted">{t.accuracy(Math.round(coords.accuracy))}</p>}</>}
      <p className="tour-source">{t.source}</p>{lang!=='ko'&&<p className="tour-muted">{t.apiLanguage}</p>}
    </>}
  </section>;
}
