import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const visitor='11111111-1111-4111-8111-111111111111',session='22222222-2222-4222-8222-222222222222';
async function handler(db,auth=true){
 const context=vm.createContext({Response,URL,URLSearchParams,console});
 const mod=new vm.SourceTextModule(await fs.readFile('app/api/stats/report/route.js','utf8'),{context});
 await mod.link(name=>new vm.SyntheticModule(name==='next/server'?['NextResponse']:['authorized','supabase'],function(){if(name==='next/server')this.setExport('NextResponse',Response);else{this.setExport('authorized',()=>auth);this.setExport('supabase',db);}}, {context}));await mod.evaluate();return mod.namespace.GET;
}
const request=q=>({url:'https://test/api/stats/report?'+q});
test('visitor query ignores day limits, fetches every event page and sums every activity page',async()=>{
 let eventPages=0,activityPages=0;const get=await handler(async(path,options)=>{
  assert.equal(options,undefined,'visitor history only reads tables');const q=new URL('https://db/'+path).searchParams;const offset=Number(q.get('offset'));
  if(path.startsWith('chatbot_events?')){
   eventPages++;assert.equal(q.get('visitor_id'),'eq.'+visitor);assert.equal(q.has('or'),false);assert.equal(q.has('created_at'),false);assert.equal(q.get('order'),'created_at.asc,id.asc');
   return Response.json(Array.from({length:offset===0?1000:1},(_,i)=>({id:offset+i,visitor_id:visitor,session_id:session,created_at:offset?'2025-01-01T00:00:00Z':'2026-11-16T00:00:00Z'})));
  }
  activityPages++;assert.equal(q.get('session_id'),'in.('+session+')');assert.equal(q.has('activity_date'),false);return Response.json(Array.from({length:offset===0?1000:1},()=>({session_id:session,visible_ms:10})));
 });
 const response=await get(request('visitor='+visitor+'&start=2026-11-16&end=2026-11-16'));assert.equal(response.status,200);const result=await response.json();assert.equal(result.rows.length,1001);assert.equal(result.activity[session],10010);assert.equal(eventPages,2);assert.equal(activityPages,2);assert.equal(response.headers.get('cache-control'),'private, no-store');
});
test('visitor-only query works without dates; no rows do not trigger activity lookup',async()=>{
 let calls=0;const get=await handler(async path=>{calls++;assert.ok(path.startsWith('chatbot_events?'));return Response.json([]);});assert.equal((await get(request('visitor='+visitor))).status,200);assert.equal(calls,1);
});
test('authentication and UUID validation occur before database access',async()=>{
 const db=()=>{throw Error('must not query');};const anonymous=await handler(db,false);assert.equal((await anonymous(request('visitor='+visitor))).status,401);const get=await handler(db);
 for(const id of ['',visitor.slice(0,8),'not-a-uuid',visitor+',x'])assert.equal((await get(request('visitor='+encodeURIComponent(id)))).status,400);
});
test('ordinary date reports retain their 93-day limit and date-bounded activity RPC',async()=>{
 let queries=0;const get=await handler(async(path,options)=>{queries++;if(path.startsWith('chatbot_events?')){const q=new URL('https://db/'+path).searchParams;assert.ok(q.get('or').includes('2026-11-15T15:00:00.000Z'));assert.equal(q.has('visitor_id'),false);return Response.json([{session_id:session}]);}assert.equal(path,'rpc/get_chatbot_activity_range');assert.deepEqual(JSON.parse(options.body),{p_sessions:[session],p_start:'2026-11-16',p_end:'2026-11-16'});return Response.json([{session_id:session,visible_ms:50}]);});
 assert.equal((await get(request('start=2026-11-16&end=2026-11-16'))).status,200);assert.equal(queries,2);assert.equal((await get(request('start=2025-01-01&end=2026-11-16'))).status,400);assert.equal(queries,2);
});
