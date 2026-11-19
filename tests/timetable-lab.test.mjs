import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHmac} from 'node:crypto';
import {loadAppModule} from './helpers/load-app-module.mjs';import {loadModule} from './station-menu-loader.mjs';
const model=await loadAppModule('app/lib/timetable-lab-model.js');const live=JSON.parse(fs.readFileSync('tests/fixtures/timetable-lab-live.json')).stations;
test('actual API samples classify ordinary, forks, branches, loop and terminals without editing shared direction data',()=>{
 const expected={'0154':['동대문','종로3가'],'0211':['건대입구','뚝섬','용답'],'0234':['대림','문래','도림천'],'0244':['성수','신답'],'2549':['길동','둔촌동','천호'],'2611':['새절','역촌'],'2616':['응암'],'2711':['도봉산']};
 for(const [code,stops]of Object.entries(expected)){const result=model.compileTimetable(live[code],model.timetableStation(code),'2026-11-19');assert.equal(JSON.stringify(result.columns.map(c=>c.next).sort()),JSON.stringify(stops.sort()),code);assert.equal(result.excluded.unclassified,0,code);assert.ok(result.rows.length);}
});
test('expired/future records and arrival-only terminal records are never counted as departures',()=>{
 for(const code of ['0154','2549','0410'])assert.ok(model.compileTimetable(live[code],model.timetableStation(code),'2026-11-19').excluded.expired>0);
 const r=model.compileTimetable(live['2711'],model.timetableStation('2711'),'2026-11-19');assert.ok(r.excluded.arrivalOnly>0);assert.equal(r.columns.length,1);
});
test('overnight times keep service-day ordering, Friday to Saturday still selects Friday',()=>{
 assert.equal(model.serviceMinute('24:10:00'),1450);assert.equal(model.serviceMinute('00:10:00'),1450);assert.equal(model.serviceMinute('25:02'),1502);assert.equal(model.serviceMinute('30:10'),null);
 const c=model.serviceClock(new Date('2026-11-21T00:10:00+09:00'));assert.equal(c.businessDate,'2026-11-20');assert.equal(c.hour,24);assert.equal(model.defaultDay(c),'평일');
 assert.equal(model.defaultDay(model.serviceClock(new Date('2026-11-21T12:00:00+09:00'))),'주말');assert.equal(model.defaultDay(model.serviceClock(new Date('2026-12-25T12:00:00+09:00'))),'공휴일');
});
test('actual line 9 express flags are recognized; unknown direction never guessed or silently hidden',()=>{
 const r=model.compileTimetable(live['4129'],model.timetableStation('4129'),'2026-11-19');assert.ok(r.hasExpress);
 const raw={...live['0154'].groups[0].rows.find(r=>r.trainDptreTm),vldEndDt:null,upbdnbSe:'unknown'};
 const bad=model.compileTimetable({groups:[{ok:true,rows:[raw]}]},model.timetableStation('0154'),'2026-11-19');assert.equal(bad.excluded.unclassified,1);assert.equal(bad.issues[0].type,'unclassified');
});
test('Kkachisan line 2 is available via timetable-only official identity; blank data differs from API failure',()=>{
 const s=model.timetableStation('0200');assert.equal(s.line,'2');assert.equal(s.names.ko,'까치산');assert.equal(model.timetableStation('not-a-station'),null);
 const row={stnCd:'0200',stnNm:'까치산',lineNm:'2호선',brlnNm:'신정지선',upbdnbSe:'외선',trainDptreTm:'05:30:00',trainArvlTm:null,dptreStnNm:'까치산',arvlStnNm:'신도림',trainno:'5501'};
 const r=model.compileTimetable({groups:[{ok:true,rows:[row]}]},s,'2026-11-19');assert.equal(r.columns[0].next,'신정네거리');
 const blank=model.compileTimetable({groups:[{ok:true,rows:[]}]},s,'2026-11-19');assert.equal(blank.issues.length,0);
 const failed=model.compileTimetable({groups:[{ok:false,error:'TIMEOUT',rows:[]}]},s,'2026-11-19');assert.equal(failed.issues[0].type,'request');
});
test('server paginates, filters exact station identity, caches complete results and keeps credentials out of responses',async()=>{
 let calls=0;const row={stnCd:'0154',stnNm:'종로5가',lineNm:'1호선',trainno:'1',trainDptreTm:'05:30:00',upbdnbSe:'상행',arvlStnNm:'동대문'};
 const {GET}=await loadModule('app/api/v2/timetable-lab/route.js',{fetch:async value=>{calls++;const u=new URL(value);assert.equal(u.searchParams.get('stnCd'),'0154');const rows=u.searchParams.get('pageNo')==='1'?[row,{...row,stnCd:'0155',stnNm:'동대문'}]:[{...row}];return Response.json({response:{header:{resultCode:'00'},body:{totalCount:1001,items:{item:rows}}}});}});
 const expiry=String(Date.now()+60000),cookie=expiry+'.'+createHmac('sha256','test-only').update('staff-access:'+expiry).digest('hex');
 const cookies={get:name=>name==='sag_staff_access'?{value:cookie}:undefined};
 assert.equal((await GET({url:'https://test/api?stationCode=0154'})).status,403);
 assert.equal((await GET({url:'https://test/api?stationCode=0154',cookies:{get:()=>({value:cookie+'x'})}})).status,403);
 assert.equal(calls,0);
 const response=await GET({cookies,url:'https://test/api?stationCode=0154&day='+encodeURIComponent('평일')});assert.equal(response.status,200);const b=await response.json();assert.equal(b.rows.length,1);assert.equal(calls,4);assert.equal(JSON.stringify(b).includes('serviceKey'),false);
 await GET({cookies,url:'https://test/api?stationCode=0154&day='+encodeURIComponent('평일')});assert.equal(calls,4);
 assert.equal((await GET({cookies,url:'https://test/api?stationCode=9999'})).status,400);
});

test('historical graph/provider names display canonical Buramsan without changing shared data',()=>{const result=model.compileTimetable(live['0410'],model.timetableStation('0410'),'2026-11-19');assert.ok(result.columns.some(c=>c.next==='불암산'));assert.equal(result.columns.some(c=>c.next==='당고개'),false);});

test('timetable follows the main visual order and preserves real provider direction independently',()=>{
 for(const [code,expected] of Object.entries({'0154':['종로3가','동대문'],'0211':['건대입구','뚝섬','용답'],'0234':['문래','대림','도림천'],'2611':['새절','역촌']})){
 const r=model.compileTimetable(live[code],model.timetableStation(code),'2026-11-19');
 assert.equal(JSON.stringify(r.columns.map(c=>c.next)),JSON.stringify(expected),code);
 }
});
test('static crowding is station/day/hour scoped and does not guess ambiguous directions',async()=>{
 const cm=await loadAppModule('app/lib/timetable-lab-crowding.js');
 const r=model.compileTimetable(live['0154'],model.timetableStation('0154'),'2026-11-19');
 assert.equal(JSON.stringify(cm.timetableCrowding(model.timetableStation('0154'),'평일',14,r.columns)),'[0,0]');
 assert.equal(JSON.stringify(cm.timetableCrowding(model.timetableStation('0154'),'평일',25,r.columns)),'[null,null]');
 const e=model.compileTimetable(live['2611'],model.timetableStation('2611'),'2026-11-19');
 assert.equal(JSON.stringify(cm.timetableCrowding(model.timetableStation('2611'),'평일',8,e.columns)),'[null,null]');
 const g=model.compileTimetable(live['2549'],model.timetableStation('2549'),'2026-11-19');
 assert.equal(cm.timetableCrowding(model.timetableStation('2549'),'평일',8,g.columns).filter(i=>i!==null).length,1);
});

test('half-hour data preserves Gangnam direction differences and missing early slots',async()=>{
 const cm=await loadAppModule('app/lib/timetable-lab-crowding.js');
 const station=model.timetableStation('0222'),cols=[{next:'교대',providerDir:'0'},{next:'역삼',providerDir:'1'}];
 assert.equal(JSON.stringify(cm.crowdingHalves(station,'평일',18,cols)),'[[3,2],[3,1]]');
 assert.equal(JSON.stringify(cm.timetableCrowding(station,'평일',5,cols,0)),'[null,null]');
 assert.equal(JSON.stringify(cm.crowdingHalves(station,'평일',25,cols)),'[[null,null],[null,null]]');
});

test('timetable data and passenger-facing real-time classification share thresholds',async()=>{
 const cm=await loadAppModule('app/lib/timetable-lab-crowding.js');
 const shared=await loadAppModule('app/lib/congestion-data.js');
 assert.equal(JSON.stringify(cm.crowdingThresholds),JSON.stringify(shared.CONGESTION_THRESHOLDS));
 const cols=[{next:'강남',providerDir:'0'},{next:'선릉',providerDir:'1'}];
 assert.equal(JSON.stringify(cm.crowdingHalves(model.timetableStation('0221'),'평일',18,cols)),'[[3,2],[2,1]]');
});

test('administrator-only timetable has a server guard and passenger menu retains its original component',()=>{
 const page=fs.readFileSync('app/v2/timetable-lab/page.jsx','utf8'),guide=fs.readFileSync('app/v2/V2Guide.jsx','utf8'),client=fs.readFileSync('app/v2/timetable-lab/TimetableLab.jsx','utf8');
 assert.match(page,/if\(!staffAuthorized\(\{cookies:await cookies\(\)\}\)\)notFound\(\)/);
 assert.match(guide,/mounted.timetable&&<div className="v2-feature-pane"/);
 assert.match(guide,/staffTools.admin===true\?\(view==='timetable'&&<StaffTimetable/);
 assert.doesNotMatch(guide,/staffTimetableUrl/);
 assert.match(page,/redirect\('\/\?'\+params\)/);
 assert.match(client,/\{!embedded&&<footer className="tl-footer"/);
 assert.match(client,/createCrowdingModel\(crowdingSource\)/);
 assert.doesNotMatch(client,/from ['"]\.\.\/\.\.\/lib\/timetable-lab-crowding['"]/);
});

test('protected crowding dataset rejects anonymous and forged callers',async()=>{
 const {GET}=await loadModule('app/api/v2/timetable-lab/crowding/route.js');
 const expiry=String(Date.now()+60000),cookie=expiry+'.'+createHmac('sha256','test-only').update('staff-access:'+expiry).digest('hex');
 assert.equal((await GET({})).status,403);
 assert.equal((await GET({cookies:{get:()=>({value:cookie+'x'})}})).status,403);
 const authorized=await GET({cookies:{get:()=>({value:cookie})}});
 assert.equal(authorized.status,200);
 assert.match(authorized.headers.get('cache-control'),/private, no-store/);
 assert.deepEqual((await authorized.json()).thresholds,[50,80,110]);
});

test('embedded timetable uses the fixed station and anchors hour shortcuts below the controls',()=>{
 const client=fs.readFileSync('app/v2/timetable-lab/TimetableLab.jsx','utf8'),css=fs.readFileSync('app/v2/timetable-lab/timetable-lab.css','utf8');
 assert.match(client,/\{!embedded&&<header className="tl-top"/);
 assert.match(client,/\{!embedded&&<dialog ref=\{picker\}/);
 assert.ok(client.indexOf('className="tl-rail-anchor"')>client.indexOf('className="tl-crowd-legend"'));
 assert.match(client,/Math.max\(start\+2,bounds.top/);
 assert.match(client,/bounds.bottom-top-8/);
 assert.match(css,/\.tl-embedded \.tl-hour-nav\{top:var\(--tl-rail-top/);
});
