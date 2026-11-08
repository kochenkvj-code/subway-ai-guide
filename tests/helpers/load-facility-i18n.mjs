import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
export async function loadFacilityTranslator(){
 const context=vm.createContext({Map,Set,RegExp,String,Object,Array});
 const base=new URL('../../app/lib/facility-i18n.js',import.meta.url);
 const mod=new vm.SourceTextModule(await readFile(base,'utf8'),{context});
 await mod.link(async name=>{
  const data=JSON.parse(await readFile(new URL(name,base),'utf8'));
  return new vm.SyntheticModule(['default'],function(){this.setExport('default',data);},{context});
 });
 await mod.evaluate();return mod.namespace.translateFacilityText;
}
