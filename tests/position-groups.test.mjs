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
