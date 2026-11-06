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
test('line 1 corroborates destinations independently while preserving a valid ETA from a duplicate',async()=>{
 let positionCalls=0;
 const get=await handler(async value=>{
   if(value.includes('/realtimePosition/')){positionCalls++;return Response.json({realtimePositionList:[{trainNo:'0466',updnLine:'0',statnTnm:'광운대',recptnDt:fresh()}]});}
   const stamp=fresh();return Response.json({realtimeArrivalList:[
     {...train('종로5가','1001','상행','동대문','0466'),trainLineNm:'광운대행 - 동대문방면',recptnDt:stamp,barvlDt:'180'},
     {...train('종로5가','1001','상행','동대문','0466'),trainLineNm:'동묘앞행 - 동대문방면',recptnDt:stamp,barvlDt:'0'}
   ]});
 },'fixture-arrival','fixture-position');
 const body=await (await get(req('0154'))).json(),t=body.groups[0].trains[0];
 assert.equal(t.destination,'광운대');assert.equal(t.destinationSource,'realtimePosition');assert.ok(t.estimatedAt);assert.equal(t.trainNo,'0466');assert.equal(positionCalls,1);
 await get(req('0154'));assert.equal(positionCalls,1);
});
test('position lookup failure does not fail arrivals or guess conflicting destinations',async()=>{
 const get=await handler(async value=>{
   if(value.includes('/realtimePosition/'))throw Error('unavailable');
   return Response.json({realtimeArrivalList:[
     {...train('종로5가','1001','상행','동대문','0466'),trainLineNm:'광운대행 - 동대문방면'},
     {...train('종로5가','1001','상행','동대문','0466'),trainLineNm:'동묘앞행 - 동대문방면'}
   ]});
 },'fixture-arrival','fixture-position');
 const response=await get(req('0154'));assert.equal(response.status,200);
 assert.equal((await response.json()).groups[0].trains[0].destination,'');
});

test('all 30 known TOPIS provider names are queried without changing station identity',async()=>{
 const cases=[
  ['0150','서울'],['0426','서울'],['0432','총신대입구(이수)'],
  ['2520','신정(은행정)'],['2522','오목교(목동운동장앞)'],['2545','군자(능동)'],
  ['2546','아차산(어린이대공원후문)'],['2547','광나루(장신대)'],['2548','천호(풍납토성)'],
  ['2551','굽은다리(강동구민회관앞)'],['2556','올림픽공원(한국체대)'],
  ['2611','응암순환(상선)'],['2617','새절(신사)'],['2618','증산(명지대앞)'],
  ['2620','월드컵경기장(성산)'],['2626','대흥(서강대앞)'],['2640','안암(고대병원앞)'],
  ['2642','월곡(동덕여대)'],['2643','상월곡(한국과학기술연구원)'],['2647','화랑대(서울여대입구)'],
  ['2718','공릉(서울산업대입구)'],['2727','군자(능동)'],['2728','어린이대공원(세종대)'],
  ['2730','뚝섬유원지'],['2738','총신대입구(이수)'],['2740','숭실대입구(살피재)'],
  ['2741','상도(중앙대앞)'],['2812','천호(풍납토성)'],
  ['2814','몽촌토성(평화의문)'],['2823','남한산성입구(성남법원,검찰청)']
 ];
 const captured=[];
 const get=await handler(async value=>{
  const url=new URL(value),name=decodeURIComponent(url.pathname.split('/').pop());
  captured.push(name);
  const code=cases[captured.length-1][0],line=code.startsWith('01')?'1001':code.startsWith('04')?'1004':'100'+code[1];
  return Response.json({errorMessage:{code:'INFO-000'},realtimeArrivalList:[train(name,line,'상행','동묘앞','5'+code)]});
 });
 for(const [code,name] of cases){
  const response=await get(req(code)),body=await response.json();
  assert.equal(response.status,200,code);
  assert.equal(body.station.stationCode,code);
  assert.equal(captured.at(-1),name,code);
  assert.ok(body.groups.some(g=>g.trains.length>0),code+' should not lose valid rows');
 }
 assert.equal(captured.length,30);
});
