import dictionary from '../data/facility-i18n.json';
import stations from '../data/subwayStations.json';

const languages=['en','ja','zh'];
const hangul=/[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const ordered=object=>Object.keys(object).sort((a,b)=>b.length-a.length);
const places=ordered(dictionary.places),relations=ordered(dictionary.relations);
const stationLabels=new Map();
for(const [name,item]of Object.entries(stations.stations)){
 for(const alias of [name,item.ko,...(item.aliases_ko||[])]){
  if(!alias)continue;
  for(const label of [alias,alias.replace(/역$/,'')]){
   if(!stationLabels.has(label))stationLabels.set(label,item);
  }
 }
}
const stationKeys=[...stationLabels.keys()].sort((a,b)=>b.length-a.length);
const fill=(template,value)=>template.replace('{n}',value);
const normalize=value=>String(value??'').normalize('NFC').trim().replace(/\s+/g,' ');
const compact=value=>value.replace(/\s+/g,'');
const fixed=new Map(Object.entries(dictionary.phrases).map(([key,value])=>[compact(key),value]));

// Translate only fully recognized phrases. Never expose a partially substituted
// location: a new provider phrase is retained verbatim and marked as original.
export function translateFacilityText(value,lang='ko',field='location'){
 const original=normalize(value);
 const unchanged={text:original,original,translated:false,untranslated:false};
 if(!original||lang==='ko'||!languages.includes(lang))return unchanged;
 const exact=fixed.get(compact(original));
 if(exact?.[lang])return {...unchanged,text:exact[lang],translated:true};
 if(field==='floor'||field==='floorConnection'){
  const parts=original.split(/\s*↔\s*/);
  const floors=parts.map(part=>{
   const m=part.match(/^(B)?(\d+)(?:F|층)?$/i);
   if(m)return fill(dictionary.patterns[m[1]?'basement':'floor'][lang],m[2]);
   // Mezzanine identifiers are kept as codes rather than guessed floor numbers.
   return /^(?:BM|M)\d+$/i.test(part)?part:null;
  });
  if(floors.every(Boolean))return {...unchanged,text:floors.join(' ↔ '),translated:true};
 }
 if(!hangul.test(original))return unchanged;
 if(field!=='location')return {...unchanged,untranslated:true};
 const input=original;
 let pos=0,failed=false;
 function parse(end=''){
  const out=[];
  while(pos<input.length){
   if(/\s/.test(input[pos])){pos++;continue;}
   if(end&&input[pos]===end){pos++;return out.join(' · ');}
   const rest=input.slice(pos);
   if(rest[0]==='('||rest[0]==='（'){
    const close=rest[0]==='('?')':'）';pos++;
    const inner=parse(close);
    if(failed)return '';
    if(out.length)out[out.length-1]+=' ('+inner+')';else out.push('('+inner+')');
    continue;
   }
   if(rest[0]===')'||rest[0]==='）'){failed=true;return '';}
   const separator=rest.match(/^[,，/·ㆍ:：→.]+/);
   if(separator){pos+=separator[0].length;continue;}
   if(/^(?:및|와|과)/.test(rest)){pos++;continue;}
   let match=rest.match(/^(지하|지상)?\s*(\d+)층/);
   if(match){out.push(fill(dictionary.patterns[match[1]==='지하'?'basement':'floor'][lang],match[2]));pos+=match[0].length;continue;}
   match=rest.match(/^(\d+(?:\s*[,，~\-]\s*\d+)*)\s*번\s*(?:출입구|출구)/);
   if(match){out.push(fill(dictionary.patterns.exit[lang],match[1].replace(/\s/g,'')));pos+=match[0].length;continue;}
   match=rest.match(/^(B|BM|M)(\d+)(?:F|층)?/i);
   if(match){out.push(match[1].toUpperCase()==='B'?fill(dictionary.patterns.basement[lang],match[2]):match[1].toUpperCase()+match[2]);pos+=match[0].length;continue;}
   match=rest.match(/^(\d+(?:-\d+)?)\s*출구/);
   if(match){out.push(fill(dictionary.patterns.exit[lang],match[1]));pos+=match[0].length;continue;}
   match=rest.match(/^(\d+)호선/);
   if(match){out.push(fill(dictionary.patterns.line[lang],match[1]));pos+=match[0].length;continue;}
   const place=places.find(key=>rest.startsWith(key));
   if(place){out.push(dictionary.places[place][lang]);pos+=place.length;continue;}
   const station=stationKeys.find(key=>rest.startsWith(key)&&(key.endsWith('역')||/^(?:역)?(?:방면|방향|측|쪽|연결통로|B|지하|[()（）,，/·]|$)/.test(rest.slice(key.length).replace(/\s/g,''))));
   if(station){
    const entry=stationLabels.get(station),label=entry[lang]||entry.en;
    if(!label||hangul.test(label)){failed=true;return '';}
    out.push(label);pos+=station.length;
    if(!station.endsWith('역')){const suffix=input.slice(pos).match(/^\s*역/);if(suffix)pos+=suffix[0].length;}
    continue;
   }
   const relation=relations.find(key=>rest.startsWith(key));
   if(relation){
    if(!out.length){failed=true;return '';}
    out[out.length-1]=dictionary.relations[relation][lang].replace('{x}',out[out.length-1]);pos+=relation.length;continue;
   }
   match=rest.match(/^\d+-[A-Z][A-Za-z0-9-]*/);
   if(match){out.push(match[0]);pos+=match[0].length;continue;}
   // Codes and boarding-position numbers are preserved, never interpreted.
   match=rest.match(/^(?:\d+(?:[-~]\d+)+|B?M?\d+(?:F)?|[a-zA-Z]+(?:[-/][a-zA-Z]+)*)(?![a-z])/);
   if(match){out.push(match[0]);pos+=match[0].length;continue;}
   failed=true;return '';
  }
  if(end)failed=true;
  return out.join(' · ');
 }
 const text=parse();
 return !failed&&text?{text,original,translated:true,untranslated:false}:{...unchanged,untranslated:true};
}
