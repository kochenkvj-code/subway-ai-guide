import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModule} from './station-menu-loader.mjs';
for(const kind of ['timetable','facilities'])test(kind+' resolves station codes server-side and isolates transfer lines',async()=>{
 let calls=0;
 const {GET}=await loadModule('app/api/v2/'+kind+'/route.js',{fetch:async url=>{
  calls++;const q=new URL(url).searchParams;assert.equal(q.get('stnNm'),'동묘앞');assert.equal(q.get('lineNm'),'6호선');
  return Response.json({response:{header:{resultCode:'00'},body:{items:{item:[{stnNm:'동묘앞',lineNm:'6호선',trainDptreTm:'12:30',upbdnbSe:'상행',arvlStnNm:'봉화산',trainno:'6001',dtlPstn:'B2'},{stnNm:'동묘앞',lineNm:'1호선',trainDptreTm:'12:31'},{stnNm:'종로5가',lineNm:'1호선',trainDptreTm:'12:32'}]},totalCount:3}}});
 }});
 const r=await GET({url:'https://app.test/api/v2/'+kind+'?stationCode=2637&station=종로5가&line=1&direction=상행'});assert.equal(r.status,200);const d=await r.json();assert.equal(d.stationCode,'2637');assert.equal(d.line,kind==='facilities'?'6호선':'6');
 if(kind==='timetable'){assert.equal(d.rows.length,1);assert.equal(d.rows[0].number,'6001');}else{assert.equal(d.categories.length,6);for(const c of d.categories){assert.equal(c.items.length,1);assert.equal(c.items[0].lineNm,'6호선');}}
 const before=calls;for(const code of ['9999','637','']){const r=await GET({url:'https://app.test/api/v2/'+kind+'?stationCode='+code});assert.equal(r.status,400);}assert.equal(calls,before);
});
test('timetable errors are not cached and valid line 2 directions are preserved',async()=>{
 const {GET}=await loadModule('app/api/v2/timetable/route.js',{fetch:async url=>{assert.equal(new URL(url).searchParams.get('lineNm'),'2호선');throw Error('fixture');}});
 assert.equal((await GET({url:'https://app.test/api/v2/timetable?stationCode=0222&direction=상행'})).status,400);
 const r=await GET({url:'https://app.test/api/v2/timetable?stationCode=0222&direction=내선'});assert.equal(r.status,502);assert.equal(r.headers.get('cache-control'),'no-store');
});

test('facility preview uses read-only public data source without private API key',async()=>{
 const calls=[];
 const {GET}=await loadModule('app/api/v2/facilities/route.js',{
  process:{env:{VERCEL_ENV:'preview'}},
  fetch:async url=>{
   calls.push(String(url));
   return Response.json({ok:true,stationCode:'0154',station:'종로5가',line:'1호선',categories:[{id:'toilet',name:'화장실',count:1,items:[{stnNm:'종로5가',dtlPstn:'B1'}]}]});
  }
 });
 const r=await GET({url:'https://preview.example/api/v2/facilities?stationCode=0154'});
 assert.equal(r.status,200);
 const data=await r.json();
 assert.equal(data.categories[0].items[0].dtlPstn,'B1');
 assert.equal(data.stationCode,'0154');
 assert.equal(calls.length,1);
 assert.equal(new URL(calls[0]).origin,'https://subway-ai-guide.vercel.app');
 assert.equal(new URL(calls[0]).searchParams.get('stationCode'),'0154');
 assert.equal(r.headers.get('Cache-Control'),'no-store');
 const bad=await GET({url:'https://preview.example/api/v2/facilities?stationCode=9999'});
 assert.equal(bad.status,400);
 assert.equal(calls.length,1);
});

test('facility production never proxies without a private API key',async()=>{
 let called=false;
 const {GET}=await loadModule('app/api/v2/facilities/route.js',{
  process:{env:{VERCEL_ENV:'production'}},
  fetch:async()=>{called=true;throw Error('Must not proxy');}
 });
 const r=await GET({url:'https://production.example/api/v2/facilities?stationCode=0154'});
 assert.equal(r.status,503);
 assert.equal((await r.json()).error,'API_KEY_MISSING');
 assert.equal(called,false);
});
