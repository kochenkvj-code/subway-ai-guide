import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const context=vm.createContext({URL});
const cache=new Map();
async function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m=file.endsWith('.json')?new vm.SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(fs.readFileSync(file,'utf8')));},{context}):new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context});cache.set(file,m);await m.link(name=>load(path.resolve(path.dirname(file),name.endsWith('.json')?name:name+'.js')));return m;}
const mod=await load('app/lib/station-entry.js');await mod.evaluate();const {readStationEntry,stationEntryUrl}=mod.namespace;
test('URL is the station authority; only a missing code defaults, unknown/empty/numeric-looking shortened IDs do not',()=>{
 assert.equal(readStationEntry('https://app.test/v2').station.stationCode,'0154');
 for(const code of ['0152','0153','0319','2535','2637'])assert.equal(readStationEntry('https://app.test/v2?station='+code).station.stationCode,code);
 for(const code of ['','154','9999','0200','jongno5ga-1','종각'])assert.equal(readStationEntry('https://app.test/v2?station='+encodeURIComponent(code)).station,null);
});
test('home/gate links preserve leading zeros and selected language, with development and root mount parity',()=>{
 for(const basePath of ['/v2','/'])for(const lang of ['ko','en','ja','zh'])for(const gate of [false,true]){
  const value=stationEntryUrl({origin:'https://app.test',basePath,stationCode:'2637',language:lang,gate});const url=new URL(value);assert.equal(url.pathname,basePath);assert.equal(url.searchParams.get('station'),'2637');assert.equal(url.searchParams.get('view'),gate?'gate':null);assert.equal(url.searchParams.get('lang'),lang==='ko'?null:lang);assert.equal(readStationEntry(value).station.line,'6');assert.equal(readStationEntry(value).language,lang);
 }
});
test('legacy gate entry has English default without overriding an explicit selected language',()=>{
 const a=readStationEntry('https://app.test/v2?station=0152&from=gate');assert.equal(a.legacyGate,true);assert.equal(a.language,'en');assert.equal(readStationEntry('https://app.test/v2?station=0152&from=gate&lang=ja').language,'ja');
});
test('copied QR URLs are canonical and reject unknown stations, arbitrary paths and unsupported languages',()=>{
 const value=stationEntryUrl({origin:'https://app.test/v2?place=123&view=tour',basePath:'/',stationCode:'0154'});assert.equal(value,'https://app.test/?station=0154');
 for(const bad of [{stationCode:'9999'},{basePath:'/v2/station-master'},{language:'fr'}])assert.throws(()=>stationEntryUrl({origin:'https://app.test',basePath:'/v2',stationCode:'0154',...bad}));
});

test('station choice remains in selector with updated QR links until user explicitly closes it',()=>{
 const source=fs.readFileSync('app/v2/StationEntry.jsx','utf8');
 const start=source.indexOf(' function choose(station){');
 const end=source.indexOf(' function changedLanguage',start);
 assert.ok(start>=0&&end>start);
 const handler=source.slice(start,end);
 assert.match(handler,/setAddressesOpen\(true\)/);
 assert.match(handler,/setEntry\(next\)/);
 assert.doesNotMatch(handler,/setPanel\(null\)/);
 assert.match(source,/onClick=\{\(\)=>setPanel\(null\)\} aria-label=\{t\.close\}/);
 assert.match(source,/stationCode:entry\.code,language:entry\.language,gate/);
 assert.match(source,/aria-expanded=\{addressesOpen\}/);
});
