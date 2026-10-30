import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
async function handler(fetch,key='fixture-key'){
 const context=vm.createContext({Response,AbortSignal,URL,Date,Map,Set,process:{env:key?{SEOUL_SUBWAY_ARRIVAL_API_KEY:key}:{}},fetch});
 const route=new vm.SourceTextModule(await fs.readFile('app/api/train-arrivals/route.js','utf8'),{context});
 await route.link(async name=>{assert.equal(name,'../../lib/train-arrivals');const module=new vm.SourceTextModule(await fs.readFile('app/lib/train-arrivals.js','utf8'),{context});await module.link(()=>{});return module;});await route.evaluate();return route.namespace.GET;
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
