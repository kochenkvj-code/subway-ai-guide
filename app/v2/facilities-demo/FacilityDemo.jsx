'use client';
import { useEffect, useState } from 'react';
import {facilityCopy} from './facility-copy';
const TYPES=[
 ['elevator','엘리베이터','↕','이동·접근성'],
 ['toilet','화장실','WC','기본 편의'],
 ['escalator','에스컬레이터','↗','이동·접근성'],
 ['locker','물품보관함','▣','기본 편의'],
 ['nursing','수유실','♡','기본 편의'],
 ['atm','ATM','₩','기본 편의']
];
const present=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
function pick(o,patterns){
 for(const pattern of patterns){const row=Object.entries(o||{}).find(([k,v])=>pattern.test(k)&&present(v)&&typeof v!=='object');if(row)return String(row[1]);}
 return '';
}
function info(row,i,type){
 const name=pick(row,[/fcltNm|faclNm|elvtrNm/i,/시설명|설비명|승강기명/i,/fnstNm|bankNm|금융기관/i,/lckrId|elvtrSn/i])||TYPES.find(t=>t[0]===type)?.[1]+' '+(i+1);
 const location=pick(row,[/dtlPstn|lckrDtlLocNm|bgngFlrDtlPstn/i,/instl.*(pstn|loc|plc)/i,/설치.*위치/i,/lctn|location|position/i,/위치/i]);
 const floor=pick(row,[/^stnFlr$|^bgngFlr$|floor/i,/연결층|운행층/i]);
 const entrance=pick(row,[/^vcntEntrcNo$|^exitNo$/i]);
 const statusValue=pick(row,[/^oprtngSitu$|^operSttus$|^oprtngSttus$/i,/가동상태|운영상태/i]);
 const status=statusValue==='M'?'정상 운행':statusValue==='S'?'운행 중지':statusValue;
 const summary=location||[floor&&floor+'층',entrance&&entrance+'번 출구 인근'].filter(Boolean).join(' · ');
 const hours=pick(row,[/^utztnHr$|^utztnPsbltyHr$/i,/이용시간/i]);
 return {name,location:summary,status,floor,entrance,hours};
}
const css='.out{background:#e9eff6;min-height:100vh;padding:22px 12px;font-family:Arial,"Noto Sans KR",sans-serif;color:#1b304d}.phone{max-width:475px;min-height:calc(100vh - 44px);margin:auto;background:#f7f9fc;border-radius:24px;box-shadow:0 17px 60px #21416a18;overflow:hidden}.nav{display:flex;align-items:center;gap:12px;padding:16px 20px;background:#fff;border-bottom:1px solid #e7edf3}.back{width:36px;height:36px;border:0;border-radius:11px;background:#f0f4fa;font-size:24px;color:#315c8e;cursor:pointer}.navtitle{font-size:15px;font-weight:750;flex:1}.navtitle small{color:#93a0b0;font-weight:400}.station{font-size:10px;color:#577297;background:#eff4fc;padding:8px;border-radius:10px;white-space:nowrap}.station b{background:#2c5c9f;color:white;border-radius:50%;padding:3px 6px}.main{padding:25px 20px 35px;min-height:600px}.eyebrow{font-size:9px;color:#648bb9;letter-spacing:1.5px;font-weight:800}.heading{margin:9px 0;font-size:25px;line-height:1.35;letter-spacing:-1px}.muted{color:#8191a5;font-size:12px;line-height:1.8}.search{width:100%;padding:15px;margin-top:19px;background:white;border:1px solid #e0e8f0;border-radius:13px;font-size:13px;color:#1f3650;box-sizing:border-box}.sec{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:24px 0 12px}.sec strong{font-size:16px}.sec small{font-size:10px;color:#91a0b2}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tile{display:flex;gap:9px;align-items:center;text-align:left;min-width:0;padding:11px 9px;min-height:76px;background:#fff;border:1px solid #e3ebf3;border-radius:15px;cursor:pointer;color:#304960}.tile:focus-visible,.record:focus-visible{outline:3px solid #8eacd3}.sym{display:grid;place-items:center;flex:none;width:33px;height:33px;border-radius:10px;background:#edf3fb;color:#3669a7;font-size:16px;font-weight:800}.tile .copy{flex:1;display:flex;min-width:0;flex-direction:column;gap:6px}.tile strong{font-size:12px;line-height:1.3;word-break:keep-all}.tile small{color:#8a9cae;font-size:10px}.chev{color:#97a6b9;font-size:20px}.more{width:100%;padding:14px;border:0;background:none;color:#4e72a0;font-weight:700;font-size:12px;cursor:pointer}.note{display:flex;gap:9px;padding:15px;margin-top:14px;border-radius:13px;background:#eef3f9;color:#657a94;font-size:11px;line-height:1.7}.note b{color:#365576}.crumb{color:#8293a9;font-size:11px;margin-bottom:16px}.headingrow{display:flex;gap:14px;align-items:center;margin-bottom:20px}.bigicon{width:54px;height:54px;background:#e8f0fb;border-radius:17px;display:grid;place-items:center;font-size:25px;color:#315f9d;flex:none}.headingrow h1{font-size:22px;margin:6px 0;line-height:1.4}.record{width:100%;border:1px solid #e1e8f0;border-radius:15px;background:#fff;display:flex;gap:13px;padding:16px;text-align:left;align-items:center;margin-bottom:9px;cursor:pointer;color:#243b57}.num{padding:10px;border-radius:10px;background:#eef4fc;color:#2c67ae;font-weight:700;font-size:11px}.record .copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}.record strong{font-size:13px}.record small{font-size:11px;color:#70849b;line-height:1.6;overflow-wrap:anywhere}.primary{background:linear-gradient(120deg,#193c5f,#275683);border-radius:17px;padding:20px;color:#fff;margin-bottom:12px}.primary small{color:#bed8f2;font-size:12px}.primary p{font-size:17px;line-height:1.75;font-weight:750;overflow-wrap:anywhere;margin:12px 0 0}.panel{background:#fff;border:1px solid #e3e9f1;border-radius:15px;padding:16px;margin:12px 0}.panel strong{font-size:13px}.panel p{font-size:12px;color:#788a9e;line-height:1.8}.panel button{background:none;border:0;color:#285d9c;font-weight:700;font-size:12px;padding:8px 0;cursor:pointer}.guide{background:#f1f5fa;padding:13px;border-radius:11px;color:#425a75;font-size:12px;line-height:1.9}.rawline{display:grid;grid-template-columns:1fr 1.4fr;gap:8px;border-top:1px solid #edf0f5;padding:11px 0;font-size:11px;line-height:1.7;overflow-wrap:anywhere}.rawline span:first-child{color:#74879e}.empty{text-align:center;padding:26px 15px;background:#fff;border:1px dashed #d7e1ed;border-radius:15px;color:#78899e;font-size:12px;line-height:1.9}.refresh{border:0;background:none;color:#4e72a3;font-size:11px;cursor:pointer}.return{margin-top:20px;padding:14px;width:100%;background:#fff;border:1px solid #d7e2ef;border-radius:12px;color:#315e8f;font-weight:700;font-size:12px;cursor:pointer}.footer{text-align:center;border-top:1px solid #e8edf3;padding:19px;color:#98a9ba;font-size:10px;letter-spacing:1px}@media(max-width:500px){.out{padding:0}.phone{border-radius:0;box-shadow:none;min-height:100dvh}.main{min-height:calc(100dvh - 135px)}}@media(max-width:360px){.main{padding:20px 14px}.tile{gap:6px;padding:10px 6px}.tile strong{font-size:11px}.tile small{font-size:9px}}';
export default function FacilityDemo({embedded=false,stationContext=null,lang='ko',active=true}){
 const t=facilityCopy[lang]||facilityCopy.ko;
 const stationLabel=stationContext?.names[lang]||({ko:'종로5가역',en:'Jongno 5-ga',ja:'チョンノオガ',zh:'钟路五街'})[lang];
 const [type,setType]=useState(null),[index,setIndex]=useState(null),[raw,setRaw]=useState(false),[q,setQ]=useState(''),[data,setData]=useState(null),[loading,setLoading]=useState(true),[nonce,setNonce]=useState(0);
 const load=()=>setNonce(n=>n+1);
 useEffect(()=>{
  if(!active)return;
  const controller=new AbortController();setLoading(true);setData(null);setIndex(null);setRaw(false);
  const query=stationContext?'stationCode='+encodeURIComponent(stationContext.stationCode):'station=종로5가&line=1호선';
  fetch('/api/v2/facilities?'+query,{cache:'no-store',signal:controller.signal}).then(async r=>{
   const result=await r.json();if(!r.ok||!result.ok||(stationContext&&result.stationCode!==stationContext.stationCode))throw Error('unavailable');
   if(!controller.signal.aborted)setData(result);
  }).catch(()=>{if(!controller.signal.aborted)setData({ok:false});}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[stationContext?.stationCode,active,nonce]);
 const categories=data?.ok&&Array.isArray(data.categories)?data.categories:[];
 const rows=categories.find(c=>c.id===type)?.items||[];
 const picked=TYPES.find(x=>x[0]===type);
 const row=index===null?null:rows[index];
 const describe=(r,i)=>{const s=info(r,i,type);if(!pick(r,[/fcltNm|faclNm|elvtrNm/i,/시설명|설비명|승강기명/i,/fnstNm|bankNm|금융기관/i,/lckrId|elvtrSn/i]))s.name=t.types[type]+' '+(i+1);return s;};
 const summary=row?describe(row,index):null;
 function back(){if(index!==null){setIndex(null);setRaw(false);}else setType(null);}
 const visible=TYPES.filter(x=>categories.some(c=>c.id===x[0])&&(!q||[x[1],t.types[x[0]]].some(n=>n.toLowerCase().includes(q.toLowerCase()))));
 return <div className="v2-facility-scope"><div className={embedded?'out v2-facilities-embedded':'out'}><style>{css.replace(/(^|[{}])([^@{}][^{}]*)\{/g,(_,prefix,selectors)=>prefix+selectors.split(',').map(selector=>'.v2-facility-scope '+selector).join(',')+'{')}</style><div className="phone">
  {!embedded&&<header className="nav"><button className="back" aria-label={t.back} onClick={()=>type?back():window.location.assign('/v2')}>‹</button><div className="navtitle">{t.title}</div></header>}
  <main className="main">
  <div className="station" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:14,marginBottom:12}}><b style={{background:stationContext?.color}}>{stationContext?.line||'1'}</b>{stationLabel}</div>
  {!type?<><div className="eyebrow">STATION FACILITIES</div><h1 className="heading">{t.heading}</h1><p className="muted">{t.intro}</p>
   <input className="search" value={q} onChange={e=>setQ(e.target.value)} placeholder={t.search} aria-label={t.search}/>
   <div className="sec"><strong>{t.available}</strong><small>{t.source}</small></div>
   {loading?<div className="empty" role="status">{t.loading}</div>:!data?.ok?<div className="empty" role="alert">{t.failed}<br/><button className="refresh" onClick={load}>{t.retry}</button></div>:visible.length===0?<div className="empty">{q?t.noMatch:t.empty}</div>:<div className="grid">{visible.map(x=>{const item=categories.find(c=>c.id===x[0]);return <button className="tile" key={x[0]} onClick={()=>{setType(x[0]);setIndex(null);setRaw(false);}}><span className="sym">{x[2]}</span><span className="copy"><strong>{t.types[x[0]]}</strong><small>{item.count} · {t.records}</small></span><span className="chev">›</span></button>})}</div>}
   {data?.partial&&<div className="note" role="status">ⓘ {t.partial}</div>}
   <div className="note">ⓘ {t.note}</div>
  </>:index!==null&&row?<><div className="crumb">{t.types[type]} › {t.details}</div><div className="headingrow"><div className="bigicon">{picked[2]}</div><h1>{summary.name}</h1></div>
   <section className="primary"><small>⌖ {t.location}</small><p>{summary.location||t.noLocation}</p></section>
   {summary.status&&<section className="panel"><strong>{t.status}</strong><p>{summary.status}</p></section>}
   {summary.hours&&<section className="panel"><strong>{t.hours}</strong><p>{summary.hours}</p></section>}
   <p className="muted">{t.original}</p>
   <section className="panel"><button aria-expanded={raw} onClick={()=>setRaw(!raw)}>{t.raw} {raw?'−':'＋'}</button>{raw&&Object.entries(row).map(([k,v])=><div key={k} className="rawline"><span>{k}</span><span>{v===null?'—':typeof v==='object'?JSON.stringify(v):String(v)}</span></div>)}</section>
   <button className="return" onClick={back}>{t.back}</button>
  </>:<><div className="headingrow"><div className="bigicon">{picked?.[2]}</div><h1>{t.types[type]}</h1></div>
   <div className="sec"><strong>{t.location} · {rows.length}</strong><button className="refresh" onClick={load} disabled={loading}>{t.retry}</button></div>
   {loading?<div className="empty" role="status">{t.loading}</div>:!data?.ok?<div className="empty" role="alert">{t.failed}</div>:rows.length===0?<div className="empty">{t.empty}</div>:rows.map((r,i)=>{const s=describe(r,i);return <button className="record" key={i} onClick={()=>setIndex(i)}><span className="num">{String(i+1).padStart(2,'0')}</span><span className="copy"><strong>{s.name}</strong><small>{s.location||t.details}</small>{s.status&&<small>{s.status}</small>}</span><span className="chev">›</span></button>})}
   <p className="muted">{t.source} · {stationLabel} · {t.types[type]}</p>
   <button className="return" onClick={back}>{t.other}</button>
  </>}
  </main>{!embedded&&<footer className="footer">SUBWAY AI GUIDE</footer>}</div></div></div>;
}
