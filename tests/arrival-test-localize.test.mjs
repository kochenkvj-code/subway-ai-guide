import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createArrivalLocalizer} from '../app/arrival-test/localize.js';
// Load the existing production name resolver with its exact checked-in dataset.
const data=JSON.parse(fs.readFileSync(new URL('../app/data/subwayStations.json',import.meta.url)));
const source=fs.readFileSync(new URL('../app/lib/stationNameI18n.js',import.meta.url),'utf8').replace('import rawData from "../data/subwayStations.json";',`const rawData=${JSON.stringify(data)};`);
const {stationName}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const translate=createArrivalLocalizer(stationName);
test('all registered destinations use the existing multilingual directory',()=>{
 for(const lang of ['en','ja','zh'])for(const ko of Object.keys(data.stations)){
 const result=translate(ko+'행',lang);assert.ok(!/[가-힣]/.test(result),lang+': '+result);assert.ok(result.includes(stationName(ko,lang,false)));
 }
});
test('compound destination, direction, station, status and message templates',()=>{
 for(const lang of ['en','ja','zh'])for(const text of ['양주행','연천행','소요산행','인천행','성수(내선)행','성수(외선)행','구로(급행)행','양주','양주 · 인천','상행','하행','내선','외선','일반','급행','2분 후','2분 30초 후 (양주)','30초 후 (인천)','[10]번째 전역 (연천)','전역 도착','전역출발','양주 진입','인천도착','도착','종착'])assert.ok(!/[가-힣]/.test(translate(text,lang)),lang+': '+text);
 assert.equal(translate('양주행','en'),'To Yangju');
 assert.equal(translate('성수(내선)행','en'),'To Seongsu (Inner loop)');
});
test('unknown data is kept intact instead of mixing translated labels with Korean',()=>{
 for(const lang of ['en','ja','zh'])for(const text of ['미등록행선지행','미등록역 도착','2분 후 (미등록역)','이례적인 원본 문구'])assert.equal(translate(text,lang),text);
 assert.equal(translate('양주행','ko'),'양주행');
});
