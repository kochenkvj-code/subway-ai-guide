import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {positionGroups} from '../app/arrival-test/position/groups.js';
import {positionMessage} from '../app/arrival-test/position/message.js';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const graph=JSON.parse(await read('app/data/trainLostGraph.json'));
const directions=JSON.parse(await read('app/data/trainLostDirection.json'));
const guide=await read('app/v2/V2Guide.jsx');
const component=await read('app/v2/PositionArrivals.jsx');
const hook=await read('app/v2/usePositionArrivals.js');
const styles=await read('app/v2/position-arrivals.css');
const row=(station,dir,no,dest)=>({
 subwayId:'1006',statnNm:station,updnLine:dir,trainNo:no,statnTnm:dest,trainSttus:'1',
 recptnDt:'2026-11-07 14:40:00'
});
test('V2 home summary and live details reuse the tested position-based components',()=>{
 assert.match(guide,/usePositionArrivals\(view==='home'\|\|view==='live'/);
 assert.match(guide,/<PositionTrainSummary/);
 assert.match(guide,/<PositionArrivalDetails/);
 assert.doesNotMatch(guide,/useTrainArrivals\(/);
 assert.doesNotMatch(guide,/<ArrivalDetails/);
 assert.match(component,/import \{positionGroups\} from '..\/arrival-test\/position\/groups'/);
 assert.match(component,/import \{positionMessage\} from '..\/arrival-test\/position\/message'/);
 assert.match(component,/import \{positionDestination,positionStation\} from '..\/arrival-test\/position\/destination'/);
});
test('V2 uses the raw Seoul realtimePosition endpoint, never old arrival ETA API',()=>{
 assert.match(hook,/\/api\/arrival-test\/position\?line=/);
 assert.doesNotMatch(hook,/\/api\/train-arrivals/);
 assert.match(hook,/realtimePositionList/);
 assert.match(hook,/POSITION_LINE_MISMATCH/);
 assert.match(hook,/30000/);
 assert.match(component,/JSON\.stringify\(row,null,2\)/);
 assert.match(component,/positionStation\(row\.statnNm,lang,stationName\)/);
});
test('V2 retains two columns with two trains per direction and responsive card styles',()=>{
 assert.match(component,/groups\.map\(\(group,index\)=>/);
 assert.match(component,/\[0,1\]\.map\(i=>/);
 assert.match(component,/v2-position-detail-grid/);
 assert.match(styles,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(component,/station\?\.names\?\.ko==='응암'/);
 assert.match(component,/group\.dir==='0'/); // direction grouping stays provider-owned
});
test('line 6 shows upstream Eungam-circle in the original API direction',()=>{
 const a=row('응암','0','6116','응암순환(상선)');
 const b=row('새절','0','6118','응암순환(상선)');
 const x=positionGroups([a,b],'6','독바위',graph,directions);
 const up=x.groups.find(g=>g.dir==='0').trains;
 assert.deepEqual(up.map(x=>[x.row.trainNo,x.stops]),[['6116',3],['6118',4]]);
 assert.equal(up[0].row.statnTnm,'응암순환(상선)');
 assert.equal(up[0].row.updnLine,'0');
});
test('line 6 excludes trains that passed Yeokchon and retains close and distant Gusan trains',()=>{
 const downstream=row('독바위','1','6125','봉화산');
 const upstream=row('응암','0','6116','응암순환(상선)');
 const atYeokchon=positionGroups([downstream,upstream],'6','역촌',graph,directions);
 assert.deepEqual(atYeokchon.groups.find(g=>g.dir==='1').trains,[]);
 assert.equal(atYeokchon.groups.find(g=>g.dir==='0').trains[0].stops,1);
 const atGusan=positionGroups([downstream,upstream],'6','구산',graph,directions);
 assert.equal(atGusan.groups.find(g=>g.dir==='1').trains[0].stops,2);
 assert.equal(atGusan.groups.find(g=>g.dir==='0').trains[0].stops,5);
});
test('compact states are N stops, previous departed, entering, arrived',()=>{
 const msg=(stops,status)=>positionMessage({stops,row:{trainSttus:status}},'ko');
 assert.equal(msg(3,'3'),'3 정거장');
 assert.equal(msg(0,'3'),'전역 출발');
 assert.equal(msg(0,'0'),'진입');
 assert.equal(msg(0,'1'),'도착');
});
