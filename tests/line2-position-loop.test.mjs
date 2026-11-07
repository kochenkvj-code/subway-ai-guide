import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const load=async path=>await readFile(new URL(path,root),'utf8');
const graph=JSON.parse(await load('app/data/trainLostGraph.json'));
const directions=JSON.parse(await load('app/data/trainLostDirection.json'));
const dataModule=async path=>await import('data:text/javascript;base64,'+Buffer.from(await load(path)).toString('base64'));
const {positionGroups}=await dataModule('app/arrival-test/position/groups.js');
const {positionDestination}=await dataModule('app/arrival-test/position/destination.js');

const at='2026-11-07 10:40:00';
const train=(trainNo,statnNm,updnLine,options={})=>({
 subwayId:'1002',trainNo,statnNm,updnLine,statnTnm:'성수종착',
 trainSttus:'1',recptnDt:at,...options
});
const near=(rows,station='건대입구')=>positionGroups(rows,'2',station,graph,directions);
const candidates=(rows,dir,station='건대입구')=>near(rows,station).groups.find(g=>g.dir===dir).candidates;

test('line 2 inner loop can approach Konkuk Univ. from across Seongsu',()=>{
 const inner=candidates([
  train('2102','왕십리','0'),
  train('2104','한양대','0'),
  train('2106','뚝섬','0'),
  train('2108','성수','0')
 ],'0');
 const distances=Object.fromEntries(inner.map(item=>[item.row.statnNm,item.stops]));
 assert.equal(distances['왕십리'],4);
 assert.equal(distances['한양대'],3);
 assert.equal(distances['뚝섬'],2);
 assert.equal(distances['성수'],1);
 assert.deepEqual(inner.slice(0,2).map(item=>item.row.trainNo),['2108','2106']);
});
test('line 2 outer loop still approaches Konkuk Univ. from Guui and Gangbyeon',()=>{
 const outer=candidates([train('2087','구의','1'),train('2089','강변','1')],'1');
 assert.equal(outer.find(item=>item.row.trainNo==='2087').stops,1);
 assert.equal(outer.find(item=>item.row.trainNo==='2089').stops,2);
});
test('branch trains are not allowed onto the line 2 main loop',()=>{
 const outer=candidates([train('1547','용답','1',{statnTnm:'성수종착'})],'1');
 assert.equal(outer.length,0);
});
test('a departed train at the selected station is not approaching',()=>{
 const inner=candidates([train('2104','건대입구','0',{trainSttus:'2'})],'0');
 assert.equal(inner.length,0);
});
test('Seongsu mainline label displays direction only in summary, not raw details',async()=>{
 const stationName=(s,lang)=>lang==='en'?'Seongsu':s;
 assert.equal(positionDestination('성수종착','ko',stationName,'2','0').bound,'성수 · 내선');
 assert.equal(positionDestination('성수종착','ko',stationName,'2','1').bound,'성수 · 외선');
 assert.equal(positionDestination('성수종착','en',stationName,'2','0').bound,'Seongsu · Inner loop');
 assert.ok(positionDestination('성수종착','ko',stationName,'1','0').full.includes('종착'));
 assert.equal(positionDestination('성수지선','ko',stationName,'2','0').full,'성수 · 지선');
 assert.equal(positionDestination('성수','ko',stationName,'2','0').full,'성수');
 assert.equal(positionDestination('성수종착','ko',stationName,'2','0','1548').bound,'성수 · 내선');
 const page=await load('app/arrival-test/position/page.jsx');
 assert.match(page,/<dd>\{r\.statnTnm\|\|'—'\}<\/dd>/);
 assert.match(page,/g\.candidates\.map\(\(\{row:r,stops\},i\)=>/);
});
