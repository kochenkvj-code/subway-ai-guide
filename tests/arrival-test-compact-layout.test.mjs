import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=async path=>readFile(new URL(path,root),'utf8');
const page=await read('app/arrival-test/page.jsx');
const css=await read('app/arrival-test/arrival-test.css');
const source=await read('app/arrival-test/position/groups.js');
const {positionGroups}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const graph=JSON.parse(await read('app/data/trainLostGraph.json'));
const directions=JSON.parse(await read('app/data/trainLostDirection.json'));

test('compact detail view renders two directions side-by-side and exactly two rows each',()=>{
 assert.match(page,/className="at-detail-grid"/);
 assert.match(page,/groups\.map\(g=><section className="v2-arrival-group at-detail-column"/);
 assert.match(page,/\[0,1\]\.map\(i=>\{const item=g\.trains\[i\]/);
 assert.match(css,/\.arrival-test \.at-detail-grid\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.arrival-test \.at-detail-column\s*\{[^}]*grid-template-rows:auto repeat\(2,minmax\(0,1fr\)\)/);
});
test('detail keeps original information and per-train raw JSON',()=>{
 assert.match(page,/positionDestination\(r\.statnTnm,lang,stationName,station\?\.line,r\.updnLine\)\.full/);
 assert.match(page,/\{value\(r\.trainNo\)\}/);
 assert.match(page,/\{positionStation\(r\.statnNm,lang,stationName\)/);
 assert.match(page,/JSON\.stringify\(r,null,2\)/);
 assert.match(page,/title=\{value\(r\.recptnDt\)\}/);
 assert.match(page,/onClick=\{\(\)=>changeView\('details'\)\}/);
});
test('live grouping still selects up to two trains in each direction',()=>{
 const row=(no,loc,dir)=>({
  subwayId:'1008',trainNo:no,statnNm:loc,updnLine:dir,
  statnTnm:dir==='0'?'별내':'모란',trainSttus:'1',
  recptnDt:'2026-11-07 11:40:00'
 });
 const {groups}=positionGroups([
  row('8091','천호','0'),row('8093','잠실','0'),row('8095','모란','0'),
  row('8092','암사역사공원','1'),row('8094','장자호수공원','1'),row('8096','별내','1')
 ],'8','암사',graph,directions);
 assert.deepEqual(groups.map(g=>g.trains.length),[2,2]);
});

test('language selector also localizes detail statuses and station-picker copy while keeping raw provider JSON',()=>{
 assert.match(page,/positionStation\(r\.statnNm,lang,stationName\)/);
 assert.match(page,/Left previous station/);
 assert.match(page,/\{t\.pick\}/);
 assert.match(page,/\{t\.requestLine\}/);
 assert.match(page,/JSON\.stringify\(r,null,2\)/);
});

test('Eungam has distinct next-station headings, not a combined Yeokchon/Saejeol label',()=>{
 assert.match(page,/station\?\.line==='6'&&station\?\.names\.ko==='응암'/);
 assert.match(page,/g\.dir==='0'\?'역촌':'새절'/);
 assert.match(page,/stationName\(g\.dir==='0'\?'역촌':'새절',lang\)/);
 // The grouped provider rows and their original directions are unchanged.
 assert.match(page,/positionGroups\(all,station\?\.line,station\?\.names\.ko,graph,directions\)/);
});
