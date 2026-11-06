import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {positionGroups} from '../app/arrival-test/position/groups.js';
const graph=JSON.parse(fs.readFileSync('app/data/trainLostGraph.json')),directions=JSON.parse(fs.readFileSync('app/data/trainLostDirection.json'));
const row=(station,dir,no,status='1')=>({subwayId:'1001',statnNm:station,updnLine:dir,trainNo:no,trainSttus:status,recptnDt:'2020-01-01 00:00:00'});
test('closest two per direction from station, independent of age and status',()=>{
 const rows=[row('용산','0','far'),row('시청','1','near-down'),row('남영','0','near-up','2'),row('종각','1','second-down','0'),row('서울','0','at-station','3'),row('종로3가','1','far-down')];
 const result=positionGroups(rows,'1','서울역',graph,directions);
 assert.deepEqual(result.groups[0].trains.map(t=>t.row.trainNo),['at-station','near-up']);
 assert.deepEqual(result.groups[1].trains.map(t=>t.row.trainNo),['near-down','second-down']);
 assert.equal(result.groups[0].trains[0].row,rows[4]);
 assert.deepEqual(result.groups[0].next,['시청']);assert.deepEqual(result.groups[1].next,['남영']);
});
test('0482 at Jonggak is no longer approaching Seoul in upbound direction',()=>{
 const r=row('종각','0','0482');assert.equal(positionGroups([r],'1','서울역',graph,directions).groups[0].trains.length,0);
 assert.equal(positionGroups([r],'1','종로5가',graph,directions).groups[0].trains[0].stops,2);
});
test('line isolation and circle direction',()=>{
 const r={...row('성수','0','loop'),subwayId:'1002'};
 assert.ok(positionGroups([r],'1','서울역',graph,directions).groups.every(g=>!g.trains.length));
 const result=positionGroups([r],'2','건대입구',graph,directions);assert.deepEqual(result.groups.map(g=>g.dir),['1','0']);assert.equal(result.groups[1].trains[0].stops,1);
});
test('0176 and 0189 duplicate provider events occupy one slot per train',()=>{
 const a={...row('종로3가','0','0176'),recptnDt:'2026-11-06 20:00:45'};
 const b={...a,recptnDt:'2026-11-06 20:01:10'};
 const c={...row('종로5가','1','0189'),recptnDt:'2026-11-06 19:59:47'};
 const d={...c,trainSttus:'2',recptnDt:'2026-11-06 20:01:28'};
 const nextUp=row('종각','0','other-up'),nextDown=row('동대문','1','other-down');
 const rows=[a,d,c,b,nextUp,nextDown];
 const g=positionGroups(rows,'1','종로5가',graph,directions).groups;
 assert.deepEqual(g[0].trains.map(x=>x.row.trainNo),['0176','other-up']);
 assert.deepEqual(g[1].trains.map(x=>x.row.trainNo),['other-down'],'latest 0189 has already departed selected station');
 assert.equal(g[0].trains[0].row,b);assert.equal(g[1].trains[0].row,nextDown);
 assert.equal(rows.length,6,'raw source snapshot remains intact');
});
test('latest position is chosen before distance and direction grouping',()=>{
 const old={...row('서울','0','0482'),recptnDt:'2026-11-06 19:34:00'};
 const current={...old,statnNm:'종각',recptnDt:'2026-11-06 19:41:25'};
 assert.equal(positionGroups([old,current],'1','서울역',graph,directions).groups[0].trains.length,0);
 const turned={...old,updnLine:'1',recptnDt:'2026-11-06 20:00:00'};
 const groups=positionGroups([old,turned],'1','서울역',graph,directions).groups;
 assert.equal(groups[0].trains.length,0);assert.equal(groups[1].trains[0].row,turned);
});
test('split date/time stamps and zero-padded train identities',()=>{
 const old={...row('종각','0','0176'),recptnDt:'20:00:00',lastRecptnDt:'20261106'};
 const newer={...old,trainNo:'176',statnNm:'종로3가',recptnDt:'20:01:00'};
 const g=positionGroups([old,newer],'1','종로5가',graph,directions).groups[0];
 assert.equal(g.trains.length,1);assert.equal(g.trains[0].row,newer);
});
test('selected-station departure gives its slot to the next distinct train',()=>{
 const arrived={...row('종로5가','0','0176','1'),recptnDt:'2026-11-06 20:01:00'};
 const departed={...arrived,trainSttus:'2',recptnDt:'2026-11-06 20:02:00'};
 const previousDeparture=row('종로3가','0','next','2'),following=row('종각','0','following','0');
 const g=positionGroups([arrived,departed,previousDeparture,following],'1','종로5가',graph,directions).groups[0];
 assert.deepEqual(g.trains.map(x=>x.row.trainNo),['next','following']);
 assert.equal(g.trains[0].row,previousDeparture,'previous station departure remains visible');
});
test('entry and arrival at selected station remain visible in either direction',()=>{
 for(const dir of ['0','1'])for(const state of ['0','1']){
 const r=row('종로5가',dir,'current',state);
 const g=positionGroups([r],'1','종로5가',graph,directions).groups.find(g=>g.dir===dir);
 assert.equal(g.trains[0].row,r);
 }
});
