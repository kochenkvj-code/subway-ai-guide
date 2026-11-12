import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import { estimateIpRegion } from '../app/lib/ip-region.mjs';
class NextResponse extends Response{static json(value,init){return new NextResponse(JSON.stringify(value),init);}}
async function fixture(file){
 const writes=[],logs=[];let fail=false;
 const context=vm.createContext({Response,URL,URLSearchParams,AbortSignal,console:{warn:(...v)=>logs.push(v),error:(...v)=>logs.push(v)}});
 const values={'next/server':{NextResponse},'../../../lib/stats-server':{authorized:()=>true,supabase:async(path,options)=>{if(fail)throw Error('Statistics database request failed: 503 (fixture)');writes.push({path,options});return path.startsWith('chatbot_events?')&&(!options||options.method!=='POST')?Response.json([]):new Response(null,{status:204});}},'../../../lib/facility-stat':{isFacilityContext:()=>false},'../../../lib/ip-region.mjs':{estimateIpRegion:(headers)=>headers.get('x-vercel-ip-city')||null},'../../../v2/lost-found-demo/seoul-gu-geo.json':{default:{features:[]}}};
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

test('V2 production menus are accepted alongside existing legacy menu events',async()=>{
 for(const name of ['timetable','found','lost','feedback','route','gate','fares','tour','facility']){
  const f=await fixture('app/api/stats/event/route.js');
  const response=await f.api.POST(request({...data,event_type:'quick_menu',event_name:name,context:null,language:'ja'}));
  assert.equal(response.status,204,name);
  const stored=JSON.parse(f.writes[0].options.body);
  assert.equal(stored.event_name,name);assert.equal(stored.language,'ja');
 }
});

test('route queries and validated base-station context persist without saving arbitrary context',async()=>{
 const f=await fixture('app/api/stats/event/route.js');
 const req=await f.api.POST(request({...data,event_type:'route_search',event_name:'request',language:'ko',question:'신라스테이 구로',context:'PRIVATE'}));
 assert.equal(req.status,204);
 let stored=JSON.parse(f.writes[0].options.body);
 assert.equal(stored.question,'신라스테이 구로');
 assert.equal(stored.context,null);
 assert.equal((await f.api.POST(request({...data,event_type:'page_view',event_name:'visit',context:'station:0154'}))).status,204);
 stored=JSON.parse(f.writes[1].options.body);
 assert.equal(stored.context,'station:0154');
 assert.equal((await f.api.POST(request({...data,event_type:'page_view',event_name:'station_change',context:'station:0155'}))).status,204);
 stored=JSON.parse(f.writes[2].options.body);
 assert.equal(stored.context,'station:0155');
 assert.equal((await f.api.POST(request({...data,event_type:'page_view',event_name:'station_change',context:'station:0155/private',question:'SECRET'}))).status,204);
 stored=JSON.parse(f.writes[3].options.body);
 assert.equal(stored.context,null);
 assert.equal(stored.question,null);
});


test('event endpoint keeps a per-event coarse IP region without storing raw IP or coordinates',async()=>{
 const f=await fixture('app/api/stats/event/route.js');
 const headers=new Headers({'x-vercel-ip-country':'JP','x-vercel-ip-city':'Tokyo','x-vercel-ip-latitude':'35.6895','x-vercel-ip-longitude':'139.6917'});
 assert.equal((await f.api.POST({headers,json:async()=>data})).status,204);
 const stored=JSON.parse(f.writes[0].options.body);
 assert.equal(stored.ip_region,'Tokyo');
 assert.equal(stored.country,'JP');
 assert.equal(Object.hasOwn(stored,'ip'),false);
 assert.equal(Object.hasOwn(stored,'latitude'),false);
 assert.equal(Object.hasOwn(stored,'longitude'),false);
});

test('IP region lookup resolves Seoul districts and leaves uncertain locations unassigned',async()=>{
 const geo=JSON.parse(await fs.readFile('app/v2/lost-found-demo/seoul-gu-geo.json','utf8'));
 const region=(country,subdivision,city,lat,lon)=>{
  const headers=new Headers({'x-vercel-ip-country':country,'x-vercel-ip-country-region':subdivision,'x-vercel-ip-city':city});
  if(lat!=null)headers.set('x-vercel-ip-latitude',String(lat));
  if(lon!=null)headers.set('x-vercel-ip-longitude',String(lon));
  return estimateIpRegion(headers,geo);
 };
 assert.equal(region('KR','11','Seoul',37.569,126.984),'서울특별시 종로구');
 assert.equal(region('KR','11','Seoul',37.515,127.043),'서울특별시 강남구');
 assert.equal(region('KR','11','Seoul',null,null),'서울특별시 · 구 미확인');
 assert.equal(region('KR','41','Seongnam',37.45,127.13),'경기도 · Seongnam');
 assert.equal(region('JP','13','Tokyo',35.6895,139.6917),'Tokyo');
});

test('region readout is added only to the existing session list',async()=>{
 const [report,ui]=await Promise.all([fs.readFile('app/api/stats/report/route.js','utf8'),fs.readFile('app/admin/stats/page.js','utf8')]);
 assert.match(report,/country,ip_region,device_type/);
 assert.match(ui,/\["접속시간 \(KST\)","국가","접속지역","기기 \/ 환경"/);
 assert.match(ui,/group\.events\.find\(e=>e\.ip_region\)/);
});

test('gate location diagram is acknowledged and stored',async()=>{const f=await fixture('app/api/stats/event/route.js');const r=await f.api.POST(request({...data,event_name:'location_diagram_open',context:'gate_e03'}));assert.equal(r.status,204);assert.equal(JSON.parse(f.writes[0].options.body).event_name,'location_diagram_open');});
test('daily report passes explicit date range to activity RPC',async()=>{const f=await fixture('app/api/stats/report/route.js'); /* RPC body is covered by database transaction verification as fixture has no session rows. */ const text=await fs.readFile('app/api/stats/report/route.js','utf8');assert.match(text,/rpc\/get_chatbot_activity_range/);assert.match(text,/p_start:start,p_end:end/);});
test('activity endpoint accepts old clients and routes dated checkpoints to the new RPC',async()=>{const f=await fixture('app/api/stats/activity/route.js');const body={page_id:data.event_id,session_id:data.session_id,visible_ms:6000};assert.equal((await f.api.POST(request(body))).status,204);assert.equal(f.writes[0].path,'rpc/record_chatbot_activity');const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10);assert.equal((await f.api.POST(request({...body,activity_date:day}))).status,204);assert.equal(f.writes[1].path,'rpc/record_chatbot_activity_v2');assert.equal(JSON.parse(f.writes[1].options.body).p_activity_date,day);for(const value of ['2026-02-30','2099-01-01','bad',null])assert.equal((await f.api.POST(request({...body,activity_date:value}))).status,400);assert.equal(f.writes.length,2);});

test('browser visitor IDs survive event writes and reject malformed identifiers',async()=>{const f=await fixture('app/api/stats/event/route.js');const id='33333333-3333-4333-8333-333333333333';assert.equal((await f.api.POST(request({...data,visitor_id:id}))).status,204);assert.equal(JSON.parse(f.writes[0].options.body).visitor_id,id);assert.equal((await f.api.POST(request({...data,visitor_id:'bad'}))).status,400);});
test('dated visitor activity uses v3 while preserving v1/v2 compatibility',async()=>{const f=await fixture('app/api/stats/activity/route.js');const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10);const body={page_id:data.event_id,session_id:data.session_id,visible_ms:1000,activity_date:day,visitor_id:'33333333-3333-4333-8333-333333333333'};assert.equal((await f.api.POST(request(body))).status,204);assert.equal(f.writes[0].path,'rpc/record_chatbot_activity_v3');assert.equal(JSON.parse(f.writes[0].options.body).p_visitor_id,body.visitor_id);});
