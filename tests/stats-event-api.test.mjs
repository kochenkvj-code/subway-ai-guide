import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
class NextResponse extends Response{static json(value,init){return new NextResponse(JSON.stringify(value),init);}}
async function fixture(file){
 const writes=[],logs=[];let fail=false;
 const context=vm.createContext({Response,URL,URLSearchParams,AbortSignal,console:{warn:(...v)=>logs.push(v),error:(...v)=>logs.push(v)}});
 const values={'next/server':{NextResponse},'../../../lib/stats-server':{authorized:()=>true,supabase:async(path,options)=>{if(fail)throw Error('Statistics database request failed: 503 (fixture)');writes.push({path,options});return path.startsWith('chatbot_events?')&&(!options||options.method!=='POST')?Response.json([]):new Response(null,{status:204});}},'../../../lib/facility-stat':{isFacilityContext:()=>false}};
 const mod=new vm.SourceTextModule(await fs.readFile(file,'utf8'),{context});await mod.link(name=>new vm.SyntheticModule(Object.keys(values[name]),function(){for(const[k,v]of Object.entries(values[name]))this.setExport(k,v)},{context}));await mod.evaluate();return {api:mod.namespace,writes,logs,fail:()=>fail=true};
}
const data={event_id:'11111111-1111-4111-8111-111111111111',session_id:'22222222-2222-4222-8222-222222222222',event_type:'gate_action',event_name:'e44',language:'en',context:'gate_e44'};
const request=body=>({headers:new Headers(),json:async()=>body});
test('delayed event preserves original click time and UUID-based deduplication',async()=>{
 const f=await fixture('app/api/stats/event/route.js');const time=new Date(Date.now()-20*60*1000).toISOString();assert.equal((await f.api.POST(request({...data,occurred_at:time}))).status,204);assert.equal(JSON.parse(f.writes[0].options.body).occurred_at,time);assert.ok(f.writes[0].path.includes('on_conflict=event_id'));assert.ok(f.writes[0].options.headers.Prefer.includes('ignore-duplicates'));assert.ok(f.writes[0].options.signal);
});
test('invalid and database-failed events are distinguishable without logging question text',async()=>{
 const f=await fixture('app/api/stats/event/route.js');assert.equal((await f.api.POST(request({...data,event_name:'invalid',question:'PRIVATE'}))).status,400);assert.equal(f.logs[0][1].stage,'validation');assert.equal(f.logs[0][1].event_id,data.event_id);f.fail();assert.equal((await f.api.POST(request({...data,event_type:'ai_question',event_name:'request',question:'PRIVATE'}))).status,503);assert.equal(f.logs[1][1].stage,'database');assert.equal(f.logs[1][1].event_id,data.event_id);assert.equal(JSON.stringify(f.logs).includes('PRIVATE'),false);
});
test('malformed JSON is rejected as 400 instead of repeatedly retried as a database failure',async()=>{
 const f=await fixture('app/api/stats/event/route.js');const res=await f.api.POST({headers:new Headers(),json:async()=>{throw Error('bad');}});assert.equal(res.status,400);assert.equal(f.logs[0][1].reason,'invalid_json');
});
test('date report filters by original event time, with created_at fallback only for legacy rows',async()=>{
 const f=await fixture('app/api/stats/report/route.js');const res=await f.api.GET({url:'https://fixture.local/api/stats/report?start=2026-11-01&end=2026-11-01'});assert.equal(res.status,200);const params=new URL('https://fixture.local/'+f.writes[0].path).searchParams;assert.equal(params.get('or'),'(and(occurred_at.gte.2026-10-31T15:00:00.000Z,occurred_at.lt.2026-11-01T15:00:00.000Z),and(occurred_at.is.null,created_at.gte.2026-10-31T15:00:00.000Z,created_at.lt.2026-11-01T15:00:00.000Z))');assert.equal(params.has('and'),false);
});
