import {readFile,writeFile} from 'node:fs/promises';
import {loadFacilityTranslator} from '../tests/helpers/load-facility-i18n.mjs';
const translate=await loadFacilityTranslator();
const corpus=JSON.parse(await readFile(new URL('../tests/fixtures/facility-phrases.json',import.meta.url),'utf8'));
const report={provenance:corpus.provenance,stations:corpus.stats.stations,records:corpus.stats.records,languages:{}};
for(const lang of ['en','ja','zh']){
 const fields={};
 for(const [field,values]of Object.entries(corpus.values)){
  let total=0,localized=0;const untranslated=[];
  for(const [value,meta]of Object.entries(values)){
   total+=meta.count;const result=translate(value,lang,field);
   if(result.untranslated)untranslated.push({value,occurrences:meta.count,stations:meta.stations});else localized+=meta.count;
  }
  fields[field]={unique:Object.keys(values).length,occurrences:total,localizedOrLanguageNeutral:localized,untranslated};
 }
 report.languages[lang]=fields;
}
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({stations:report.stations,records:report.records,languages:Object.fromEntries(Object.entries(report.languages).map(([lang,fields])=>[lang,Object.fromEntries(Object.entries(fields).map(([field,r])=>[field,{occurrences:r.occurrences,localized:r.localizedOrLanguageNeutral,untranslatedUnique:r.untranslated.length}]))]))},null,2));
