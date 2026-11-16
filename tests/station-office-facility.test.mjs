import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadAppModule} from './helpers/load-app-module.mjs';
import {loadModule} from './station-menu-loader.mjs';
const records=JSON.parse(await fs.readFile('tests/fixtures/station-offices.json'));
const {stationMaster,getStationByCode}=await loadAppModule('app/lib/station-master.js');
const {stationOfficeFor}=await loadAppModule('app/lib/station-office.js');
const {translateFacilityText}=await loadAppModule('app/lib/facility-i18n.js');
const globals={process:{env:{SEOUL_METRO_STATION_OFFICE_API_KEY:'fixture'}}};
function provider(){let calls=0;return {fetch:async url=>{calls++;const u=new URL(url);assert.equal(u.origin,'https://apis.data.go.kr');assert.equal(u.searchParams.get('dataType'),'XML');const page=Number(u.searchParams.get('pageNo')),items=records.slice((page-1)*100,page*100);return Response.json({response:{header:{resultCode:'00'},body:{totalCount:records.length,items:{item:items}}}});},get calls(){return calls;}};}

test('276 line 1–8 identities resolve to 266 direct, nine explicitly shared, Amsa History Park excluded',()=>{
 const counts={direct:0,shared:0,excluded:0};
 const targets=stationMaster.filter(s=>Number(s.line)<=8);assert.equal(targets.length,276);
 for(const station of targets){const result=stationOfficeFor(station,records);counts[result.status]++;
  if(result.status==='excluded'){assert.equal(station.stationCode,'2810');continue;}
  assert.ok(result.category.items.length);
  for(const row of result.category.items){assert.equal(row.stnNm,station.names.ko);assert.equal(row.stnCd,result.sourceStationCode);}
  if(result.status==='shared')assert.notEqual(result.sourceStationCode,station.stationCode);
 }
 assert.deepEqual(counts,{direct:266,shared:9,excluded:1});
 for(const station of stationMaster.filter(s=>s.line==='9'))assert.equal(stationOfficeFor(station,records).status,'excluded');
});
test('same-name results do not automatically create new sharing, and wrong names/lines are rejected',()=>{
 const station=getStationByCode('0154');
 assert.equal(stationOfficeFor(station,[{...records[0],stnCd:'9999',stnNm:'종로5가'}]).status,'missing');
 const shared=getStationByCode('0311');
 for(const changes of [{stnNm:'다른역'},{lineNm:'1호선'}])assert.equal(stationOfficeFor(shared,records.map(r=>({...r,...changes}))).status,'missing');
});
test('real location strings, floor and phone values remain available without fabricated translations',()=>{
 for(const row of records)for(const lang of ['en','ja','zh']){
  const result=translateFacilityText(row.dtlPstn,lang);
  assert.ok(result.text);if(result.untranslated)assert.equal(result.text,result.original);else assert.doesNotMatch(result.text,/[가-힣]/);
 }
});
test('facility endpoint preserves base identity, shares source metadata, caches transport and excludes line 9',async()=>{
 const upstream=provider(),{GET}=await loadModule('app/api/v2/station-office/route.js',{...globals,fetch:upstream.fetch});
 for(const code of ['0154','0311']){const response=await GET({url:'https://test/api?stationCode='+code});assert.equal(response.status,200);const body=await response.json();assert.equal(body.stationCode,code);assert.equal(body.status,code==='0311'?'shared':'direct');if(code==='0311')assert.equal(body.category.items[0].stnCd,'2615');}
 assert.equal(upstream.calls,3);
 const missing=await (await GET({url:'https://test/api?stationCode=2810'})).json();assert.equal(missing.status,'excluded');assert.equal(missing.category,null);
 const before=upstream.calls;
 for(const code of ['9999','0200','154'])assert.equal((await GET({url:'https://test/api?stationCode='+code})).status,400);
 const nine=stationMaster.find(s=>s.line==='9');assert.equal((await (await GET({url:'https://test/api?stationCode='+nine.stationCode})).json()).status,'excluded');assert.equal(upstream.calls,before);
});
test('audit retains all 290 review entries and source counts through the shared provider',async()=>{
 const upstream=provider(),{GET}=await loadModule('app/api/v2/station-office-test/route.js',{...globals,fetch:upstream.fetch});
 const result=await (await GET()).json();assert.equal(result.ok,true);assert.equal(result.rows.length,290);assert.equal(result.stats.direct,266);assert.equal(result.stats.sharedCandidate,13);assert.equal(result.stats.missing,11);
});
test('XML provider transport preserves location and phone',async()=>{
 const {GET}=await loadModule('app/api/v2/station-office/route.js',{...globals,fetch:async()=>new Response('<response><header><resultCode>00</resultCode></header><body><totalCount>1</totalCount><items><item><stnCd>0154</stnCd><stnNm>종로5가</stnNm><lineNm>1호선</lineNm><dtlPstn>B1층 대합실</dtlPstn><operInstTelno>0261101291</operInstTelno><utztnPsbltyHr>05:00~00:00</utztnPsbltyHr></item></items></body></response>')});
 const response=await GET({url:'https://test/api?stationCode=0154'});assert.equal(response.status,200);const result=await response.json();assert.equal(result.category.items[0].dtlPstn,'B1층 대합실');assert.equal(result.category.items[0].operInstTelno,'0261101291');
});
test('provider failures return a retryable response without exposing credentials or misreporting missing data',async()=>{
 const {GET}=await loadModule('app/api/v2/station-office/route.js',{...globals,fetch:async()=>{throw Error('fixture-secret');}});const response=await GET({url:'https://test/api?stationCode=0154'});assert.equal(response.status,503);assert.equal((await response.json()).error,'OFFICE_UNAVAILABLE');
});

test('verified portal is used first, remaining pages run concurrently, and only successful station responses are publicly cached',{timeout:3000},async()=>{
 let releaseSecond,startedSecond=false,calls=0;
 const {GET}=await loadModule('app/api/v2/station-office/route.js',{process:{env:{SEOUL_METRO_STATION_OFFICE_API_KEY:'a'.repeat(32),SEOUL_METRO_FACILITY_API_KEY:'portal-fixture'}},fetch:async value=>{
  const u=new URL(value);assert.equal(u.origin,'https://apis.data.go.kr');assert.equal(u.searchParams.get('serviceKey'),'portal-fixture');calls++;
  const page=Number(u.searchParams.get('pageNo'));
  if(page===2){startedSecond=true;await new Promise(resolve=>{releaseSecond=resolve;});}
  if(page===3){assert.ok(startedSecond);releaseSecond();}
  return Response.json({response:{header:{resultCode:'00'},body:{totalCount:records.length,items:{item:records.slice((page-1)*100,page*100)}}}});
 }});
 const response=await GET({url:'https://test/api?stationCode=0154'});
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/s-maxage=600/);assert.match(response.headers.get('cache-control'),/stale-while-revalidate=3600/);
 assert.equal((await response.json()).stationCode,'0154');assert.equal(calls,3);
 const invalid=await GET({url:'https://test/api?stationCode=9999'});assert.equal(invalid.status,400);assert.equal(invalid.headers.get('cache-control'),'no-store');
});
