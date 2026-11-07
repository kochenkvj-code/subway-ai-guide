// The position API's statnTnm may include a service qualifier, not just a name.
const qualifiers={종착:{ko:'종착',en:'Terminus',ja:'終着',zh:'终到'},지선:{ko:'지선',en:'Branch',ja:'支線',zh:'支线'},내선:{ko:'내선',en:'Inner',ja:'内回り',zh:'内环'},외선:{ko:'외선',en:'Outer',ja:'外回り',zh:'外环'},급행:{ko:'급행',en:'Express',ja:'急行',zh:'快速'}};
export function positionDestination(raw,lang,stationName,line,direction){
 const original=String(raw??'').trim();
 if(!original)return {name:'—',qualifier:'',bound:'—',full:'—'};
 // Translate the line-6 Eungam-loop service label for presentation only.
 const loop=String(line)==='6'&&original.match(/^응암\s*순환(?:\s*\(\s*(상선|하선)\s*\))?(?:행)?$/);
 if(loop){
  if(lang==='ko')return {name:original,qualifier:'',bound:original.endsWith('행')?original:original+'행',full:original};
  const place=stationName('응암',lang,false);
  const name=({en:place+' Loop',ja:place+'循環',zh:place+'循环'})[lang]||original;
  const track=loop[1]?({
   상선:{en:'Upper track',ja:'上線',zh:'上线'},
   하선:{en:'Lower track',ja:'下線',zh:'下线'}
  })[loop[1]]?.[lang]||'':'';
  const bound=lang==='ja'?name+'行き':lang==='zh'?'开往'+name:name;
  return {name,qualifier:track,bound,full:bound+(track?' · '+track:'')};
 }
 // Only compact line-2 summary labels are adapted. Keep original
 // statnTnm untouched for detail cards and JSON diagnostics.
 if(String(line)==='2'){
  const isSeongsuMain=/^성수(?:종착|행)?$/.test(original);
  const isSeongsuBranch=original==='성수지선';
  if(isSeongsuMain||isSeongsuBranch){
   const name=lang==='ko'?'성수':stationName('성수',lang,false)||'성수';
   const qualifier=isSeongsuBranch?qualifiers.지선[lang]:
    String(direction)==='0'?qualifiers.내선[lang]:
    String(direction)==='1'?qualifiers.외선[lang]:'';
   const bound=lang==='ko'?'성수행':lang==='ja'?name+'行き':lang==='zh'?'开往'+name:name;
   return {name,qualifier,bound,full:bound+(qualifier?' · '+qualifier:'')};
  }
 }
 let base=original,qualifier='';
 if(!stationName(base,'en',false)&&base.endsWith('행')&&stationName(base.slice(0,-1),'en',false))base=base.slice(0,-1);
 const match=base.match(/^(.*?)\s*(?:\((종착|지선|내선|외선|급행)\)|(종착|지선|내선|외선|급행))$/);
 if(match&&stationName(match[1],lang==='ko'?'en':lang,false)){
  base=match[1].trim();qualifier=qualifiers[match[2]||match[3]][lang];
 }
 // Unknown labels stay readable in the original language, never a long error label.
 const translated=lang==='ko'?base:stationName(base,lang,false);
 if(lang!=='ko'&&!translated&&/[가-힣]/.test(base)){
  // Unknown source wording is available unchanged in the raw JSON.
  const unavailable={en:'Destination unavailable',ja:'行先未登録',zh:'终点未登记'}[lang];
  return {name:unavailable,qualifier:'',bound:unavailable,full:unavailable};
 }
 const name=translated||original;
 const bound=lang==='ko'?name+'행':lang==='ja'?name+'行き':lang==='zh'?'开往'+name:name;
 return {name,qualifier,bound,full:name+(qualifier?' · '+qualifier:'')};
}

export function positionStation(raw,lang,stationName){
 const source=String(raw??'').trim();
 if(!source)return '—';
 if(lang==='ko')return source;
 const match=source.match(/^(.+?)\s*\(\s*(상선|하선)(?:\s*[-–]\s*(종착|순환))?\s*\)$/);
 if(!match)return stationName(source,lang);
 const base=match[1].replace(/순환$/,'').trim();
 const name=stationName(base,lang,false);
 if(!name)return stationName(source,lang);
 const track={
  상선:{en:'Upper track',ja:'上線',zh:'上线'},
  하선:{en:'Lower track',ja:'下線',zh:'下线'}
 }[match[2]]?.[lang];
 const service=match[3]?({
  종착:{en:'Terminus',ja:'終着',zh:'终点'},
  순환:{en:'Loop',ja:'循環',zh:'循环'}
 })[match[3]]?.[lang]:'';
 return name+' ('+[track,service].filter(Boolean).join(' · ')+')';
}
