'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {DEFAULT_FEEDBACK_STATION} from '../../lib/feedback-config';
import {closedCustody,koreaDate,lostDate,validLostRange} from '../../lib/lost-found-filter';
import {lostCopy} from './copy';
import './compact.css';
const keyOf=x=>x.id&&x.sequence?x.id+'|'+x.sequence:[x.source,x.title,x.date,x.place].join('|');
const groupOf=x=>String(x.category||'—').split(/[>＞]/)[0].trim();
function Photo({src,t}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);return <div className="lf-thumb">{src&&!failed?<img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<div className="lf-no-image"><span>▧</span>{t.noImage}</div>}</div>;}
export default function CompactLostFound({embedded=false,lang='ko',station=DEFAULT_FEEDBACK_STATION,active=true,onNavigationStep=null,navigationSnapshot=null}){
 const t=lostCopy[lang]||lostCopy.ko;
 const [scope,setScope]=useState('station'),[place,setPlace]=useState(''),[item,setItem]=useState(''),[period,setPeriod]=useState('30'),[from,setFrom]=useState(()=>koreaDate(29)),[to,setTo]=useState(()=>koreaDate());
 const [searched,setSearched]=useState(false);
 const [items,setItems]=useState([]),[category,setCategory]=useState(''),[page,setPage]=useState(0),[applied,setApplied]=useState(null),[nextPages,setNextPages]=useState(null),[hasMore,setHasMore]=useState(false),[limited,setLimited]=useState(false),[partial,setPartial]=useState(false),[loading,setLoading]=useState(false),[checking,setChecking]=useState(false),[error,setError]=useState('');
 const [selected,setSelected]=useState(null),[detail,setDetail]=useState(null),[detailLoading,setDetailLoading]=useState(false),[detailError,setDetailError]=useState(false);
 const knownClosed=useRef(new Set());
 const requestRef=useRef(null),detailRequest=useRef(null),sequence=useRef(0),scroll=useRef(0),container=useRef(null),filtersRef=useRef(null),limitedRef=useRef(false);
 const pageSize=4;
 const scroller=()=>container.current?.closest('.v2-feature-pane')||document.scrollingElement;
 function setPreset(value){setPeriod(value);if(value!=='custom'){setFrom(koreaDate(Number(value)-1));setTo(koreaDate());}}
 async function search(filters,append=false){
  setSearched(true);
  requestRef.current?.abort();const controller=new AbortController();requestRef.current=controller;const seq=++sequence.current;setLoading(true);setError('');
  if(!append){knownClosed.current.clear();setApplied(null);setItems([]);setPage(0);setCategory('');setSelected(null);setLimited(false);limitedRef.current=false;setPartial(false);setNextPages(null);setHasMore(false);}
  try{
   const results=new Map(),failures=new Map();
   const publish=()=>{
    if(seq!==sequence.current||controller.signal.aborted||!results.size)return;
    const batches=[...results.values()];
    setItems(previous=>{const map=new Map((append?previous:[]).map(x=>[keyOf(x),x]));for(const data of batches)for(const x of data.items)if(!knownClosed.current.has(keyOf(x)))map.set(keyOf(x),x);return [...map.values()];});
    const cursors=Object.assign({},...batches.map(x=>x.nextPages),Object.fromEntries(failures));
    setApplied(filters);setNextPages(cursors);setHasMore(batches.some(x=>x.hasMore)||[...failures.values()].some(n=>n<=20));
    limitedRef.current=limitedRef.current||batches.some(x=>x.limited);setLimited(limitedRef.current);setPartial(failures.size>0||batches.some(x=>x.partial));setLoading(false);
   };
   const progressive=filters.scope==='station'&&!append;
   setChecking(false);
   await Promise.allSettled((filters.scope==='station'?['portal']:['both']).map(async source=>{
    try{
     const params=new URLSearchParams({...filters,source});if(progressive)params.set('scan','first');
     if(append&&nextPages)params.set('cursors',JSON.stringify(nextPages));if(append&&limitedRef.current)params.set('capped','1');
     const r=await fetch('/api/v2/lost-found?'+params,{signal:controller.signal,cache:'no-store'});const data=await r.json();
     if(!r.ok||!data.ok)throw Error(data.error||'error');results.set(source,data);publish();
    }catch(e){if(source!=='both')failures.set(source,e.message==='API_KEY_MISSING'?21:1);publish();}
   }));
   if(!results.size)throw Error('error');
  }catch(e){if(!controller.signal.aborted&&seq===sequence.current)setError('error');}
  finally{if(seq===sequence.current&&!controller.signal.aborted){setLoading(false);setChecking(false);}}

 }
 useEffect(()=>{
  const filters={scope:'station',station:station.id,item:'',start:koreaDate(29),end:koreaDate()};filtersRef.current=filters;
  return()=>{sequence.current++;requestRef.current?.abort();detailRequest.current?.abort();};
 // Each instance is keyed by station in the parent; do not reset on language change.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[station.id]);
 function submit(e){e.preventDefault();setSearched(true);if(!validLostRange(from,to)||item.trim().length===1||(scope==='other'&&place.trim().length<2)){setError('invalid');return;}
  const filters={scope,station:station.id,item:item.trim(),start:from,end:to};if(scope==='other')filters.place=place.trim();filtersRef.current=filters;void search(filters);
 }
 const categories=useMemo(()=>[...new Set(items.map(groupOf))],[items]);
 const visible=useMemo(()=>items.filter(x=>!category||groupOf(x)===category),[items,category]);
 const pages=Math.max(1,Math.ceil(visible.length/pageSize)),safePage=Math.min(page,pages-1),pageItems=visible.slice(safePage*pageSize,(safePage+1)*pageSize);
 function pick(row){scroll.current=scroller()?.scrollTop||0;setSelected(row);}
 function back(){setSelected(null);requestAnimationFrame(()=>{const node=scroller();if(node)node.scrollTop=scroll.current;});}
 useEffect(()=>{if(!active||!onNavigationStep)return;onNavigationStep(selected?'found:'+keyOf(selected):'root',{foundItem:selected});},[selected,active,onNavigationStep]);
 useEffect(()=>{if(navigationSnapshot?.data&&Object.hasOwn(navigationSnapshot.data,'foundItem')){setSelected(navigationSnapshot.data.foundItem);if(!navigationSnapshot.data.foundItem)requestAnimationFrame(()=>{const node=scroller();if(node)node.scrollTop=scroll.current;});}},[navigationSnapshot]);
 useEffect(()=>{
  if(!selected)return;const node=scroller();if(node)node.scrollTop=0;
  detailRequest.current?.abort();const controller=new AbortController();detailRequest.current=controller;setDetail(null);setDetailLoading(true);setDetailError(false);
  const params=new URLSearchParams({source:selected.source,id:selected.id,sequence:selected.sequence});
  fetch('/api/v2/lost-found/detail?'+params,{signal:controller.signal,cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok||!data.ok)throw Error();return data.detail;}).then(data=>{
   if(controller.signal.aborted)return;setDetail(data);if(closedCustody(data.custody)){knownClosed.current.add(keyOf(selected));setItems(previous=>previous.filter(x=>keyOf(x)!==keyOf(selected)));}
  }).catch(()=>{if(!controller.signal.aborted)setDetailError(true);}).finally(()=>{if(!controller.signal.aborted)setDetailLoading(false);});
  return()=>controller.abort();
 },[selected]);
 const date=x=>lostDate(x)?.replaceAll('-','.')||t.unknown;
 const label=station.names[lang]||station.names.ko;
 return <div className={'lf-page lf-redesign '+(embedded?'lf-embedded':'')} ref={container}><div className="lf-shell">
 {!embedded&&<header className="lf-top"><a href="/v2" aria-label={t.back}>‹</a><strong>{t.title}</strong></header>}
 {!selected?<><form className="lf-search" onSubmit={submit}>
  <fieldset disabled={loading}><legend>{t.place}</legend><div className="lf-segments">{[['station',label],['all',t.all],['other',t.other]].map(([id,title])=><button type="button" key={id} aria-pressed={scope===id} onClick={()=>setScope(id)}>{title}</button>)}</div></fieldset>
  {scope==='other'&&<label className="lf-field lf-custom-place"><span>{t.other}</span><input type="search" value={place} maxLength={80} placeholder={t.placeHint} onChange={e=>setPlace(e.target.value)}/></label>}
  <label className="lf-field lf-item-query"><span>{t.item}</span><input type="search" value={item} maxLength={80} placeholder={t.itemHint} onChange={e=>setItem(e.target.value)}/></label>
  <fieldset disabled={loading}><legend>{t.period}</legend><div className="lf-segments lf-period">{['7','30','90','custom'].map((id,i)=><button type="button" key={id} aria-pressed={period===id} onClick={()=>setPreset(id)}>{t.days[i]}</button>)}</div></fieldset>
  {period==='custom'&&<div className="lf-date-row"><label className="lf-field"><span>{t.from}</span><input type="date" value={from} min={koreaDate(89)} max={to||koreaDate()} onChange={e=>setFrom(e.target.value)}/></label><label className="lf-field"><span>{t.to}</span><input type="date" value={to} min={from||koreaDate(89)} max={koreaDate()} onChange={e=>setTo(e.target.value)}/></label></div>}
  <div className="lf-actions"><small>{from.replaceAll('-','.')} – {to.replaceAll('-','.')}</small><button type="submit" className="lf-submit" disabled={loading}>{loading?t.loading:t.search} →</button></div>
 </form>{searched&&<section className="lf-results" aria-label={t.results}>
  <div className="lf-results-head"><h2 className="lf-results-title">{t.results}</h2><span className="lf-results-count">{items.length} {t.count}</span></div>
  {applied&&<div className="lf-applied">{applied.scope==='station'?label:applied.scope==='all'?t.all:applied.place} · {date(applied.start)} – {date(applied.end)}</div>}
  {!!items.length&&<div className="lf-chips" role="group" aria-label={t.category}>{['',...categories].map(cat=><button type="button" key={cat} className={'lf-chip '+(category===cat?'selected':'')} aria-pressed={category===cat} onClick={()=>{setCategory(cat);setPage(0);}}>{cat||t.allCategory}</button>)}</div>}
  {checking&&items.length>0&&<p className="lf-background" role="status">{t.background}</p>}
  {partial&&<p className="lf-warning" role="status">{t.partial}</p>}
  {error&&<p className="lf-warning" role="alert">{t[error]} {error!=='invalid'&&<button type="button" onClick={()=>search(filtersRef.current)}>{t.retry}</button>}</p>}
  {!error&&!items.length&&<div className="lf-state" role="status">{loading||checking?t.loading:t.empty}{!loading&&!checking&&hasMore&&<p>{t.moreHint}</p>}</div>}
  <div className="lf-list">{pageItems.map(row=><button type="button" key={keyOf(row)} className="lf-item" onClick={()=>pick(row)}><Photo src={row.image} t={t}/><span className="lf-item-main"><strong className="lf-item-title">{row.title}</strong><span className="lf-item-meta">{date(row.date)}</span><span className="lf-item-meta">{t.stored}: {row.place||t.unknown}</span></span><span className="lf-item-chevron">›</span></button>)}</div>
  {!!items.length&&<div className="lf-pager"><button disabled={!safePage||loading} onClick={()=>setPage(v=>Math.max(0,v-1))}>{t.previous}</button><span>{safePage+1} / {pages}</span><button disabled={(safePage+1)*pageSize>=visible.length||loading} onClick={()=>setPage(v=>v+1)}>{t.next}</button></div>}
  {!error&&items.length>0&&!visible.length&&<p className="lf-bottom">{t.noMatches}</p>}
  {hasMore&&!checking&&!error&&<button type="button" className="lf-load-more" disabled={loading} onClick={()=>search(filtersRef.current,true)}>{loading?t.loading:t.loadMore}</button>}
  {limited&&<p className="lf-warning">{t.limit}</p>}
 </section>}<p className="lf-bottom lf-transfer">{station.id===DEFAULT_FEEDBACK_STATION.id?t.transfer:t.scopeHint}</p><p className="lf-bottom">{t.scopeHint}</p></>:<section className="lf-detail" aria-label={t.detail}>
  <div className="lf-detail-head"><button className="lf-list-back" onClick={back}>‹ {t.back}</button><strong>{t.detail}</strong></div><div className="lf-detail-content"><div className="lf-detail-summary"><Photo src={detail?.image||selected.image} t={t}/><div><h3>{detail?.title||selected.title}</h3><p>{date(detail?.date||selected.date)}</p></div></div>
  {detailLoading&&<p role="status">{t.loading}</p>}{detailError&&<p className="lf-warning">{t.detailError}</p>}{closedCustody(detail?.custody)&&<p className="lf-warning">{t.closed}</p>}
  <dl className="lf-detail-fields"><dt>{t.stored}</dt><dd>{detail?.place||selected.place||t.unknown}</dd>{detail?.organization&&<><dt>{t.organization}</dt><dd>{detail.organization}</dd></>}<dt>{t.status}</dt><dd>{detail?.custody||t.unknown}</dd>{detail?.phone&&<><dt>{t.phone}</dt><dd><a href={'tel:'+detail.phone.replace(/[^\d+]/g,'')}>{detail.phone}</a></dd></>}<dt>{t.type}</dt><dd>{detail?.category||selected.category||t.unknown}</dd>{selected.color&&<><dt>{t.color}</dt><dd>{selected.color}</dd></>}<dt>{t.date}</dt><dd>{date(detail?.date||selected.date)}</dd>{detail?.foundPlace&&<><dt>{t.found}</dt><dd>{detail.foundPlace}</dd></>}{detail?.foundHour&&<><dt>{t.foundHour}</dt><dd>{detail.foundHour}</dd></>}<dt>{t.id}</dt><dd>{selected.id} / {selected.sequence}</dd>{(detail?.note||selected.subject)&&<><dt>{t.note}</dt><dd>{detail?.note||selected.subject}</dd></>}</dl><p className="lf-bottom">{t.original}</p><a href="https://www.lost112.go.kr/" target="_blank" rel="noopener noreferrer" className="lf-detail-link">{t.official} ↗</a><p className="lf-bottom">{t.officialNote}<br/>{station.id===DEFAULT_FEEDBACK_STATION.id?t.transfer:t.scopeHint}</p>
 </div></section>}
 </div></div>;
}
