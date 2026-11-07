import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {positionDestination} from '../app/arrival-test/position/destination.js';
const data=JSON.parse(fs.readFileSync('app/data/subwayStations.json'));
const source=fs.readFileSync('app/lib/stationNameI18n.js','utf8').replace('import rawData from "../data/subwayStations.json";',`const rawData=${JSON.stringify(data)};`);
const {stationName}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('actual line 2 provider labels retain station name and service qualifier',()=>{
 assert.deepEqual(positionDestination('성수종착','en',stationName),{name:'Seongsu',qualifier:'Terminus',bound:'Seongsu',full:'Seongsu · Terminus'});
 assert.equal(positionDestination('성수지선','en',stationName).full,'Seongsu · Branch');
 for(const lang of ['ko','en','ja','zh'])for(const raw of ['성수종착','성수지선','성수(내선)','성수(외선)','까치산','신설동','신도림']){
 const result=positionDestination(raw,lang,stationName);assert.ok(!result.name.includes('unavailable'));assert.ok(result.name.length>0);if(lang!=='ko')assert.ok(!/[가-힣]/.test(result.full));
 }
});
test('registered station destinations and unknown originals are preserved',()=>{
 for(const lang of ['en','ja','zh'])for(const name of Object.keys(data.stations))assert.equal(positionDestination(name,lang,stationName).name,stationName(name,lang));
 assert.equal(positionDestination('미등록행선지','en',stationName).name,'Destination unavailable');
});

test('line 6 Eungam loop destination labels are localized',()=>{
 const raw='응암순환(상선)';
 assert.equal(positionDestination(raw,'ko',stationName,'6','0').bound,raw+'행');
 for(const [lang,expected] of [['en','Loop'],['ja','循環'],['zh','循环']]){
  const translated=positionDestination(raw,lang,stationName,'6','0');
  assert.ok(translated.bound.includes(expected),lang+': '+translated.bound);
  assert.ok(!/[가-힣]/.test(translated.full),lang+': '+translated.full);
 }
});
test('line 6 station track / terminus qualifiers are localized',async()=>{
 const {positionStation}=await import('../app/arrival-test/position/destination.js');
 for(const lang of ['en','ja','zh']){
  const label=positionStation('응암(하선-종착)',lang,stationName);
  assert.ok(!/[가-힣]/.test(label),lang+': '+label);
  assert.ok(label.includes(stationName('응암',lang,false)));
 }
 assert.equal(positionStation('응암(하선-종착)','ko',stationName),'응암(하선-종착)');
});
