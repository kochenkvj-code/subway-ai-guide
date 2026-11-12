'use client';
import { useEffect, useState } from 'react';
import {recordStat} from '../../lib/record-stat';
import {facilityContext} from '../../lib/facility-stat';
import {facilityCopy} from './facility-copy';
import {translateFacilityText} from '../../lib/facility-i18n';
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
 const floorConnection=floor&&endFloor&&floor!==endFloor?floor+' ↔ '+(/^[0-9]+$/.test(endFloor)?endFloor+'F':endFloor):'';
 const gate=pick(row,[/^gateInoutSe$/i,/개찰내외|게이트내외/i]);
 const method=pick(row,[/^nrsrmUtztnMth$/i,/이용방식/i]);
 const stroller=pick(row,[/^stllAcsYn$/i]);
 return {name,location:summary,status,floor,entrance,hours,floorConnection,gate,method,stroller};
}
const css="\n.v2-facility-scope{width:100%;height:100%;min-height:0;overflow-y:auto;background:#f4f7f9;color:#1b3445;-webkit-overflow-scrolling:touch}\n.v2-facility-scope *{box-sizing:border-box}\n.v2-facility-scope .sf-page{max-width:650px;margin:0 auto;padding:18px 14px 38px}\n.v2-facility-scope .sf-station-row{display:flex;align-items:center;justify-content:space-between;gap:10px}\n.v2-facility-scope .sf-station{display:inline-flex;align-items:center;gap:7px;min-width:0;padding:6px 9px 6px 6px;background:#eaf0f5;color:#3b596e;border:1px solid #dce7ee;border-radius:10px;font-size:12px;font-weight:800}\n.v2-facility-scope .sf-line{display:grid;place-items:center;background:#1954a1;color:white;min-width:23px;height:23px;border-radius:50%;font-size:11px}\n.v2-facility-scope .sf-refresh{background:none;border:0;color:#52748b;font-size:11px;padding:7px 3px;font-weight:800}\n.v2-facility-scope .sf-eyebrow{display:block;margin-top:22px;font-size:10px;font-weight:900;letter-spacing:1.3px;color:#278b77}\n.v2-facility-scope h2{margin:6px 0 5px;font-size:24px;line-height:1.35;letter-spacing:-.9px;color:#1a3344}\n.v2-facility-scope .sf-intro{font-size:12px;color:#708391;line-height:1.65;margin:0 0 18px}\n.v2-facility-scope .sf-search{display:flex;align-items:center;gap:9px;background:white;padding:0 13px;border-radius:12px;border:1px solid #dce6ea;min-height:47px;box-shadow:0 3px 12px #1c4b5b08}\n.v2-facility-scope .sf-search-icon{font-size:18px;color:#7194a2}\n.v2-facility-scope .sf-search input{flex:1;min-width:0;height:45px;outline:none;background:transparent;border:0;font-size:13px;color:#254656}\n.v2-facility-scope .sf-search input:focus-visible{outline:none}\n.v2-facility-scope .sf-search:focus-within{outline:2px solid #7fb8a8;outline-offset:1px}\n.v2-facility-scope .sf-clear{border:0;background:transparent;color:#698390;font-size:19px;min-width:31px;min-height:35px}\n.v2-facility-scope .sf-filter-scroll{display:flex;gap:7px;overflow-x:auto;padding:12px 1px 7px;margin-bottom:10px;scrollbar-width:none;-webkit-overflow-scrolling:touch}\n.v2-facility-scope .sf-filter-scroll::-webkit-scrollbar{display:none}\n.v2-facility-scope .sf-filter{flex-shrink:0;display:flex;gap:5px;align-items:center;justify-content:center;white-space:nowrap;padding:9px 11px;min-height:38px;border:1px solid #dce5e9;border-radius:999px;background:white;color:#5d7583;font-size:11px;font-weight:800}\n.v2-facility-scope .sf-filter[aria-pressed=\"true\"]{background:#174b53;color:#fff;border-color:#174b53}\n.v2-facility-scope .sf-filter small{font-size:10px;opacity:.68;font-weight:750}\n.v2-facility-scope .sf-count{display:flex;justify-content:space-between;gap:10px;align-items:center;margin:8px 2px 15px;color:#69818d;font-size:11px}\n.v2-facility-scope .sf-count strong{font-size:12px;color:#24485b}\n.v2-facility-scope .sf-category{margin:0 0 13px;background:white;border:1px solid #e0e9eb;border-radius:16px;overflow:hidden;box-shadow:0 3px 15px rgba(36,69,79,.028)}\n.v2-facility-scope .sf-category-head{display:flex;align-items:center;gap:10px;padding:14px;border-bottom:1px solid #edf1f2}\n.v2-facility-scope .sf-icon{display:grid;place-items:center;flex:0 0 36px;height:36px;border-radius:11px;background:#e8f3f0;color:#13866d;font-size:15px;font-weight:900}\n.v2-facility-scope .sf-category-head h3{font-size:15px;color:#1e4051;line-height:1.3;margin:0}\n.v2-facility-scope .sf-category-head small{display:block;color:#82949e;font-size:10px;margin-top:3px}\n.v2-facility-scope .sf-category-head .sf-num{margin-left:auto;padding:5px 8px;background:#f3f6f8;color:#718a94;font-size:11px;border-radius:8px}\n.v2-facility-scope .sf-record{padding:14px;border-bottom:1px solid #eff3f4}\n.v2-facility-scope .sf-record:last-child{border-bottom:0}\n.v2-facility-scope .sf-record-top{display:flex;align-items:baseline;gap:9px}\n.v2-facility-scope .sf-index{flex-shrink:0;color:#9aaeb5;font-weight:850;font-size:10px}\n.v2-facility-scope .sf-record h4{margin:0;font-size:13px;font-weight:850;line-height:1.5;color:#234355;overflow-wrap:anywhere}\n.v2-facility-scope .sf-location{display:flex;align-items:flex-start;gap:7px;margin:8px 0 0 20px}\n.v2-facility-scope .sf-location-icon{color:#0d9875;font-weight:900;font-size:17px;line-height:1.35}\n.v2-facility-scope .sf-location-text{flex:1;min-width:0}\n.v2-facility-scope .sf-location-text small{display:block;color:#8298a2;font-size:10px;margin-bottom:2px}\n.v2-facility-scope .sf-location-text strong{font-size:13px;color:#0b7460;font-weight:850;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}\n.v2-facility-scope .sf-location-text .sf-missing{font-size:12px;font-weight:650;color:#8599a2}\n.v2-facility-scope .sf-meta{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0 0 20px}\n.v2-facility-scope .sf-tag{display:inline-flex;align-items:center;max-width:100%;padding:5px 7px;border-radius:6px;background:#f0f4f7;color:#597484;font-size:10px;line-height:1.5;overflow-wrap:anywhere}\n.v2-facility-scope .sf-tag.status-good{background:#e5f5ec;color:#168263;font-weight:800}\n.v2-facility-scope .sf-tag.status-warn{background:#fff0e9;color:#ad5d34;font-weight:800}\n.v2-facility-scope .sf-more{display:block;width:100%;border:0;background:#f9fbfc;color:#246c79;min-height:43px;font-size:12px;font-weight:800}\n.v2-facility-scope .sf-alert,.v2-facility-scope .sf-empty{padding:19px 15px;border:1px solid #d9e4e8;border-radius:13px;background:#fff;color:#5e7886;font-size:12px;line-height:1.8}\n.v2-facility-scope .sf-empty{margin:15px 0;text-align:center}\n.v2-facility-scope .sf-alert{background:#f0f6f8;margin:10px 0}\n.v2-facility-scope .sf-alert button{background:transparent;border:0;font-weight:850;color:#18788a;padding:7px}\n.v2-facility-scope .sf-footer{margin:19px 1px 0;color:#889da8;font-size:10px;line-height:1.8}\n.v2-facility-scope button:focus-visible{outline:3px solid #79b49f;outline-offset:2px}\n@media(max-width:360px){.v2-facility-scope .sf-page{padding:14px 10px 32px}.v2-facility-scope .sf-category-head{padding:12px}.v2-facility-scope .sf-record{padding:12px}.v2-facility-scope h2{font-size:21px}}\n\n\n/* 2026 V2 facility redesign: readable mobile-first layout */\n.v2-facility-scope{background:#f5f7fa;color:#173447}\n.v2-facility-scope .sf-page{padding:16px 15px 46px}\n.v2-facility-scope .sf-station{background:#fff;border-color:#e2eaf0;border-radius:999px;padding:5px 11px 5px 5px;box-shadow:0 2px 7px #183e5010}\n.v2-facility-scope .sf-refresh{font-size:12px;border:1px solid #e3eaed;padding:9px 12px;border-radius:11px;background:#fff}\n.v2-facility-scope .sf-eyebrow{margin-top:22px;color:#648899;font-size:10px;letter-spacing:.75px}\n.v2-facility-scope .sf-hero{display:flex;align-items:center;gap:12px;justify-content:space-between;margin:7px 0 16px}\n.v2-facility-scope .sf-hero h2{font-size:25px;letter-spacing:-1.1px;margin:0 0 5px;color:#193449}\n.v2-facility-scope .sf-hero .sf-intro{font-size:12px;color:#708492;margin:0;line-height:1.65;word-break:keep-all}\n.v2-facility-scope .sf-hero-mark{display:grid;place-items:center;flex:0 0 51px;width:51px;height:51px;border-radius:16px;color:#128a77;background:#e5f4ef;font-weight:900;font-size:31px}\n.v2-facility-scope .sf-search{border-radius:14px;box-shadow:none;min-height:50px}\n.v2-facility-scope .sf-search input{font-size:14px;height:48px}\n.v2-facility-scope .sf-quick-access{margin:15px 0 20px}\n.v2-facility-scope .sf-all-filter{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:12px 14px;border-radius:13px;border:1px solid #dce8ea;background:#edf5f3;color:#32596a;text-align:left;font-weight:800;font-size:13px;min-height:45px}\n.v2-facility-scope .sf-all-filter small{font-size:11px;color:#64818e;margin-left:auto}\n.v2-facility-scope .sf-all-filter>span:last-child{font-size:19px;color:#81a3a8}\n.v2-facility-scope .sf-all-filter[aria-pressed=\"true\"]{background:#164e56;border-color:#164e56;color:white}\n.v2-facility-scope .sf-all-filter[aria-pressed=\"true\"] small,.v2-facility-scope .sf-all-filter[aria-pressed=\"true\"]>span:last-child{color:#d5e7e7}\n.v2-facility-scope .sf-type-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}\n.v2-facility-scope .sf-type-tile{display:flex;align-items:center;gap:8px;min-width:0;text-align:left;padding:11px 10px;min-height:57px;border:1px solid #e0e8ec;background:white;border-radius:13px;color:#27475a;box-shadow:0 1px 3px #193e4907}\n.v2-facility-scope .sf-type-tile[aria-pressed=\"true\"]{border:1px solid #0b7d76;background:#e9f7f3;box-shadow:inset 0 0 0 1px #0b7d76}\n.v2-facility-scope .sf-tile-symbol{display:grid;place-items:center;flex:0 0 33px;height:33px;border-radius:10px;background:#eaf4f1;color:#178773;font-size:14px;font-weight:900}\n.v2-facility-scope .sf-type-elevator .sf-tile-symbol,.v2-facility-scope .sf-type-escalator .sf-tile-symbol{background:#eaf0fb;color:#5576ac}\n.v2-facility-scope .sf-type-locker .sf-tile-symbol,.v2-facility-scope .sf-type-atm .sf-tile-symbol{background:#f4f0e8;color:#92794d}\n.v2-facility-scope .sf-type-tile .sf-tile-title{font-size:12px;font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.v2-facility-scope .sf-type-tile small{margin-left:auto;color:#91a3aa;font-size:11px;flex-shrink:0}\n.v2-facility-scope .sf-type-tile[aria-pressed=\"true\"] small{color:#19786e}\n.v2-facility-scope .sf-count{margin:0 2px 11px;align-items:flex-start}\n.v2-facility-scope .sf-count strong{font-size:13px;color:#203e50}\n.v2-facility-scope .sf-count span{font-size:10px;color:#91a0aa;text-align:right}\n.v2-facility-scope .sf-category{border:1px solid #dfe9ed;border-radius:16px;margin-bottom:11px;box-shadow:0 3px 10px #123d4807}\n.v2-facility-scope .sf-category-head{padding:13px 14px 12px;background:#fcfdfd}\n.v2-facility-scope .sf-category-head h3{font-size:14px}\n.v2-facility-scope .sf-category-head small{color:#95a5ad;margin-top:1px}\n.v2-facility-scope .sf-icon{flex-basis:34px;height:34px;background:#e9f3f1}\n.v2-facility-scope .sf-num{font-size:11px;font-weight:750}\n.v2-facility-scope .sf-record{padding:13px 15px 14px}\n.v2-facility-scope .sf-record-top{display:flex;align-items:center;justify-content:space-between;gap:7px}\n.v2-facility-scope .sf-record h4{font-size:12px;color:#617787;font-weight:750;letter-spacing:-.3px}\n.v2-facility-scope .sf-status{display:inline-flex;flex-shrink:0;align-items:center;gap:3px;padding:3px 7px;background:#f2f5f6;color:#63808d;border-radius:7px;font-size:10px;font-weight:750}\n.v2-facility-scope .sf-status.status-good{background:#eef7f2;color:#26795d}\n.v2-facility-scope .sf-status.status-warn{background:#fff3e9;color:#b75a32}\n.v2-facility-scope .sf-location{margin:8px 0 0;gap:9px;align-items:center}\n.v2-facility-scope .sf-location-icon{display:grid;place-items:center;align-self:flex-start;width:24px;height:24px;flex-shrink:0;background:#e9f5f1;color:#0b8b75;border-radius:7px;font-size:17px;line-height:1}\n.v2-facility-scope .sf-location-text small{display:none}\n.v2-facility-scope .sf-location-text strong{display:block;color:#173c49;font-size:15px;line-height:1.6;font-weight:900;letter-spacing:-.5px}\n.v2-facility-scope .sf-location-text .sf-missing{font-size:12px;color:#8697a0}\n.v2-facility-scope .sf-meta{margin:10px 0 0;gap:5px}\n.v2-facility-scope .sf-tag{font-size:11px;padding:5px 8px;border-radius:7px;color:#607987;background:#f1f5f7}\n.v2-facility-scope .sf-tag.sf-tag-strong{background:#eaf2f7;color:#346480;font-weight:750}\n.v2-facility-scope .sf-tag.sf-tag-accessible{background:#eaf4f0;color:#267965}\n.v2-facility-scope .sf-contact{margin:10px 0 0;display:flex;align-items:center;gap:8px;width:fit-content;text-decoration:none;border-radius:8px;padding:7px 10px;background:#f6f8fb;font-size:11px;color:#5b7892}\n.v2-facility-scope .sf-contact span:nth-child(1){color:#245a7f;font-weight:800}\n.v2-facility-scope .sf-contact span:last-child{font-size:13px}\n.v2-facility-scope .sf-more{font-size:12px;border-top:1px solid #edf1f2;background:#fbfcfd}\n.v2-facility-scope .sf-footer{display:grid;gap:5px;line-height:1.7}\n.v2-facility-scope .sf-footer span{color:#6b8391}\n.v2-facility-scope .sf-footer small{font-size:10px;color:#a0adb6}\n@media(max-width:360px){\n.v2-facility-scope .sf-page{padding:13px 11px 37px}\n.v2-facility-scope .sf-type-tile{gap:6px;padding:9px 8px}\n.v2-facility-scope .sf-tile-symbol{flex-basis:28px;height:28px}\n.v2-facility-scope .sf-type-tile .sf-tile-title{font-size:11px}\n.v2-facility-scope .sf-hero-mark{flex-basis:44px;width:44px;height:44px}\n.v2-facility-scope .sf-hero h2{font-size:22px}\n}\n\n/* Compact capsule facility filters: all categories visible, wrapped into rows. */\n.v2-facility-scope .sf-filter-scroll{\n  display:flex;flex-wrap:wrap;align-items:center;align-content:flex-start;\n  gap:7px;overflow:visible;width:100%;\n  margin:14px 0 15px;padding:2px 0 0;\n  scrollbar-width:auto;touch-action:auto;\n}\n.v2-facility-scope .sf-filter-scroll::-webkit-scrollbar{display:none}\n.v2-facility-scope .sf-filter-scroll:after{display:none}\n.v2-facility-scope .sf-filter{\n  display:inline-flex;align-items:center;justify-content:center;gap:6px;\n  flex:0 0 auto;min-height:38px;padding:7px 12px;border-radius:999px;\n  border:1px solid #dce6ea;background:#fff;color:#566f80;\n  white-space:nowrap;font-size:12px;font-weight:800;line-height:1.2;\n  box-shadow:0 1px 3px #123b4808;\n}\n.v2-facility-scope .sf-filter small{font-size:10px;font-weight:750;color:#8598a3}\n.v2-facility-scope .sf-filter[aria-pressed=\"true\"]{\n  background:#164e56;border-color:#164e56;color:#fff;box-shadow:none;\n}\n.v2-facility-scope .sf-filter[aria-pressed=\"true\"] small{color:#d0e6e5;opacity:1}\n@media(max-width:360px){.v2-facility-scope .sf-filter-scroll{gap:6px}.v2-facility-scope .sf-filter{padding:7px 10px}}\n";
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
  result.originalLocation=result.location;
  for(const field of ['location','floor','floorConnection','hours','method','restroomInfo','provider','status']){
   const translated=translateFacilityText(result[field],lang,field);
   result[field]=translated.untranslated?t.untranslated+': '+translated.original:translated.text;
  }
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
 return <div className={"v2-facility-scope"+(embedded?" sf-compact":"")}><style>{css}</style><main className="sf-page">
  {!embedded&&<div className="sf-station-row"><div className="sf-station"><span className="sf-line" style={{background:stationContext?.color||'#1954a1'}}>{stationContext?.line||'1'}</span><span>{stationLabel}</span></div>{!embedded&&<button className="sf-refresh" type="button" onClick={reload} disabled={loading}>↻ {t.retry}</button>}</div>}
  {embedded&&<div className="sf-compact-intro"><div className="sf-context-heading"><h2>{t.oneScreenTitle}</h2><span className="sf-context-station" title={stationLabel}><b style={{background:stationContext?.color||'#1954a1'}}>{stationContext?.line||'1'}</b><span>{stationLabel}</span></span></div><p>{t.oneScreenIntro}</p></div>}
  {!embedded&&<span className="sf-eyebrow">{t.title} · STATION GUIDE</span>}
  {!embedded&&<div className="sf-hero"><div><h2>{t.oneScreenTitle}</h2><p className="sf-intro">{t.oneScreenIntro}</p></div><span className="sf-hero-mark" aria-hidden="true">⌖</span></div>}
  <label className="sf-search"><span className="sf-search-icon" aria-hidden="true">⌕</span><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder={t.search} aria-label={t.search}/>{q&&<button className="sf-clear" type="button" onClick={()=>setQ('')} aria-label={t.clear}>×</button>}</label>
  {(embedded||(!loading&&data?.ok&&available.length>0))&&<nav className="sf-filter-scroll" aria-label={t.facilityTypes}>
    {!loading&&data?.ok&&available.length>0&&<>
    <button className="sf-filter" type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>{t.all} <small>{total}</small></button>
    {available.map(cat=><button key={cat.id} className="sf-filter" type="button" aria-pressed={filter===cat.id} onClick={()=>{if(filter!==cat.id)recordStat('quick_menu','facility',lang,facilityContext(cat.id));setFilter(filter===cat.id?'all':cat.id);}}>{cat.label}<small>{cat.items.length}</small></button>)}
    </>}
    {embedded&&<button className="sf-refresh sf-filter-refresh" type="button" onClick={reload} disabled={loading}>↻ {t.retry}</button>}
  </nav>}
  {loading?<div className="sf-empty" role="status">{t.loading}</div>
   :!data?.ok?<div className="sf-alert" role="alert">{t.failed}<button type="button" onClick={reload}>{t.retry}</button></div>
   :available.length===0?<div className="sf-empty">{t.empty}</div>
   :<><div className="sf-count"><strong>{keyword||filter!=='all'?t.filtered+' '+shownTotal:t.available+' '+total} {t.records}</strong></div>
    {shown.length===0?<div className="sf-empty">{t.noMatch}</div>:shown.map(cat=>{
     const showEverything=Boolean(keyword||filter===cat.id||expanded[cat.id]);
     const visibleItems=showEverything?cat.items:cat.items.slice(0,3);
     const moreCount=cat.items.length-visibleItems.length;
     return <section className="sf-category" key={cat.id} aria-label={cat.label}>
      <header className="sf-category-head"><span className="sf-icon" aria-hidden="true">{cat.icon}</span><div><h3>{cat.label}</h3><small>{t.locationAtFirst}</small></div><span className="sf-num">{cat.items.length}{t.records}</span></header>
      <div className="sf-records">{visibleItems.map(({row,index,summary:s})=>{
       const state=pick(row,[/^oprtngSitu$|^operSttus$|^oprtngSttus$/i]);
       return <article className="sf-record" key={cat.id+'-'+index}>
        <div className="sf-record-top"><h4 title={s.originalName}>{s.name}</h4>{s.status&&<span className={'sf-status'+(state==='M'?' status-good':state?' status-warn':'')}>{s.status}</span>}</div>
        <div className="sf-location"><span className="sf-location-icon" aria-hidden="true">⌖</span><div className="sf-location-text"><small>{t.location}</small><strong title={s.originalLocation} className={s.location?'':'sf-missing'}>{s.location||t.noLocation}</strong></div></div>
        {(s.entrance||s.floor||s.floorConnection||s.hours||s.method||s.gateLabel||s.stroller||s.wheelchair||s.restroomInfo||s.lockerCount||s.provider)&&<div className="sf-meta">
         {s.floorConnection?<span className="sf-tag sf-tag-strong">{t.connectedFloors} {s.floorConnection}</span>:s.floor&&<span className="sf-tag sf-tag-strong">{s.floor}</span>}
         {s.gateLabel&&<span className="sf-tag sf-tag-strong">{s.gateLabel}</span>}
         {s.entrance&&<span className="sf-tag">{lang==='en'?'Exit '+s.entrance:s.entrance+t.exitSuffix}</span>}
         {s.wheelchair&&<span className="sf-tag sf-tag-accessible">♿ {s.wheelchair}</span>}
         {s.lockerCount&&<span className="sf-tag">{s.lockerCount}</span>}
         {s.hours&&<span className="sf-tag">{t.hours} · {s.hours}</span>}
         {s.restroomInfo&&<span className="sf-tag">{s.restroomInfo}</span>}
         {s.method&&<span className="sf-tag">{t.usageMethod} · {s.method}</span>}
         {['Y','N'].includes(s.stroller)&&<span className="sf-tag">{t.stroller} · {s.stroller==='Y'?t.yes:t.no}</span>}
         {s.provider&&<span className="sf-tag">{s.provider}</span>}
        </div>}
        {s.phone&&<a className="sf-contact" href={'tel:'+s.phone} aria-label={t.helpPhone+' '+s.phone}>{t.helpPhone} <span>{s.phone.replace(/^(\d{4})(\d{4})$/, '$1-$2')}</span><span aria-hidden="true">↗</span></a>}
       </article>;
      })}</div>
      {moreCount>0&&<button className="sf-more" type="button" onClick={()=>setExpanded(prev=>({...prev,[cat.id]:true}))}>{t.showMore} +{moreCount} ↓</button>}
      {!keyword&&filter==='all'&&expanded[cat.id]&&cat.items.length>3&&<button className="sf-more" type="button" onClick={()=>setExpanded(prev=>({...prev,[cat.id]:false}))}>{t.showLess} ↑</button>}
     </section>;
    })}
   </>}
  {data?.partial&&<div className="sf-alert" role="status">ⓘ {t.partial}</div>}

 </main></div>;
}
