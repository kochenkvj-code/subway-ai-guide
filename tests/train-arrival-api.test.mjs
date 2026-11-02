import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
async function handler(fetch,key='fixture-key',positionKey=null){
 const context=vm.createContext({Response,AbortSignal,URL,Date,Map,Set,process:{env:key?{SEOUL_SUBWAY_ARRIVAL_API_KEY:key,...(positionKey?{SEOUL_SUBWAY_POSITION_API_KEY:positionKey}:{})}:{}},fetch});
 const route=new vm.SourceTextModule(await fs.readFile('app/api/train-arrivals/route.js','utf8'),{context});
 const cache=new Map();
 async function load(file){if(cache.has(file))return cache.get(file);const mod=file.endsWith('.json')?new vm.SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(requireText.get(file)));},{context}):new vm.SourceTextModule(await fs.readFile(file,'utf8'),{context});cache.set(file,mod);await mod.link(async name=>{const {resolve,dirname}=await import('node:path');const target=resolve(dirname(file),name.endsWith('.json')?name:name+'.js');if(target.endsWith('.json'))requireText.set(target,await fs.readFile(target,'utf8'));return load(target);});return mod;}
 const requireText=new Map();const {resolve}=await import('node:path');await route.link(name=>load(resolve('app/api/train-arrivals',name+'.js')));await route.evaluate();return route.namespace.GET;
}
test('missing configuration makes no upstream call and returns a safe non-cacheable error',async()=>{
 const get=await handler(()=>{throw new Error('must not fetch');},null),r=await get();assert.equal(r.status,503);assert.equal((await r.json()).code,'NOT_CONFIGURED');assert.equal(r.headers.get('cache-control'),'no-store');
});
test('fixed station URL, concurrent-request coalescing and short cache avoid repeated upstream requests',async()=>{
 let calls=0;const get=await handler(async value=>{calls++;const url=new URL(value);assert.equal(url.hostname,'swopenapi.seoul.go.kr');assert.ok(decodeURIComponent(url.pathname).endsWith('/0/40/종로5가'));await new Promise(resolve=>setTimeout(resolve,5));return Response.json({errorMessage:{code:'INFO-000'},realtimeArrivalList:[]});});
 const results=await Promise.all([get(),get()]);assert.ok(results.every(x=>x.status===200));assert.equal(calls,1);assert.equal((await get()).status,200);assert.equal(calls,1);assert.equal((await results[0].json()).status,'empty');
});
test('provider authentication errors and network failures never disclose credential paths',async()=>{
 const get=await handler(async()=>Response.json({code:'ERROR-301',message:'secret fixture-key http://example.com/fixture-key'}));const r=await get();assert.equal(r.status,502);const body=await r.text();assert.ok(body.includes('ERROR-301'));assert.ok(!body.includes('fixture-key'));assert.ok(!body.includes('http://'));
 const failed=await handler(async()=>{throw new Error('http://example.com/fixture-key')});assert.equal((await failed()).status,502);
});

const req=code=>({url:'https://app.test/api/train-arrivals?station='+code});
const fresh=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,19).replace('T',' ');
const train=(name,line,direction,next,no='1234')=>({statnNm:name,subwayId:line,updnLine:direction,trainLineNm:'응암행 - '+next+'방면',recptnDt:fresh(),arvlCd:'99',barvlDt:'120',btrainNo:no,ordkey:'01001'});
test('multi-station requests coalesce/cache independently and filter transfer lines',async()=>{
 const calls=[];const get=await handler(async value=>{const url=new URL(value),name=decodeURIComponent(url.pathname.split('/').pop());calls.push(name);await new Promise(r=>setTimeout(r,5));return Response.json({realtimeArrivalList:name==='종각'?[train(name,'1001','상행','종로3가')]:[train(name,'1006','상행','신당'),train(name,'1001','상행','동대문','wrong-line')]});});
 const [a,b,c]=await Promise.all([get(req('0152')),get(req('0152')),get(req('2637'))]);assert.equal(calls.length,2);const j=await a.json(),d=await c.json();assert.equal(j.station.stationCode,'0152');assert.equal(d.station.stationCode,'2637');assert.equal(j.groups[0].nextStation,'종로3가');assert.equal(d.groups[0].nextStation,'신당');assert.equal(d.groups.flatMap(g=>g.trains).length,1);assert.equal((await b.json()).station.stationCode,'0152');await get(req('2637'));assert.equal(calls.length,2);
});
test('invalid station never reaches upstream; missing provider directions never fall back to Jongno 5-ga',async()=>{
 let calls=0;const get=await handler(async()=>{calls++;return Response.json({realtimeArrivalList:[]});});for(const code of ['9999','154','','0200'])assert.equal((await get(req(code))).status,400);assert.equal(calls,0);const body=await (await get(req('2637'))).json();assert.equal(body.status,'empty');assert.equal(body.groups.length,0);assert.equal(body.station.name,'동묘앞');
});
test('branches, loop providers and renamed station aliases use only provider direction names',async()=>{
 const get=await handler(async value=>{const name=decodeURIComponent(new URL(value).pathname.split('/').pop());const data=name==='강동'?[train(name,'1005','하행','길동','1'),train(name,'1005','하행','둔촌동','2')]:name==='강남'?[train(name,'1002','내선','역삼')]:name==='불암산'?[train('당고개','1004','하행','상계')]:[train(name,'1008','하행','INVALID_NOT_A_STATION')];return Response.json({realtimeArrivalList:data});});
 const branch=await (await get(req('2549'))).json();assert.deepEqual(branch.groups.find(g=>g.provider==='하행').nextStations,['길동','둔촌동']);
 const loop=await (await get(req('0222'))).json();assert.deepEqual(loop.groups.map(g=>g.provider),['내선','외선']);assert.equal(loop.groups[0].nextStation,'역삼');
 const renamed=await (await get(req('0409'))).json();assert.equal(renamed.groups.flatMap(g=>g.trains).length,1);
 const unknown=await (await get(req('2810'))).json();assert.equal(unknown.groups[1].nextStation,'');assert.equal(unknown.groups[1].trains.length,1);
});

test('Seoul and City Hall supplement current upstream positions without invented ETAs or duplicate trains',async()=>{
 let positionCalls=0;
 const get=await handler(async value=>{const url=new URL(value);if(url.pathname.includes('/realtimePosition/')){positionCalls++;return Response.json({realtimePositionList:[{subwayId:'1001',trainNo:'0462',statnNm:'서울',updnLine:'0',statnTnm:'청량리',trainSttus:'1',recptnDt:fresh()},{subwayId:'1001',trainNo:'0116',statnNm:'남영',updnLine:'0',statnTnm:'의정부',trainSttus:'1',recptnDt:fresh()},{subwayId:'1001',trainNo:'passed',statnNm:'종각',updnLine:'0',statnTnm:'청량리',trainSttus:'1',recptnDt:fresh()},{subwayId:'1002',trainNo:'other-line',statnNm:'서울',updnLine:'0',statnTnm:'청량리',trainSttus:'1',recptnDt:fresh()}]});}return Response.json({realtimeArrivalList:[]});},'fixture-key','position-fixture');
 const [a,b]=await Promise.all([get(req('0150')),get(req('0151'))]);const seoul=await a.json(),city=await b.json();assert.equal(positionCalls,1);assert.equal(seoul.status,'ok');const up=seoul.groups.find(g=>g.provider==='상행');assert.deepEqual(up.trains.map(t=>t.trainNo),['0462','0116']);assert.ok(up.trains.every(t=>t.estimatedAt===null&&t.arrivalCode==='position'));assert.equal(city.groups[0].trains[0].trainNo,'0462');assert.ok(!up.trains.some(t=>['passed','other-line'].includes(t.trainNo)));
});
test('position failure does not break genuine station arrivals',async()=>{
 const get=await handler(async value=>new URL(value).pathname.includes('/realtimePosition/')?new Response(null,{status:503}):Response.json({realtimeArrivalList:[train('서울','1001','상행','시청')]}),'fixture-key','position-fixture');const r=await get(req('0150'));assert.equal(r.status,200);assert.equal((await r.json()).groups[0].trains[0].trainNo,'1234');
});
test('provider train identifiers remain untouched, including main-line 3xxx and branch identifiers',async()=>{
 const get=await handler(async()=>Response.json({realtimeArrivalList:[train('건대입구','1002','내선','구의','3266'),train('건대입구','1002','외선','성수','2289')]}));const data=await (await get(req('0212'))).json();assert.equal(data.groups[0].trains[0].trainNo,'3266');assert.equal(data.groups[0].trains[0].displayTrainNo,undefined);assert.equal(data.groups[1].trains[0].trainNo,'2289');
});
test('older positions cannot erase newer arrivals; stale and terminating-before-target positions cannot add ghosts',async()=>{
 const ago=seconds=>new Date(Date.now()-seconds*1000+9*3600000).toISOString().slice(0,19).replace('T',' ');
 const get=await handler(async value=>new URL(value).pathname.includes('/realtimePosition/')?Response.json({realtimePositionList:[{subwayId:'1001',trainNo:'1234',statnNm:'시청',updnLine:'0',statnTnm:'청량리',trainSttus:'1',recptnDt:ago(30)},{subwayId:'1001',trainNo:'stale',statnNm:'서울',updnLine:'0',statnTnm:'청량리',trainSttus:'1',recptnDt:ago(180)},{subwayId:'1001',trainNo:'terminates',statnNm:'남영',updnLine:'0',statnTnm:'남영',trainSttus:'1',recptnDt:fresh()}]}):Response.json({realtimeArrivalList:[train('서울','1001','상행','시청')]}),'fixture-key','position-fixture');
 const data=await (await get(req('0150'))).json();const rows=data.groups.flatMap(g=>g.trains);assert.deepEqual(rows.map(t=>t.trainNo),['1234']);assert.ok(rows[0].estimatedAt);
});
