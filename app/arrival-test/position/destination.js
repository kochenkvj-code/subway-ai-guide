// The position API's statnTnm may include a service qualifier, not just a name.
const qualifiers={종착:{ko:'종착',en:'Terminus',ja:'終着',zh:'终到'},지선:{ko:'지선',en:'Branch',ja:'支線',zh:'支线'},내선:{ko:'내선',en:'Inner',ja:'内回り',zh:'内环'},외선:{ko:'외선',en:'Outer',ja:'外回り',zh:'外环'},급행:{ko:'급행',en:'Express',ja:'急行',zh:'快速'}};
export function positionDestination(raw,lang,stationName){
 const original=String(raw??'').trim();
 if(!original)return {name:'—',qualifier:'',bound:'—',full:'—'};
 let base=original,qualifier='';
 if(!stationName(base,'en',false)&&base.endsWith('행')&&stationName(base.slice(0,-1),'en',false))base=base.slice(0,-1);
 const match=base.match(/^(.*?)\s*(?:\((종착|지선|내선|외선|급행)\)|(종착|지선|내선|외선|급행))$/);
 if(match&&stationName(match[1],lang==='ko'?'en':lang,false)){
  base=match[1].trim();qualifier=qualifiers[match[2]||match[3]][lang];
 }
 // Unknown labels stay readable in the original language, never a long error label.
 const name=lang==='ko'?base:stationName(base,lang,false)||original;
 const bound=lang==='ko'?name+'행':lang==='ja'?name+'行き':lang==='zh'?'开往'+name:name;
 return {name,qualifier,bound,full:name+(qualifier?' · '+qualifier:'')};
}
