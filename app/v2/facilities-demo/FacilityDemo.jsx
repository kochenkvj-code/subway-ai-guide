'use client';
import { useEffect, useState } from 'react';
import {facilityCopy} from './facility-copy';
const TYPES=[
 ['toilet','화장실','WC','기본 편의'],
 ['elevator','엘리베이터','↕','이동·접근성'],
 ['locker','물품보관함','▣','기본 편의'],
 ['escalator','에스컬레이터','↗','이동·접근성'],
 ['nursing','수유실','♡','기본 편의'],
 ['atm','ATM','₩','기본 편의']
];
const STATUS={
 ko:{M:'사용 가능',D:'삭제된 설비',S:'보수 중',T:'운행 중지',I:'점검 중',B:'공사 중'},
 en:{M:'Available',D:'Removed',S:'Under maintenance',T:'Out of service',I:'Under inspection',B:'Construction'},
 ja:{M:'利用可能',D:'撤去済み',S:'修理中',T:'運転停止',I:'点検中',B:'工事中'},
 zh:{M:'可使用',D:'已撤除',S:'维修中',T:'暂停运行',I:'检查中',B:'施工中'}
};
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
 const status=({M:'사용 가능',D:'삭제된 설비',S:'보수 중',T:'운행 중지',I:'점검 중',B:'공사 중'})[statusValue]||statusValue;
 const summary=location||[floor&&floor+'층',entrance&&entrance+'번 출구 인근'].filter(Boolean).join(' · ');
 const hours=pick(row,[/^utztnHr$|^utztnPsbltyHr$/i,/이용시간/i]);
 const endFloor=pick(row,[/^endFlr$/i,/종료층/i]);
 const floorConnection=floor&&endFloor&&floor!==endFloor?floor+' ↔ '+endFloor:'';
 const gate=pick(row,[/^gateInoutSe$/i,/개찰내외|게이트내외/i]);
 const method=pick(row,[/^nrsrmUtztnMth$/i,/이용방식/i]);
 const stroller=pick(row,[/^stllAcsYn$/i]);
 return {name,location:summary,status,floor,entrance,hours,floorConnection,gate,method,stroller};
}
const css="\n.v2-facility-scope{width:100%;height:100%;min-height:0;overflow-y:auto;background:#f4f7f9;color:#1b3445;-webkit-overflow-scrolling:touch}\n.v2-facility-scope *{box-sizing:border-box}\n.v2-facility-scope .sf-page{max-width:650px;margin:0 auto;padding:18px 14px 38px}\n.v2-facility-scope .sf-station-row{display:flex;align-items:center;justify-content:space-between;gap:10px}\n.v2-facility-scope .sf-station{display:inline-flex;align-items:center;gap:7px;min-width:0;padding:6px 9px 6px 6px;background:#eaf0f5;color:#3b596e;border:1px solid #dce7ee;border-radius:10px;font-size:12px;font-weight:800}\n.v2-facility-scope .sf-line{display:grid;place-items:center;background:#1954a1;color:white;min-width:23px;height:23px;border-radius:50%;font-size:11px}\n.v2-facility-scope .sf-refresh{background:none;border:0;color:#52748b;font-size:11px;padding:7px 3px;font-weight:800}\n.v2-facility-scope .sf-eyebrow{display:block;margin-top:22px;font-size:10px;font-weight:900;letter-spacing:1.3px;color:#278b77}\n.v2-facility-scope h2{margin:6px 0 5px;font-size:24px;line-height:1.35;letter-spacing:-.9px;color:#1a3344}\n.v2-facility-scope .sf-intro{font-size:12px;color:#708391;line-height:1.65;margin:0 0 18px}\n.v2-facility-scope .sf-search{display:flex;align-items:center;gap:9px;background:white;padding:0 13px;border-radius:12px;border:1px solid #dce6ea;min-height:47px;box-shadow:0 3px 12px #1c4b5b08}\n.v2-facility-scope .sf-search-icon{font-size:18px;color:#7194a2}\n.v2-facility-scope .sf-search input{flex:1;min-width:0;height:45px;outline:none;background:transparent;border:0;font-size:13px;color:#254656}\n.v2-facility-scope .sf-search input:focus-visible{outline:none}\n.v2-facility-scope .sf-search:focus-within{outline:2px solid #7fb8a8;outline-offset:1px}\n.v2-facility-scope .sf-clear{border:0;background:transparent;color:#698390;font-size:19px;min-width:31px;min-height:35px}\n.v2-facility-scope .sf-filter-scroll{display:flex;gap:7px;overflow-x:auto;padding:12px 1px 7px;margin-bottom:10px;scrollbar-width:none;-webkit-overflow-scrolling:touch}\n.v2-facility-scope .sf-filter-scroll::-webkit-scrollbar{display:none}\n.v2-facility-scope .sf-filter{flex-shrink:0;display:flex;gap:5px;align-items:center;justify-content:center;white-space:nowrap;padding:9px 11px;min-height:38px;border:1px solid #dce5e9;border-radius:999px;background:white;color:#5d7583;font-size:11px;font-weight:800}\n.v2-facility-scope .sf-filter[aria-pressed=\"true\"]{background:#174b53;color:#fff;border-color:#174b53}\n.v2-facility-scope .sf-filter small{font-size:10px;opacity:.68;font-weight:750}\n.v2-facility-scope .sf-count{display:flex;justify-content:space-between;gap:10px;align-items:center;margin:8px 2px 15px;color:#69818d;font-size:11px}\n.v2-facility-scope .sf-count strong{font-size:12px;color:#24485b}\n.v2-facility-scope .sf-category{margin:0 0 13px;background:white;border:1px solid #e0e9eb;border-radius:16px;overflow:hidden;box-shadow:0 3px 15px rgba(36,69,79,.028)}\n.v2-facility-scope .sf-category-head{display:flex;align-items:center;gap:10px;padding:14px;border-bottom:1px solid #edf1f2}\n.v2-facility-scope .sf-icon{display:grid;place-items:center;flex:0 0 36px;height:36px;border-radius:11px;background:#e8f3f0;color:#13866d;font-size:15px;font-weight:900}\n.v2-facility-scope .sf-category-head h3{font-size:15px;color:#1e4051;line-height:1.3;margin:0}\n.v2-facility-scope .sf-category-head small{display:block;color:#82949e;font-size:10px;margin-top:3px}\n.v2-facility-scope .sf-category-head .sf-num{margin-left:auto;padding:5px 8px;background:#f3f6f8;color:#718a94;font-size:11px;border-radius:8px}\n.v2-facility-scope .sf-record{padding:14px;border-bottom:1px solid #eff3f4}\n.v2-facility-scope .sf-record:last-child{border-bottom:0}\n.v2-facility-scope .sf-record-top{display:flex;align-items:baseline;gap:9px}\n.v2-facility-scope .sf-index{flex-shrink:0;color:#9aaeb5;font-weight:850;font-size:10px}\n.v2-facility-scope .sf-record h4{margin:0;font-size:13px;font-weight:850;line-height:1.5;color:#234355;overflow-wrap:anywhere}\n.v2-facility-scope .sf-location{display:flex;align-items:flex-start;gap:7px;margin:8px 0 0 20px}\n.v2-facility-scope .sf-location-icon{color:#0d9875;font-weight:900;font-size:17px;line-height:1.35}\n.v2-facility-scope .sf-location-text{flex:1;min-width:0}\n.v2-facility-scope .sf-location-text small{display:block;color:#8298a2;font-size:10px;margin-bottom:2px}\n.v2-facility-scope .sf-location-text strong{font-size:13px;color:#0b7460;font-weight:850;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}\n.v2-facility-scope .sf-location-text .sf-missing{font-size:12px;font-weight:650;color:#8599a2}\n.v2-facility-scope .sf-meta{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0 0 20px}\n.v2-facility-scope .sf-tag{display:inline-flex;align-items:center;max-width:100%;padding:5px 7px;border-radius:6px;background:#f0f4f7;color:#597484;font-size:10px;line-height:1.5;overflow-wrap:anywhere}\n.v2-facility-scope .sf-tag.status-good{background:#e5f5ec;color:#168263;font-weight:800}\n.v2-facility-scope .sf-tag.status-warn{background:#fff0e9;color:#ad5d34;font-weight:800}\n.v2-facility-scope .sf-more{display:block;width:100%;border:0;background:#f9fbfc;color:#246c79;min-height:43px;font-size:12px;font-weight:800}\n.v2-facility-scope .sf-alert,.v2-facility-scope .sf-empty{padding:19px 15px;border:1px solid #d9e4e8;border-radius:13px;background:#fff;color:#5e7886;font-size:12px;line-height:1.8}\n.v2-facility-scope .sf-empty{margin:15px 0;text-align:center}\n.v2-facility-scope .sf-alert{background:#f0f6f8;margin:10px 0}\n.v2-facility-scope .sf-alert button{background:transparent;border:0;font-weight:850;color:#18788a;padding:7px}\n.v2-facility-scope .sf-footer{margin:19px 1px 0;color:#889da8;font-size:10px;line-height:1.8}\n.v2-facility-scope button:focus-visible{outline:3px solid #79b49f;outline-offset:2px}\n@media(max-width:360px){.v2-facility-scope .sf-page{padding:14px 10px 32px}.v2-facility-scope .sf-category-head{padding:12px}.v2-facility-scope .sf-record{padding:12px}.v2-facility-scope h2{font-size:21px}}\n";
export default function FacilityDemo({embedded=false,stationContext=null,lang='ko',active=true}){
 const t=facilityCopy[lang]||facilityCopy.ko;
 const stationLabel=stationContext?.names?.[lang]||stationContext?.names?.ko||({ko:'종로5가역',en:'Jongno 5-ga',ja:'チョンノオガ',zh:'钟路五街'})[lang];
 const [filter,setFilter]=useState('all'),[expanded,setExpanded]=useState({}),[q,setQ]=useState('');
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[nonce,setNonce]=useState(0);
 const reload=()=>setNonce(n=>n+1);
 useEffect(()=>{
  if(!active)return;
  const controller=new AbortController();
  setLoading(true);setData(null);setFilter('all');setExpanded({});setQ('');
  const query=stationContext?'stationCode='+encodeURIComponent(stationContext.stationCode):'station=종로5가&line=1호선';
  fetch('/api/v2/facilities?'+query,{cache:'no-store',signal:controller.signal}).then(async r=>{
   const result=await r.json();
   if(!r.ok||!result.ok||(stationContext&&result.stationCode!==stationContext.stationCode))throw Error('UNAVAILABLE');
   if(!controller.signal.aborted)setData(result);
  }).catch(()=>{if(!controller.signal.aborted)setData({ok:false});}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[stationContext?.stationCode,active,nonce]);
 const describe=(row,index,id)=>{
  const result=info(row,index,id);
  if(!pick(row,[/fcltNm|faclNm|elvtrNm/i,/시설명|설비명|승강기명/i,/fnstNm|bankNm|금융기관/i,/lckrId|elvtrSn/i]))result.name=t.types[id]+' '+(index+1);
  const code=pick(row,[/^oprtngSitu$|^operSttus$|^oprtngSttus$/i]);
  if(code&&STATUS[lang]?.[code])result.status=STATUS[lang][code];
  return result;
 };
 const available=TYPES.map(([id,koreanName,icon])=>{
  const category=data?.ok&&data.categories?.find(x=>x.id===id);
  return {id,icon,koreanName,label:t.types[id],items:(category?.items||[]).filter(row=>pick(row,[/^oprtngSitu$|^operSttus$|^oprtngSttus$/i])!=='D')};
 }).filter(category=>category.items.length>0);
 const total=available.reduce((n,category)=>n+category.items.length,0);
 const keyword=q.trim().toLocaleLowerCase();
 const shown=available.filter(cat=>filter==='all'||cat.id===filter).map(cat=>{
  const categoryMatched=!keyword||cat.label.toLocaleLowerCase().includes(keyword)||cat.koreanName.includes(keyword);
  const items=cat.items.map((row,index)=>({row,index,summary:describe(row,index,cat.id)})).filter(({row,summary})=>{
   if(categoryMatched)return true;
   return [summary.name,summary.location,summary.floor,summary.entrance,summary.hours,summary.status,
     summary.floorConnection,summary.gate,summary.method,summary.stroller,...Object.values(row).filter(v=>typeof v==='string'||typeof v==='number')]
    .some(v=>String(v||'').toLocaleLowerCase().includes(keyword));
  });
  return {...cat,items};
 }).filter(cat=>cat.items.length>0);
 const shownTotal=shown.reduce((n,category)=>n+category.items.length,0);
 return <div className="v2-facility-scope"><style>{css}</style><main className="sf-page">
  <div className="sf-station-row"><div className="sf-station"><span className="sf-line" style={{background:stationContext?.color||'#1954a1'}}>{stationContext?.line||'1'}</span><span>{stationLabel}</span></div><button className="sf-refresh" type="button" onClick={reload} disabled={loading}>↻ {t.retry}</button></div>
  <span className="sf-eyebrow">STATION FACILITIES</span>
  <h2>{t.oneScreenTitle}</h2>
  <p className="sf-intro">{t.oneScreenIntro}</p>
  <label className="sf-search"><span className="sf-search-icon" aria-hidden="true">⌕</span><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder={t.search} aria-label={t.search}/>{q&&<button className="sf-clear" type="button" onClick={()=>setQ('')} aria-label={t.clear}>×</button>}</label>
  {!loading&&data?.ok&&available.length>0&&<nav className="sf-filter-scroll" aria-label={t.facilityTypes}>
    <button className="sf-filter" type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>{t.all} <small>{total}</small></button>
    {available.map(cat=><button key={cat.id} className="sf-filter" type="button" aria-pressed={filter===cat.id} onClick={()=>setFilter(filter===cat.id?'all':cat.id)}>{cat.label}<small>{cat.items.length}</small></button>)}
  </nav>}
  {loading?<div className="sf-empty" role="status">{t.loading}</div>
   :!data?.ok?<div className="sf-alert" role="alert">{t.failed}<button type="button" onClick={reload}>{t.retry}</button></div>
   :available.length===0?<div className="sf-empty">{t.empty}</div>
   :<><div className="sf-count"><strong>{keyword||filter!=='all'?t.filtered+' '+shownTotal:t.available+' '+total} {t.records}</strong><span>{t.atAGlance}</span></div>
    {shown.length===0?<div className="sf-empty">{t.noMatch}</div>:shown.map(cat=>{
     const showEverything=Boolean(keyword||filter===cat.id||expanded[cat.id]);
     const visibleItems=showEverything?cat.items:cat.items.slice(0,3);
     const moreCount=cat.items.length-visibleItems.length;
     return <section className="sf-category" key={cat.id} aria-label={cat.label}>
      <header className="sf-category-head"><span className="sf-icon" aria-hidden="true">{cat.icon}</span><div><h3>{cat.label}</h3><small>{t.locationAtFirst}</small></div><span className="sf-num">{cat.items.length} {t.records}</span></header>
      <div className="sf-records">{visibleItems.map(({row,index,summary:s})=>{
       const state=pick(row,[/^oprtngSitu$|^operSttus$|^oprtngSttus$/i]);
       return <article className="sf-record" key={cat.id+'-'+index}>
        <div className="sf-record-top"><span className="sf-index">{String(index+1).padStart(2,'0')}</span><h4>{s.name}</h4></div>
        <div className="sf-location"><span className="sf-location-icon" aria-hidden="true">⌖</span><div className="sf-location-text"><small>{t.location}</small><strong className={s.location?'':'sf-missing'}>{s.location||t.noLocation}</strong></div></div>
        {(s.entrance||s.floor||s.floorConnection||s.status||s.hours||s.method||s.gate||s.stroller)&&<div className="sf-meta">
         {s.entrance&&<span className="sf-tag">{t.exitLabel}: {s.entrance}</span>}
         {s.floorConnection?<span className="sf-tag">{t.connectedFloors}: {s.floorConnection}</span>:s.floor&&<span className="sf-tag">{t.floorLabel}: {s.floor}</span>}
         {s.status&&<span className={'sf-tag'+(state==='M'?' status-good':state&&state!=='M'?' status-warn':'')}>{t.status}: {s.status}</span>}
         {s.hours&&<span className="sf-tag">{t.hours}: {s.hours}</span>}
         {s.method&&<span className="sf-tag">{t.usageMethod}: {s.method}</span>}
         {['Y','N'].includes(s.stroller)&&<span className="sf-tag">{t.stroller}: {s.stroller==='Y'?t.yes:t.no}</span>}
         {s.gate&&!/^[0-9A-Z]$/.test(s.gate)&&<span className="sf-tag">{t.gate}: {s.gate}</span>}
        </div>}
       </article>;
      })}</div>
      {moreCount>0&&<button className="sf-more" type="button" onClick={()=>setExpanded(prev=>({...prev,[cat.id]:true}))}>{t.showMore} +{moreCount} ↓</button>}
      {!keyword&&filter==='all'&&expanded[cat.id]&&cat.items.length>3&&<button className="sf-more" type="button" onClick={()=>setExpanded(prev=>({...prev,[cat.id]:false}))}>{t.showLess} ↑</button>}
     </section>;
    })}
   </>}
  {data?.partial&&<div className="sf-alert" role="status">ⓘ {t.partial}</div>}
  <div className="sf-footer">{t.source} · {t.note}</div>
 </main></div>;
}
