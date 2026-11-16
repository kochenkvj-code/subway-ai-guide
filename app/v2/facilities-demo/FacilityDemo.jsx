'use client';
import { useEffect, useRef, useState } from 'react';
import {recordStat} from '../../lib/record-stat';
import {facilityContext} from '../../lib/facility-stat';
import {facilityCopy} from './facility-copy';
import {translateFacilityText} from '../../lib/facility-i18n';
import FacilityIcon from './FacilityIcon';
import StationMapViewer from './StationMapViewer';
import './facility-guide.css';
const officeResponses=new Map();
const officeResponseTtl=10*60*1000;
const TYPES=[
 ['toilet','화장실','WC','기본 편의'],
 ['elevator','엘리베이터','↕','이동·접근성'],
 ['customerOffice','고객안전실','ⓘ','고객 안내'],
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
 const floorConnection=floor&&endFloor&&floor!==endFloor?floor+' ↔ '+(/^[0-9]+$/.test(endFloor)?endFloor+'F':endFloor):'';
 const gate=pick(row,[/^gateInoutSe$/i,/개찰내외|게이트내외/i]);
 const method=pick(row,[/^nrsrmUtztnMth$/i,/이용방식/i]);
 const stroller=pick(row,[/^stllAcsYn$/i]);
 return {name,location:summary,status,floor,entrance,hours,floorConnection,gate,method,stroller};
}
export default function FacilityDemo({embedded=false,stationContext=null,lang='ko',active=true,trackUsage=true}){
 const t=facilityCopy[lang]||facilityCopy.ko;
 const stationLabel=stationContext?.names?.[lang]||stationContext?.names?.ko||({ko:'종로5가역',en:'Jongno 5-ga',ja:'チョンノオガ',zh:'钟路五街'})[lang];
 const [filter,setFilter]=useState('all'),[tab,setTab]=useState('facilities');
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[nonce,setNonce]=useState(0);
 const [office,setOffice]=useState(null),[officeLoading,setOfficeLoading]=useState(false);
 const scopeRef=useRef(null);
 const chooseFilter=id=>{setFilter(id);scopeRef.current?.scrollTo({top:0,behavior:'auto'});};
 const reload=()=>setNonce(n=>n+1);
 useEffect(()=>{
  if(!active)return;
  const controller=new AbortController();
  setLoading(true);setData(null);setFilter('all');setTab('facilities');
  const query=stationContext?'stationCode='+encodeURIComponent(stationContext.stationCode):'station=종로5가&line=1호선';
  fetch('/api/v2/facilities?'+query,{cache:'no-store',signal:controller.signal}).then(async r=>{
   const result=await r.json();
   if(!r.ok||!result.ok||(stationContext&&result.stationCode!==stationContext.stationCode))throw Error('UNAVAILABLE');
   if(!controller.signal.aborted)setData(result);
  }).catch(()=>{if(!controller.signal.aborted)setData({ok:false});}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[stationContext?.stationCode,active,nonce]);
 useEffect(()=>{
  if(!active)return;
  const code=stationContext?.stationCode||'0154';
  if(stationContext?.line==='9'||code==='2810'){setOffice(null);setOfficeLoading(false);return;}
  const saved=officeResponses.get(code),cached=saved&&Date.now()-saved.at<officeResponseTtl?saved.data:null;
  setOffice(cached);setOfficeLoading(!cached);
  if(cached&&nonce===0)return;
  const controller=new AbortController();
  fetch('/api/v2/station-office?stationCode='+encodeURIComponent(code),{signal:controller.signal})
   .then(async response=>{
    const result=await response.json();if(!response.ok||!result.ok||result.stationCode!==code)throw Error('OFFICE_UNAVAILABLE');
    if(!controller.signal.aborted){
     if(result.category?.items?.length){officeResponses.set(code,{at:Date.now(),data:result});if(officeResponses.size>300)officeResponses.delete(officeResponses.keys().next().value);}
     setOffice(result);
    }
   })
   .catch(()=>{if(!controller.signal.aborted&&!cached)setOffice({status:'unavailable'});})
   .finally(()=>{if(!controller.signal.aborted)setOfficeLoading(false);});
  return()=>controller.abort();
 },[stationContext?.stationCode,active,nonce]);
 const describe=(row,index,id)=>{
  const result=info(row,index,id);
  result.originalName=result.name;
  const lockerName=pick(row,[/^lckrNm$/i]);
  const lockerNumbers=lockerName.match(/\((\d+\s*~\s*\d+)\)/);
  if(id==='locker'&&lockerNumbers)result.name=t.types[id]+' · '+lockerNumbers[1];
  else if(['elevator','escalator'].includes(id))result.name=t.types[id]+' '+String(index+1).padStart(2,'0');
  else result.name=t.types[id];
  const code=pick(row,[/^oprtngSitu$|^operSttus$|^oprtngSttus$/i]);
  if(code&&STATUS[lang]?.[code])result.status=STATUS[lang][code];
  const gate=pick(row,[/^gateInoutSe$/i]);
  result.gateLabel=gate==='외부'?t.outsideGate:gate==='내부'?t.insideGate:'';
  result.wheelchair=pick(row,[/^whlchrAcsPsbltyYn$/i])==='Y'?t.wheelchair:'';
  result.restroomInfo=pick(row,[/^rstrmInfo$/i]);
  const count=Number(pick(row,[/^lckrCnt$/i]));
  result.lockerCount=id==='locker'&&Number.isInteger(count)&&count>0?count+' '+t.lockerUnits:'';
  result.entrance=/^\d+(?:\s*[,~\-]\s*\d+)*$/.test(result.entrance)?result.entrance:'';
  const timeText=value=>/^\d{6}$/.test(String(value))?String(value).slice(0,2)+':'+String(value).slice(2,4):'';
  if(id==='locker'){
    const from=timeText(pick(row,[/^wkdayOperBgngTm$/i])),to=timeText(pick(row,[/^wkdayOperEndTm$/i]));
    if(from&&to)result.hours=t.weekday+' '+from+'–'+to;
    result.phone=pick(row,[/^custCntrTelno$/i]).replace(/\D/g,'');
  }
  result.provider=id==='atm'?pick(row,[/^fnstNm$/i]):'';
  if(id==='customerOffice')result.phone=pick(row,[/^operInstTelno$/i]).replace(/\D/g,'');
  result.originalLocation=result.location;
  for(const field of ['location','floor','floorConnection','hours','method','restroomInfo','provider','status']){
   const translated=translateFacilityText(result[field],lang,field);
   result[field]=translated.untranslated?t.untranslated+': '+translated.original:translated.text;
  }
  return result;
 };
 const available=TYPES.map(([id,koreanName,icon])=>{
  const category=id==='customerOffice'?office?.category:data?.ok&&data.categories?.find(x=>x.id===id);
  return {id,icon,koreanName,label:t.types[id],items:(category?.items||[]).filter(row=>pick(row,[/^oprtngSitu$|^operSttus$|^oprtngSttus$/i])!=='D')};
 }).filter(category=>category.items.length>0);
 const total=available.reduce((n,category)=>n+category.items.length,0);
 const shown=available.filter(cat=>filter==='all'||cat.id===filter).map(cat=>({
  ...cat,items:cat.items.map((row,index)=>({row,index,summary:describe(row,index,cat.id)}))
 })).filter(cat=>cat.items.length>0);
 const stationBadge=<span className="sf-context-station" title={stationLabel}><b style={{background:stationContext?.color||'#1954a1'}}>{stationContext?.line||'1'}</b><span>{stationLabel}</span></span>;
 const tabs={ko:['시설 찾기','역 이용안내도'],en:['Find facilities','Station map'],ja:['施設を探す','駅構内案内図'],zh:['查找设施','车站导览图']}[lang]||['시설 찾기','역 이용안내도'];
 return <div ref={scopeRef} className={"v2-facility-scope"+(embedded?" sf-compact":"")}><main className="sf-page">
  <div className="sf-compact-intro"><div className="sf-context-heading"><h2>{t.oneScreenTitle}</h2>{stationBadge}</div></div>
  <nav className="sf-view-tabs" role="tablist" aria-label={t.title}>
   <button type="button" role="tab" aria-selected={tab==='facilities'} onClick={()=>setTab('facilities')}>{tabs[0]}</button>
   <button type="button" role="tab" aria-selected={tab==='map'} onClick={()=>setTab('map')}>{tabs[1]}</button>
  </nav>
  {tab==='map'?<StationMapViewer stationContext={stationContext} lang={lang}/>:<>
  {(embedded||(!loading&&(data?.ok||office?.category)&&available.length>0))&&<nav className="sf-filter-scroll" aria-label={t.facilityTypes}>
    <div className="sf-filters">
    {!loading&&(data?.ok||office?.category)&&available.length>0&&<>
    <button className="sf-filter" type="button" aria-pressed={filter==='all'} onClick={()=>chooseFilter('all')}>{t.all} <small>{total}</small></button>
    {available.map(cat=><button key={cat.id} className="sf-filter" type="button" aria-pressed={filter===cat.id} onClick={()=>{if(trackUsage&&filter!==cat.id)recordStat('quick_menu','facility',lang,facilityContext(cat.id));chooseFilter(filter===cat.id?'all':cat.id);}}>{cat.label}<small>{cat.items.length}</small></button>)}
    </>}
    </div>
  </nav>}
  {officeLoading&&<p className="sf-count" role="status">{t.types.customerOffice} · {t.loading}</p>}
  {office?.status==='missing'&&<p className="sf-alert" role="status">{t.types.customerOffice} · {t.officeMissing}</p>}
  {office?.status==='unavailable'&&<p className="sf-alert" role="status">{t.types.customerOffice} · {t.failed}</p>}
  {loading?<div className="sf-empty" role="status">{t.loading}</div>
   :!data?.ok&&!office?.category?<div className="sf-alert" role="alert">{t.failed}<button type="button" onClick={reload}>{t.retry}</button></div>
   :available.length===0?<div className="sf-empty">{t.empty}</div>
   :<>
    {shown.length===0?<div className="sf-empty">{t.noMatch}</div>:<div className="sf-categories">{shown.map(cat=>{
     return <section className="sf-category" key={cat.id} aria-label={cat.label}>
      <header className="sf-category-head"><span className="sf-icon"><FacilityIcon name={cat.id}/></span><h3>{cat.label}</h3><span className="sf-num">{cat.items.length}{t.records}</span></header>
      <div className="sf-records">{cat.items.map(({row,index,summary:s})=>{
       const state=pick(row,[/^oprtngSitu$|^operSttus$|^oprtngSttus$/i]);
       const identifier=s.name===cat.label?'':cat.id==='locker'?s.name.split('·').slice(1).join('·').trim():s.name.match(/\d+$/)?.[0]||s.name;
       return <article className="sf-record" key={cat.id+'-'+index} title={s.originalName} aria-label={s.name}>
        <div className="sf-location">
         {identifier&&<span className="sf-record-name" aria-label={s.name}>{identifier}</span>}
         <div className="sf-location-text"><h4 title={s.originalLocation} className={s.location?'':'sf-missing'}>{s.location||t.noLocation}</h4></div>
        </div>
        {(s.entrance||s.floor||s.floorConnection||s.hours||s.method||s.gateLabel||s.stroller||s.wheelchair||s.restroomInfo||s.lockerCount||s.provider||s.status||s.phone)&&<div className="sf-meta">
         {s.floorConnection?<span className="sf-tag sf-tag-strong">{t.connectedFloors} {s.floorConnection}</span>:s.floor&&<span className="sf-tag sf-tag-strong">{s.floor}</span>}
         {s.entrance&&<span className="sf-tag">{lang==='en'?'Exit '+s.entrance:s.entrance+t.exitSuffix}</span>}
         {s.gateLabel&&<span className="sf-tag">{s.gateLabel}</span>}
         {s.wheelchair&&<span className="sf-tag sf-tag-accessible"><FacilityIcon name="accessible"/>{s.wheelchair}</span>}
         {s.status&&<span className={'sf-tag sf-status'+(state==='M'?' status-good':state?' status-warn':'')}>{state==='M'&&<FacilityIcon name="check"/>}{s.status}</span>}
         {s.lockerCount&&<span className="sf-tag">{s.lockerCount}</span>}
         {s.hours&&<span className="sf-tag"><FacilityIcon name="clock"/>{t.hours} · {s.hours}</span>}
         {s.restroomInfo&&<span className="sf-tag sf-tag-restroom">{s.restroomInfo}</span>}
         {s.method&&<span className="sf-tag">{t.usageMethod} · {s.method}</span>}
         {['Y','N'].includes(s.stroller)&&<span className="sf-tag">{t.stroller} · {s.stroller==='Y'?t.yes:t.no}</span>}
         {s.provider&&<span className="sf-tag">{s.provider}</span>}
         {s.phone&&<a className="sf-contact" href={'tel:'+s.phone} aria-label={(cat.id==='customerOffice'?t.officePhone:t.helpPhone)+' '+s.phone}><FacilityIcon name="phone"/><span>{cat.id==='customerOffice'?t.officePhone:t.helpPhone}</span><span>{s.phone.replace(/^(02)(\d{3,4})(\d{4})$/, '$1-$2-$3').replace(/^(\d{4})(\d{4})$/, '$1-$2')}</span><FacilityIcon name="arrow"/></a>}
        </div>}
       </article>;
      })}</div>
     </section>;
    })}</div>}
   </>}
  {data?.partial&&<div className="sf-alert" role="status">ⓘ {t.partial}</div>}
  </>}
 </main></div>;
}
