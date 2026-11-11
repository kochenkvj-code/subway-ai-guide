import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {positionGroups} from '../app/arrival-test/position/groups.js';
import {positionMessage} from '../app/arrival-test/position/message.js';
import {normalizePositionPayload} from '../app/v2/normalizePositionPayload.js';
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
 assert.match(hook,/normalizePositionPayload\(data,station\.line,response\.ok\)/);
 assert.match(component,/v2-position-detail-grid/);
 assert.match(hook,/30000/);
 assert.match(component,/JSON\.stringify\(row,null,2\)/);
 assert.match(component,/positionStation\(row\.statnNm,lang,stationName\)/);
});
test('V2 home retains two trains, while detail displays three per direction in two columns',()=>{
 assert.match(component,/shownGroups\.map\(\(group,index\)=>/);
 assert.match(component,/\[0,1\]\.map\(i=>/);
 assert.match(component,/\[0,1,2\]\.map\(i=>/);
 assert.match(component,/group\.candidates\[i\]/);
 assert.match(component,/v2-position-detail-grid/);
 assert.match(styles,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(styles,/grid-template-rows:auto repeat\(3,minmax\(0,1fr\)\)/);
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

test('INFO-200 in nested provider result becomes an empty, successful snapshot',()=>{
 const sample={line:'1',raw:{realtimePosition:{RESULT:{CODE:'INFO-200',MESSAGE:'No data'}}}};
 const normalized=normalizePositionPayload(sample,'1',true);
 assert.deepEqual(normalized.raw.realtimePositionList,[]);
 assert.equal(normalized.raw.realtimePosition.RESULT.CODE,'INFO-200');
 assert.equal(sample.raw.realtimePositionList,undefined,'do not mutate upstream payload');
 const other={line:'2',raw:{errorMessage:{code:'INFO-200'}}};
 assert.deepEqual(normalizePositionPayload(other,'2',true).raw.realtimePositionList,[]);
 const root={line:'3',raw:{RESULT:{CODE:'INFO-200'}}};
 assert.deepEqual(normalizePositionPayload(root,'3',true).raw.realtimePositionList,[]);
});
test('valid live positions remain unchanged and real response faults remain distinguishable internally',()=>{
 const rows=[row('종로3가','1','0123','인천')];
 const normal={line:'1',raw:{realtimePositionList:rows}};
 assert.equal(normalizePositionPayload(normal,'1',true),normal);
 assert.throws(()=>normalizePositionPayload(normal,'2',true),/POSITION_LINE_MISMATCH/);
 assert.throws(()=>normalizePositionPayload(normal,'1',false),/POSITION_ERROR/);
 assert.throws(()=>normalizePositionPayload({line:'1',raw:{RESULT:{CODE:'ERROR-301'}}},'1',true),/ERROR-301/);
 assert.throws(()=>normalizePositionPayload({line:'1',raw:{}},'1',true),/INVALID_POSITION_DATA/);
});
test('passenger summary and details show dashes without technical error banners',()=>{
 assert.doesNotMatch(component,/className="v2-summary-notice"/);
 assert.doesNotMatch(component,/className="v2-arrival-message"/);
 assert.match(component,/if\(!item\)return <div className="v2-position-empty" key=\{i\}>—<\/div>/);
 assert.doesNotMatch(component,/v2-position-diagnostics/);
 assert.match(component,/item\?positionMessage\(item,lang\):'—'/);
});

test('summary and detail reverse only column presentation, without mutating direction data',()=>{
 assert.equal((component.match(/const shownGroups=\[\.\.\.groups\]\.reverse\(\);/g)||[]).length,2);
 assert.match(component,/shownGroups\.map\(\(group,index\)=>/);
 assert.match(component,/shownGroups\.map\(\(group,index\)=>/);
 assert.match(component,/group\.candidates\[i\]/);
});
test('train detail heading is one short friendly line and refresh remains present',()=>{
 assert.match(component,/lead:'다음 열차, 어디쯤 왔을까요\?'/);
 assert.match(component,/<h2 title=\{ui\.lead\}>\{ui\.lead\}<\/h2>/);
 assert.match(component,/onClick=\{state\.refresh\}/);
 assert.doesNotMatch(component,/<small>\{ui\.source\}<\/small>/);
 assert.doesNotMatch(component,/<p className="v2-arrival-caption">\{ui\.automatic\}<\/p>/);
 assert.match(styles,/white-space:nowrap;overflow:hidden;text-overflow:ellipsis/);
});
test('destination, train number and location remain visible; time and raw JSON share one disclosure',()=>{
 assert.match(component,/<dt>\{ui\.destination\}<\/dt>/);
 assert.match(component,/<dt>\{ui\.train\}<\/dt>/);
 assert.match(component,/<dt>\{ui\.location\}<\/dt>/);
 assert.match(component,/<details className="v2-position-raw">/);
 assert.match(component,/<summary>\{ui\.updated\} · \{ui\.raw\}<\/summary>/);
 assert.match(component,/v2-position-raw-meta/);
 assert.match(component,/JSON\.stringify\(row,null,2\)/);
 assert.doesNotMatch(component,/<small>\{ui\.updated\}: \{row\.recptnDt/);
 assert.doesNotMatch(component,/v2-position-diagnostics/);
});

test('details retain direction arrows, six cards and per-card raw disclosure',()=>{
 assert.match(component,/shownGroups\.map\(\(group,index\)=>/);
 assert.match(component,/<h3>\{index===0&&<Arrow\/>\}/);
 assert.match(component,/\{index===1&&<Arrow right\/>\}<\/h3>/);
 assert.match(component,/group\.candidates\[i\]/);
 assert.match(component,/<summary>\{ui\.updated\} · \{ui\.raw\}<\/summary>/);
 assert.doesNotMatch(component,/v2-position-diagnostics/);
 assert.match(styles,/\.v2-position-detail-column:nth-child\(2\) h3/);
});
