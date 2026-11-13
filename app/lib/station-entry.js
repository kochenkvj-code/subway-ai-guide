import {getStationByCode} from './station-master';
const languages=new Set(['ko','en','ja','zh']);
// Browser preference is read once by the entry component, before mounting the guide.
export function getBrowserLanguage(browser){
 try{
  const locale=browser?.language;
  const language=typeof locale==='string'?locale.trim().toLowerCase().split(/[-_]/)[0]:'';
  return languages.has(language)?language:'en';
 }catch{return 'en';}
}
export function readStationEntry(href,fallbackLanguage='en'){
 const url=new URL(href,'https://entry.invalid');
 const raw=url.searchParams.get('station');
 const code=raw===null?'0154':raw;
 const station=getStationByCode(code);
 const gate=url.searchParams.get('from')==='gate';
 const language=languages.has(url.searchParams.get('lang'))?url.searchParams.get('lang'):languages.has(fallbackLanguage)?fallbackLanguage:'en';
 return {station,code,language,legacyGate:gate&&!url.searchParams.has('view')};
}
// The mount path is supplied by the page, never inferred from nested menus.
// Root deployment uses '/', development currently uses '/v2'. No stale place,
// history or unrelated query parameters are copied into station QR links.
export function stationEntryUrl({origin,basePath,stationCode,language='ko',gate=false}){
 if(!getStationByCode(stationCode))throw Error('Unsupported station');
 if(!languages.has(language))throw Error('Unsupported language');
 if(!['/','/v2'].includes(basePath))throw Error('Unsupported mount path');
 const url=new URL(basePath,origin);url.searchParams.set('station',stationCode);
 if(gate)url.searchParams.set('view','gate');
 if(language!=='ko')url.searchParams.set('lang',language);
 return url.href;
}
