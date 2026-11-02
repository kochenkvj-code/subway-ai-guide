import {DEFAULT_FEEDBACK_STATION} from './feedback-config';
import {lostFoundStation} from './lost-found-stations';
export const MAX_LOST_PAGES=20;
export function koreaDate(daysBack=0,now=Date.now()){return new Date(now+9*3600000-daysBack*86400000).toISOString().slice(0,10);}
export function lostDate(value){
 const s=String(value||'').replace(/[.\-/]/g,'').trim();if(!/^\d{8}$/.test(s))return '';
 const date=s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6);const d=new Date(date+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===date?date:'';
}
export function validLostRange(start,end,now=Date.now()){
 return lostDate(start)===start&&lostDate(end)===end&&start<=end&&end<=koreaDate(0,now)&&start>=koreaDate(89,now);
}
const compact=s=>String(s||'').normalize('NFKC').replace(/[\s()（）\[\]·.,-]/g,'');
export function stationCustody(place,station,organizationId=''){
 // Fail closed: bare neighborhood names are insufficient evidence of station custody.
 const value=compact(place);if(/파출소|지구대|경찰|주민센터/.test(value))return false;
 const lines=[...value.matchAll(/([1-9])호선/g)].map(match=>match[1]);
 if(station.stationCode&&lines.some(line=>line!==station.line))return false;
 if(organizationId&&station.providerOrganizationId&&organizationId!==station.providerOrganizationId)return false;
 const organizationMatches=organizationId&&organizationId===station.providerOrganizationId;
 if(station.requiresLineIdentity&&!lines.length&&!organizationMatches)return false;
 const agency=station.stationCode?value.replace(/[1-9]호선/g,''):value;
 const aliases=station.lostFoundAliases||[station.names.ko];
 return aliases.some(alias=>{
  const name=compact(alias),index=agency.indexOf(name);if(index<0)return false;
  const prefix=agency.slice(0,index),suffix=agency.slice(index+name.length);
  return /^(?:(?:서울교통공사|서울메트로|한국철도공사|코레일|KORAIL|수도권|지하철)|\d+호선)*$/i.test(prefix)&&/^(?:역무실|고객안전실|고객지원실|고객센터|유실물보관소|유실물|보관소|\d+호선)*$/.test(suffix);
 });
}
export function closedCustody(value){return ['반환','반환완료','처리완료','폐기','폐기완료','매각','매각완료','국고귀속','양여','기증','종결'].includes(String(value||'').replace(/\s/g,''));}
export function matchesLostItem(row,{start,end,scope,station,item,place}){
 const date=lostDate(row.date);if(!date||date<start||date>end||closedCustody(row.custody))return false;
 if(scope==='station'&&!stationCustody(row.place,station,row.organizationId))return false;
 if(scope==='other'&&!compact(row.place).toLowerCase().includes(compact(place).toLowerCase()))return false;
 if(item&&!compact(row.title+' '+row.subject).toLowerCase().includes(compact(item).toLowerCase()))return false;
 return true;
}
export function resolveLostSearch(query,now=Date.now()){
 const place=(query.get('place')||'').trim(),item=(query.get('item')||'').trim();
 const stationId=query.get('station')??DEFAULT_FEEDBACK_STATION.id;
 const station=lostFoundStation(stationId);
 if(!station)return null;
 const isStation=[station.placeName,station.names.ko,...(station.lostFoundAliases||[])].filter(Boolean).some(name=>place===name||place===name.replace(/역$/,''));
 const scope=query.get('scope')||(isStation?'station':place?'other':'all');
 const start=query.get('start')||koreaDate(29,now),end=query.get('end')||koreaDate(0,now);
 if(!['station','all','other'].includes(scope)||!validLostRange(start,end,now)||item.length>80||(item&&item.length<2)||place.length>80||(scope==='other'&&place.length<2))return null;
 return {start,end,scope,station,item,place:scope==='station'?(station.placeName||station.names.ko):scope==='other'?place:''};
}
