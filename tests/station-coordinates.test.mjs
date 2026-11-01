import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const data=JSON.parse(await fs.readFile('app/data/stationCoordinates.json','utf8'));
const context=vm.createContext({});const module=new vm.SourceTextModule(await fs.readFile('app/lib/station-coordinates.js','utf8'),{context});await module.link(()=>new vm.SyntheticModule(['default'],function(){this.setExport('default',data)},{context}));await module.evaluate();
const locate=module.namespace.stationCoordinates;
test('uses uploaded Jongno 5-ga coordinate ID without losing its leading zero',()=>{assert.equal(Object.keys(data).length,784);const c=locate({coordinateId:'0154'});assert.equal(c.latitude,37.570926);assert.equal(c.longitude,127.001849);});
test('name matching also requires the line; unknown or ambiguous stations never fall back to another station',()=>{const c=locate({names:{ko:'종로5가역'},line:'1'});assert.equal(c.latitude,37.570926);assert.equal(locate({names:{ko:'종로5가역'},line:'4'}),null);assert.equal(locate({names:{ko:'없는역'},line:'1'}),null);assert.equal(locate(null),null);});
