import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
async function handler(fetch,key='fixture') {
 const context=vm.createContext({Response,AbortSignal,URL,URLSearchParams,Date,Intl,Map,Set,process:{env:key?{SEOUL_METRO_API_KEY:key}:{}},fetch});
 const cache=new Map();
 async function load(file){
  if(cache.has(file))return cache.get(file);
  const text=await fs.readFile(file,'utf8');
  const mod=file.endsWith('.json')?new vm.SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(text));},{context}):new vm.SourceTextModule(text,{context});
  cache.set(file,mod);
  await mod.link(name=>load(path.resolve(path.dirname(file),name.endsWith('.json')?name:name+'.js')));
  return mod;
 }
 const mod=await load(path.resolve('app/api/subway-route/route.js'));await mod.evaluate();return mod.namespace.GET;
}
const req=query=>({url:'https://app.test/api/subway-route?'+query});
function body(name='종각',code='0152',line='1호선',destination='강남'){
 return {header:{resultCode:'00'},body:{totalReqHr:1200,totalDstc:12000,totalCardCrg:1550,trsitNmtm:0,paths:[{dptreStn:{stnNm:name,stnCd:code,lineNm:line},arvlStn:{stnNm:destination,stnCd:'0222',lineNm:line},reqHr:1200,trsitYn:'N'}]}};
}
test('V2 uses the exact entry code, including transfer line and Seoul alias',async()=>{
 for(const [code,name,line]of [['0152','종각','1호선'],['2637','동묘앞','06호선'],['0319','종로3가','3호선'],['0150','서울','1호선']]){
  const get=await handler(async value=>{const q=new URL(value).searchParams;assert.equal(q.get('dptreStn'),code);assert.equal(q.get('arvlStn'),'0222');assert.equal(q.get('stationValueType'),'code');return Response.json(body(name,code,line));});
  const response=await get(req('station='+code+'&toCode=0222'));assert.equal(response.status,200);const d=await response.json();assert.equal(d.route.originCode,code);assert.equal(d.route.originLine,line.replace(/^0/,''));assert.equal(d.route.origin,code==='0150'?'서울역':name);
 }
});
test('legacy name and code requests retain their fixed Jongno origin',async()=>{
 const get=await handler(async value=>{const q=new URL(value).searchParams;assert.equal(q.get('dptreStn'),q.get('stationValueType')==='code'?'0154':'종로5가');return Response.json(body('종로5가','0154'));});
 for(const q of ['to=강남','toCode=0222']){const r=await get(req(q));assert.equal(r.status,200);assert.equal((await r.json()).route.origin,'종로5가');}
});
test('invalid origins, unknown destinations and same-station transfers never call the provider',async()=>{
 let calls=0;const get=await handler(async()=>{calls++;throw Error('unexpected fetch');});
 for(const code of ['','154','9999','0200'])assert.equal((await get(req('station='+code+'&toCode=0222'))).status,400);
 for(const q of ['station=0152&toCode=9999','station=0152&to=not-a-station','station=0152&toCode=0152','station=0319&toCode=0153'])assert.equal((await get(req(q))).status,400);
 assert.equal(calls,0);
});
test('typed official destinations are resolved to codes; all three criteria survive',async()=>{
 const seen=[];const get=await handler(async value=>{const q=new URL(value).searchParams;seen.push(q.get('searchType'));assert.equal(q.get('arvlStn'),'0222');assert.equal(q.get('dptreStn'),'0152');return Response.json(body());});
 for(const mode of ['duration','distance','transfer'])assert.equal((await get(req('station=0152&to=강남&mode='+mode))).status,200);
 assert.deepEqual(seen,['duration','distance','transfer']);
});
test('wrong origin, transfer line, station code and destination responses are rejected',async()=>{
 for(const fixture of [body('종로5가','0154'),body('종각','0152','2호선'),body('종각','0154'),body('종각','0152','1호선','강남구청')]){
  const get=await handler(async()=>Response.json(fixture));const r=await get(req('station=0152&toCode=0222'));assert.equal(r.status,422);assert.equal((await r.json()).code,'PARSE_ROUTE');
 }
});
test('concurrent station requests remain isolated and missing keys never call upstream',async()=>{
 const get=await handler(async value=>{const code=new URL(value).searchParams.get('dptreStn');return Response.json(code==='0152'?body():body('동묘앞','2637','6호선'));});
 const replies=await Promise.all(['0152','2637'].map(async code=>(await (await get(req('station='+code+'&toCode=0222'))).json()).route.originCode));assert.deepEqual(replies,['0152','2637']);
 const missing=await handler(()=>{throw Error('must not fetch');},null);assert.equal((await missing(req('station=0152&toCode=0222'))).status,503);
});
