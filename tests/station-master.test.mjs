import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const master=read('app/data/seoulMetroStationMaster.json'),audit=read('app/data/seoulMetroStationMasterAudit.json'),registry=read('app/data/seoulMetroOfficialStations.json'),coords=read('app/data/stationCoordinates.json');
const byCode=new Map(master.stations.map(s=>[s.stationCode,s]));
test('every source entry resolves once; names/codes come only from the existing multilingual search registry',()=>{
 assert.equal(audit.counts.sourceEntries,289);assert.equal(master.stations.length,289);assert.equal(byCode.size,289);assert.equal(audit.unmatched.length,0);
 for(const s of master.stations){assert.match(s.stationCode,/^\d{4}$/);const original=registry.find(x=>x.code===s.stationCode);assert.ok(original);for(const lang of ['ko','en','ja','zh'])assert.equal(s.names[lang],original[lang]);assert.equal(s.line,String(Number(original.line.slice(0,2))));assert.equal(s.scopeStatus,'source-listed');}
 assert.equal(registry.length,799);assert.equal(Object.keys(coords).length,784);
});
test('transfer platforms stay independent and preserve their own coordinates and API line IDs',()=>{
 for(const [code,line]of [['0153','1'],['0319','3'],['2535','5']]){const s=byCode.get(code);assert.equal(s.names.ko,'종로3가');assert.equal(s.line,line);assert.equal(s.subwayId,'100'+line);assert.deepEqual(s.coordinates,{latitude:coords[code].lat,longitude:coords[code].lng});}
 assert.equal(new Set(['0153','0319','2535'].map(k=>JSON.stringify(byCode.get(k).coordinates))).size,3);
 assert.equal(byCode.get('2637').names.ko,'동묘앞');assert.equal(byCode.get('2637').line,'6');
});
test('reference CSV corrections are explicit; unresolved supplementary station never borrows transfer coordinates',()=>{
 assert.equal(audit.corrections.length,5);assert.equal(byCode.get('2811').source.line,'5');assert.equal(byCode.get('2811').line,'8');assert.equal(byCode.get('0432').names.ko,'총신대입구');assert.ok(byCode.get('0432').aliases.includes('이수'));assert.equal(byCode.has('0200'),false);assert.equal(audit.supplementalCandidates[0].stationCode,'0200');assert.equal(audit.supplementalCandidates[0].coordinates,null);assert.equal(audit.scopeVerification,'pending-current-official-source');
});
test('coordinate lookup and legacy references are metadata only, with no synthetic fallback values',()=>{
 assert.equal(audit.counts.withCoordinates,289);for(const s of master.stations)assert.deepEqual(s.coordinates,{latitude:coords[s.stationCode].lat,longitude:coords[s.stationCode].lng});assert.deepEqual(byCode.get('0154').legacyIds,{feedback:'jongno5ga-1'});assert.equal(byCode.get('0152').legacyIds.feedback,undefined);
});
test('generator is reproducible and does not rewrite any original route or coordinate data',()=>{
 const paths=['app/data/seoulMetroStationMaster.json','app/data/seoulMetroStationMasterAudit.json','app/data/seoulMetroOfficialStations.json','app/data/stationCoordinates.json'];const before=paths.map(p=>fs.readFileSync(p));execFileSync(process.execPath,['scripts/build-station-master.mjs']);paths.forEach((p,i)=>assert.deepEqual(fs.readFileSync(p),before[i]));
});
test('shared lookup requires exact string code and never falls back to Jongno 5-ga',async()=>{
 const context=vm.createContext({});const mod=new vm.SourceTextModule(fs.readFileSync('app/lib/station-master.js','utf8'),{context});await mod.link(()=>new vm.SyntheticModule(['default'],function(){this.setExport('default',master);},{context}));await mod.evaluate();assert.equal(mod.namespace.getStationByCode('0154').names.ko,'종로5가');for(const code of [154,'154','9999','jongno5ga-1',null])assert.equal(mod.namespace.getStationByCode(code),null);assert.equal(mod.namespace.searchStationMaster('종로3가').length,3);assert.equal(mod.namespace.searchStationMaster('동묘','6')[0].stationCode,'2637');
});
