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
 assert.equal(positionDestination('미등록행선지','en',stationName).name,'미등록행선지');
});
