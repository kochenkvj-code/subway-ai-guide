'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { currentLocation, requestTour } from '../lib/tour-client';
import { tourCopy, tourTypes } from './tour-copy';
import { iconPaths } from './icons';
import {stationCoordinates} from '../lib/station-coordinates';
import {DEFAULT_FEEDBACK_STATION} from '../lib/feedback-config';
import './tour.css';
const RADII=['500','1500','3000','5000'];
function Icon({name}){return <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{__html:iconPaths[name]||iconPaths.tour}}/>;}
function distance(value){const n=Number(value);return value!==''&&value!=null&&Number.isFinite(n)&&n>=0?(n>=1000?`${(n/1000).toFixed(1)}km`:`${Math.round(n)}m`):'';}
function Picture({src,label}){const[failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);return src&&!failed?<img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<div className="tour-image-fallback"><Icon name="tour"/><span>{label}</span></div>;}
export default function NearbyTour({lang='ko',active=false,station=DEFAULT_FEEDBACK_STATION}) {
  const t=tourCopy[lang]||tourCopy.ko;
  const stationKey=station.stationCode||station.id||station.coordinateId;
  const center=useMemo(()=>stationCoordinates(station),[station.stationCode,station.id,station.coordinateId,station.line,station.names?.ko]);
  const stationName=station.names?.[lang]||station.names?.ko||station.name;
  const [basis,setBasis]=useState('station'),[page,setPage]=useState(0);
  const cache=useRef(new Map()),lastAttempt=useRef(null);
  const currentLanguage=useRef(lang),previousLanguage=useRef(lang);currentLanguage.current=lang;
  const [coords,setCoords]=useState(center),[radius,setRadius]=useState('1500'),[type,setType]=useState('');
  const [data,setData]=useState(null),[loading,setLoading]=useState(false),[locating,setLocating]=useState(false),[error,setError]=useState(null);
  const [selected,setSelected]=useState(null),[details,setDetails]=useState({}),[detailBusy,setDetailBusy]=useState(false),[detailError,setDetailError]=useState(false);
  const [photos,setPhotos]=useState({}),[photoBusy,setPhotoBusy]=useState(false),[photoError,setPhotoError]=useState(false);
  const scroller=useRef(null),listScroll=useRef(0),catalog=useRef(new Map()),request=useRef(null),sequence=useRef(0),detailAbort=useRef(null),photoAbort=useRef(null);
  function selectedFromUrl(){
    const id=new URLSearchParams(window.location.search).get('place');
    if(window.history.state?.tourLanguage && window.history.state.tourLanguage!==lang)return null;
    if(window.history.state?.tourStationKey && window.history.state.tourStationKey!==stationKey)return null;
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
    if(active&&coords&&data?.language!==lang)void search(coords,radius,type,basis);
    if(active&&!coords)setError({kind:'station'});
  },[lang,active]);
  useEffect(()=>()=>{sequence.current++;request.current?.abort();detailAbort.current?.abort();photoAbort.current?.abort();},[]);
  useEffect(()=>{const frame=requestAnimationFrame(()=>{if(scroller.current)scroller.current.scrollTop=selected?0:listScroll.current;});return()=>cancelAnimationFrame(frame);},[selected?.id,active,lang]);
  useEffect(()=>{
    if(!active||!selected||selected.language!==lang||details[selected.id]){setDetailBusy(false);return;}
    const controller=new AbortController();detailAbort.current=controller;setDetailBusy(true);setDetailError(false);
    requestTour({mode:'detail',id:selected.id,lang},{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setDetails(previous=>({...previous,[selected.id]:result.items?.[0]||{}}));}).catch(()=>{if(!controller.signal.aborted)setDetailError(true);}).finally(()=>{if(!controller.signal.aborted)setDetailBusy(false);});
    return()=>controller.abort();
  },[selected?.id,active,lang]);
  async function search(location,newRadius=radius,newType=type,kind=basis,id=++sequence.current){
    if(!location){setError({kind:'station'});return false;}
    const requestLanguage=lang;
    lastAttempt.current={location,radius:newRadius,type:newType,kind};
    request.current?.abort();const controller=new AbortController();request.current=controller;setLoading(true);setError(null);
    const cacheKey=JSON.stringify([stationKey,requestLanguage,location.longitude,location.latitude,newRadius,newType]);
    const allKey=JSON.stringify([stationKey,requestLanguage,location.longitude,location.latitude,newRadius,'']);
    try{
      const cached=cache.current.get(cacheKey),all=cache.current.get(allKey);
      let result=cached&&Date.now()-cached.time<120000?cached.data:null;
      if(!result&&newType&&all&&Date.now()-all.time<120000){const items=all.data.items.filter(x=>String(x.type)===newType);result={...all.data,items,total:items.length};}
      if(!result){result=await requestTour({mode:'nearby',all:'1',lang:requestLanguage,longitude:String(location.longitude),latitude:String(location.latitude),radius:newRadius,type:newType},{signal:controller.signal});if(result.complete!==true)throw Error('Incomplete tourism result');}
      if(id!==sequence.current||controller.signal.aborted||requestLanguage!==currentLanguage.current)return false;
      const items=(result.items||[]).slice().sort((a,b)=>(a.distance!==''&&a.distance!=null&&Number.isFinite(Number(a.distance))?Number(a.distance):Infinity)-(b.distance!==''&&b.distance!=null&&Number.isFinite(Number(b.distance))?Number(b.distance):Infinity));
      items.forEach(item=>catalog.current.set(String(item.id),{...item,language:requestLanguage}));
      cache.current.set(cacheKey,{time:Date.now(),data:{...result,items}});if(cache.current.size>12)cache.current.delete(cache.current.keys().next().value);
      setData({...result,language:requestLanguage,items,query:{radius:newRadius,type:newType,kind}});setCoords(location);setBasis(kind);setRadius(newRadius);setType(newType);setPage(0);listScroll.current=0;
      return true;
    }catch(e){if(id===sequence.current&&!controller.signal.aborted){setError({kind:'api',code:e.code});if(data?.query){setRadius(data.query.radius);setType(data.query.type);}}return false;}
    finally{if(id===sequence.current){setLoading(false);setLocating(false);}}
  }
  async function locate(){
    const id=++sequence.current,requestLanguage=lang;request.current?.abort();setError(null);setLocating(true);
    try{const position=await currentLocation();if(id!==sequence.current||requestLanguage!==currentLanguage.current)return;const location={longitude:position.coords.longitude,latitude:position.coords.latitude,accuracy:position.coords.accuracy};setLocating(false);await search(location,radius,type,'gps',id);}
    catch(e){if(id===sequence.current){setError({kind:'location',code:e.code});setLoading(false);setLocating(false);}}
  }
  function changeRadius(value){setRadius(value);if(coords)void search(coords,value,type,basis);}
  function changeType(value){setType(value);if(coords)void search(coords,radius,value,basis);}
  function useStation(){if(basis==='station'&&data?.language===lang){setError(null);return;}void search(center,radius,type,'station');}
  function retry(){if(error?.kind==='location'){void locate();return;}const attempt=lastAttempt.current;if(attempt)void search(attempt.location,attempt.radius,attempt.type,attempt.kind);else void search(center,radius,type,'station');}
  function open(place){
    if(!place.id)return;photoAbort.current?.abort();setPhotoBusy(false);listScroll.current=scroller.current?.scrollTop||0;setDetailError(false);setPhotoError(false);
    const url=new URL(window.location.href);url.searchParams.set('place',place.id);window.history.pushState({...(window.history.state||{}),sagV2Depth:(window.history.state?.sagV2Depth||0)+1,tourDetail:true,tourLanguage:lang,tourStationKey:stationKey},'',url.pathname+url.search);setSelected({...place,language:lang});
  }
  function close(){photoAbort.current?.abort();setPhotoBusy(false);if(window.history.state?.tourDetail)window.history.back();else{const url=new URL(window.location.href);url.searchParams.delete('place');window.history.replaceState(window.history.state,'',url.pathname+url.search);setSelected(null);}}
  async function loadPhotos(){if(!selected||photos[selected.id])return;photoAbort.current?.abort();const controller=new AbortController();photoAbort.current=controller;setPhotoBusy(true);setPhotoError(false);try{const result=await requestTour({mode:'images',id:selected.id,lang},{signal:controller.signal});if(!controller.signal.aborted)setPhotos(previous=>({...previous,[selected.id]:result.images||[]}));}catch{if(!controller.signal.aborted)setPhotoError(true);}finally{if(!controller.signal.aborted)setPhotoBusy(false);}}
  const failText=error?.kind==='station'?t.noCoordinates:error?.kind==='location'?({1:t.denied,2:t.unavailable,3:t.timeout,UNSUPPORTED:t.unsupported}[error.code]||t.unavailable):error?.code==='TOUR_TOO_MANY_RESULTS'?t.tooMany:t.apiError;
  const originLabel=basis==='station'?t.stationAround(stationName):t.origin;
  const totalPages=Math.max(1,Math.ceil((data?.items.length||0)/4));
  const pageItems=data?.items.slice(page*4,page*4+4)||[];
  const place=selected&&selected.language===lang?{...selected,...details[selected.id]}:null;
  return <section ref={scroller} className="v2-tour" hidden={!active} aria-label={t.nearby}>
    {place?<>
      <button className="tour-back-list" onClick={close}>← {t.back}</button>
      <div className="tour-detail-image"><Picture key={place.id} src={place.image} label={t.photoMissing}/></div>
      <div className="tour-detail-copy"><span className="tour-category-tag">{t.categories[tourTypes.indexOf(String(place.type))]||t.categories[0]}</span><h2>{place.title||t.details}</h2>{place.distance&&<p className="tour-distance"><Icon name="route"/>{distance(place.distance)} · {originLabel}</p>}
      {detailBusy&&<p className="tour-muted" role="status">{t.loading}</p>}{detailError&&<p className="tour-alert" role="alert">{t.apiError}</p>}
      <h3>{t.details}</h3><p className="tour-description">{place.description||(!detailBusy?t.noDescription:'')}</p>
      <dl><dt>{t.address}</dt><dd>{place.address||t.unknown}</dd><dt>{t.phone}</dt><dd>{place.phone||t.unknown}</dd></dl>
      {place.homepage&&<a className="tour-site-link" href={place.homepage} target="_blank" rel="noopener noreferrer">{t.homepage} ↗</a>}
      {place.title&&<a className="tour-primary tour-map-link" href={`https://map.naver.com/p/search/${encodeURIComponent(place.title+' '+(place.address||''))}`} target="_blank" rel="noopener noreferrer"><Icon name="route"/>{t.map} ↗</a>}
      <button className="tour-secondary" disabled={photoBusy} onClick={loadPhotos}>{photoBusy?t.loading:t.photos}</button>{photoError&&<p className="tour-alert" role="alert">{t.apiError}</p>}
      {photos[place.id]&&<div className="tour-gallery">{photos[place.id].length?photos[place.id].map((photo,i)=><figure key={i}><Picture src={photo.url} label={t.photoMissing}/><figcaption>{photo.title}</figcaption></figure>):<p className="tour-muted">{t.noPhotos}</p>}</div>}
      {lang!=='ko'&&<p className="tour-muted">{t.apiLanguage}</p>}</div>
    </>:<>
      <div className="tour-origin-head"><div className="tour-origin-copy"><strong className="tour-origin-tagline">{t.compactMood}</strong><small className="tour-origin-meta" title={`${originLabel} · ${t.radius} ${distance(data?.query?.radius||radius)}`}><span className="tour-origin-station">{basis==='station'&&<span className="tour-station-line" style={{background:station.color||'#24559b'}}>{station.line}</span>}<span className="tour-origin-station-name">{basis==='station'?stationName:t.gpsBasis}</span></span><span className="tour-origin-radius">· {distance(data?.query?.radius||radius)}</span></small></div><div className="tour-basis" role="group" aria-label={t.basis}><button aria-pressed={basis==='station'} disabled={loading||locating} onClick={useStation}>{t.stationBasis}</button><button aria-pressed={basis==='gps'} disabled={loading||locating} onClick={locate}>{locating?t.locating:t.gpsBasis}</button></div></div>
      <div className="tour-filter-row" role="group" aria-label={t.radius}>{RADII.map(value=><button key={value} aria-pressed={radius===value} disabled={loading||locating} onClick={()=>changeRadius(value)}>{distance(value)}</button>)}</div>
      <div className="tour-category-row" role="group" aria-label={t.category}>{tourTypes.map((value,i)=><button key={value} aria-pressed={type===value} disabled={loading||locating} onClick={()=>changeType(value)}>{t.categories[i]}</button>)}</div>
      {error&&<div className="tour-error" role="alert"><p>{failText}</p><button onClick={retry}>{t.retry} ↻</button></div>}
      {(loading||locating)&&<div className="tour-loading" role="status"><span/>{locating?t.locating:t.loading}</div>}
      {data&&data.language===lang&&<><div className="tour-results-heading"><h2>{t.count(data.items.length)}</h2><span>{t.total(data.total)}</span></div>{!data.items.length?<div className="tour-empty"><Icon name="tour"/><h3>{t.empty}</h3><p>{t.emptyHelp}</p></div>:<div className="tour-places">{pageItems.map((item,i)=><button className="tour-place" key={item.id||i} disabled={!item.id} onClick={()=>open(item)}><div className="tour-card-image"><Picture src={item.image} label={t.photoMissing}/></div><div className="tour-card-copy"><small>{t.categories[tourTypes.indexOf(String(item.type))]||t.categories[0]}</small><strong>{item.title}</strong><span><Icon name="route"/>{distance(item.distance)||'—'}</span></div></button>)}</div>}{data.items.length>0&&<nav className="tour-pager" aria-label={t.pages}><button disabled={page===0||loading||locating} onClick={()=>{setPage(v=>v-1);if(scroller.current)scroller.current.scrollTop=0;}}>{t.previous}</button><span>{page+1} / {totalPages}</span><button disabled={page+1>=totalPages||loading||locating} onClick={()=>{setPage(v=>v+1);if(scroller.current)scroller.current.scrollTop=0;}}>{t.next}</button></nav>}{basis==='gps'&&Number.isFinite(coords?.accuracy)&&<p className="tour-muted">{t.accuracy(Math.round(coords.accuracy))}</p>}</>}
      {lang!=='ko'&&<p className="tour-muted">{t.apiLanguage}</p>}
    </>}
  </section>;
}
