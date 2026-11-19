import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createHmac,timingSafeEqual} from 'node:crypto';
export async function loadModule(file,globals={}){
 const context=vm.createContext({Response,URL,URLSearchParams,AbortSignal,Date,Buffer,process:{env:{SEOUL_METRO_TIMETABLE_API_KEY:'fixture',SEOUL_METRO_FACILITY_API_KEY:'fixture',STATS_ADMIN_PASSWORD:'test-only'}},...globals});const cache=new Map();
 async function load(file){if(cache.has(file))return cache.get(file);const source=await fs.readFile(file,'utf8');const m=file.endsWith('.json')?new vm.SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(source));},{context}):new vm.SourceTextModule(source,{context});cache.set(file,m);await m.link(name=>name==='next/cache'?new vm.SyntheticModule(['unstable_cache'],function(){this.setExport('unstable_cache',fn=>fn);},{context}):name==='node:crypto'?new vm.SyntheticModule(['createHmac','timingSafeEqual'],function(){this.setExport('createHmac',createHmac);this.setExport('timingSafeEqual',timingSafeEqual);},{context}):load(path.resolve(path.dirname(file),name.endsWith('.json')?name:name+'.js')));return m;}
 const m=await load(path.resolve(file));await m.evaluate();return m.namespace;
}
