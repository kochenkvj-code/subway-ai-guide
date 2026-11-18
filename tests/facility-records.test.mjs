import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModule} from './station-menu-loader.mjs';
const warnings=[];
const {uniqueFacilityRecords:unique}=await loadModule('app/lib/facility-records.js',{console:{warn:(...args)=>warnings.push(args)}});
const locker=(id='TL129A',number='1~19',count=19)=>({stnCd:'0154',stnNm:'종로5가',lineNm:'1호선',lckrId:id,lckrDtlId:id+'_DETAIL',lckrNm:number,lckrCnt:count,lckrDtlLocNm:'중앙게이트 주변',totCrtrDt:'2026-11-18T10:40:03'});
test('Jongno 5-ga retains two banks and 32 compartments; Dongmyo retains one bank and nine',()=>{
 const a=locker(),b=locker('TL129B','20~32',13);
 const rows=unique([a,b,{...a},{...b}],'locker');
 assert.equal(rows.length,2);assert.equal(rows.reduce((n,r)=>n+r.lckrCnt,0),32);assert.equal(rows[0],a);
 const d={...locker('TL127A','1~9',9),stnCd:'0159',stnNm:'동묘앞'};
 assert.equal(unique([d,{...d}],'locker').length,1);
});
test('nested object key order is ignored, while arrays, types, null and missing fields remain distinct',()=>{
 const a={x:{b:2,a:1},list:[1,2]},b={list:[1,2],x:{a:1,b:2}};
 assert.equal(unique([a,b],'atm').length,1);
 assert.equal(unique([{x:1},{x:'1'},{x:null},{},{x:[1,2]},{x:[2,1]}],'atm').length,6);
});
test('different IDs at one location and changed content at one ID are all retained and diagnosed',()=>{
 const a=locker(),b=locker('TL129B'),c={...a,totCrtrDt:'2026-11-18T10:41:03'};
 warnings.length=0;const rows=unique([a,b,c,{...c}],'locker');
 assert.equal(rows.length,3);assert.equal(warnings.length,1);
 assert.equal(JSON.stringify(warnings[0][1].fields),JSON.stringify(['totCrtrDt']));
 assert.equal(JSON.stringify(a),JSON.stringify(locker()));
});
test('missing ID only removes identical records; every facility type supports exact deduplication',()=>{
 for(const type of ['locker','elevator','escalator','toilet','nursing','atm','customerOffice']){
  assert.equal(unique([{location:'B1'},{location:'B1'},{location:'B2'}],type).length,2);
 }
});
test('API merges pages before deduplication and caches corrected category counts',async()=>{
 let calls=0;const a=locker(),b=locker('TL129B','20~32',13);
 const {GET}=await loadModule('app/api/v2/facilities/route.js',{console:{warn(){}},fetch:async url=>{
  calls++;const u=new URL(url),endpoint=u.pathname.split('/').at(-1),page=u.searchParams.get('pageNo');
  const items=endpoint==='getFcLckr'?(page==='1'?[a,b,{...a}]:[{...b}]):[{stnCd:'0154',stnNm:'종로5가',lineNm:'1호선',fcltNo:endpoint}, {stnCd:'0154',stnNm:'종로5가',lineNm:'1호선',fcltNo:endpoint}];
  return Response.json({response:{header:{resultCode:'00'},body:{totalCount:endpoint==='getFcLckr'?101:2,items:{item:items}}}});
 }});
 const body=await (await GET({url:'https://test/api?stationCode=0154'})).json();
 assert.equal(body.ok,true);assert.equal(calls,7);
 for(const cat of body.categories)assert.equal(cat.count,cat.id==='locker'?2:1);
 const again=await (await GET({url:'https://test/api?stationCode=0154'})).json();assert.equal(calls,7);assert.equal(again.categories.find(c=>c.id==='locker').count,2);
});
test('customer safety office duplicates are removed without changing identity or source mapping',async()=>{
 const {stationOfficeFor}=await loadModule('app/lib/station-office.js');
 const row={stnCd:'0154',stnNm:'종로5가',lineNm:'1호선',dtlPstn:'B1'};
 const r=stationOfficeFor({stationCode:'0154',names:{ko:'종로5가'},line:'1'},[row,{...row}]);
 assert.equal(r.status,'direct');assert.equal(r.category.count,1);
});
