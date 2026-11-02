import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const data=JSON.parse(await fs.readFile('app/data/stationCoordinates.json','utf8'));
const context=vm.createContext({});const module=new vm.SourceTextModule(await fs.readFile('app/lib/station-coordinates.js','utf8'),{context});await module.link(()=>new vm.SyntheticModule(['default'],function(){this.setExport('default',data)},{context}));await module.evaluate();
const locate=module.namespace.stationCoordinates;
test('uses uploaded Jongno 5-ga coordinate ID without losing its leading zero',()=>{assert.equal(Object.keys(data).length,784);const c=locate({coordinateId:'0154'});assert.equal(c.latitude,37.570926);assert.equal(c.longitude,127.001849);});
test('name matching also requires the line; unknown or ambiguous stations never fall back to another station',()=>{const c=locate({names:{ko:'종로5가역'},line:'1'});assert.equal(c.latitude,37.570926);assert.equal(locate({names:{ko:'종로5가역'},line:'4'}),null);assert.equal(locate({names:{ko:'없는역'},line:'1'}),null);assert.equal(locate(null),null);});
test('every V2 master station resolves its own uploaded coordinate ID, including transfer platforms',async()=>{
 const master=JSON.parse(await fs.readFile('app/data/seoulMetroStationMaster.json','utf8'));
 for(const station of master.stations){const center=locate(station);assert.ok(center,station.stationCode);assert.equal(center.latitude,station.coordinates.latitude,station.stationCode);assert.equal(center.longitude,station.coordinates.longitude,station.stationCode);}
 const dongmyo=master.stations.filter(s=>s.names.ko==='동묘앞');assert.equal(dongmyo.length,2);assert.notEqual(dongmyo[0].stationCode,dongmyo[1].stationCode);
});
