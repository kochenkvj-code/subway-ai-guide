const {chromium}=require('playwright');
const http=require('node:http'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const events=new Map();let writes=0,loseAck=true,offline=true;
 const db=http.createServer(async(req,res)=>{try{let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};const url=new URL(req.url,'http://localhost');res.setHeader('Content-Type','application/json');
  if(url.pathname==='/rest/v1/chatbot_events'&&req.method==='POST'){writes++;if(!events.has(body.event_id))events.set(body.event_id,body);if(loseAck){loseAck=false;res.statusCode=503;res.end('{}');}else{res.statusCode=201;res.end('null');}}
  else if(url.pathname==='/rest/v1/rpc/record_chatbot_activity'){res.statusCode=204;res.end();}
  else res.end('[]');
 }catch{res.statusCode=500;res.end('{}');}});await new Promise(r=>db.listen(4301,'127.0.0.1',r));
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3026'],{env:{...process.env,SUPABASE_URL:'http://127.0.0.1:4301',SUPABASE_SECRET_KEY:'fixture-only',STATS_ADMIN_PASSWORD:'fixture-only'},stdio:['ignore','pipe','pipe']});let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);let browser;
 try{
  for(let i=0;i<100&&!output.includes('Ready');i++)await wait(100);assert.ok(output.includes('Ready'),output);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const browserContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true});const p=await browserContext.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/api/stats/event',r=>offline?r.fulfill({status:503,json:{error:'fixture offline'}}):r.continue());
  await p.goto('http://localhost:3026/?from=gate');await p.locator('.sag-gate-code-grid button').filter({hasText:'E-44'}).click();await p.locator('.sag-gate-resolution').waitFor();
  const key='subway_ai_guide_pending_events_v1';const queued=await p.evaluate(k=>JSON.parse(sessionStorage.getItem(k)),key);assert.equal(queued.length,3);const original=queued.map(x=>JSON.parse(x.body)).find(x=>x.event_name==='e44');assert.ok(original);assert.equal(events.size,0,'guidance displayed even while every event fails');
  await p.reload();await p.locator('.sag-gate-code-grid').waitFor();const restored=await p.evaluate(k=>JSON.parse(sessionStorage.getItem(k)).map(x=>JSON.parse(x.body)),key);assert.deepEqual(restored.find(x=>x.event_id===original.event_id),original);assert.equal(restored.length,5);
  offline=false;await p.evaluate(()=>window.dispatchEvent(new Event('online')));
  await p.waitForFunction(k=>JSON.parse(sessionStorage.getItem(k)||'[]').length===1,key);await p.evaluate(()=>window.dispatchEvent(new Event('online')));await p.waitForFunction(k=>sessionStorage.getItem(k)===null,key);
  assert.equal(events.size,5);assert.ok(writes>events.size,'duplicate requests after uncertain acknowledgements must not create extra events');assert.deepEqual(events.get(original.event_id).occurred_at,original.occurred_at);assert.equal(events.get(original.event_id).context,'gate_e44');assert.equal(errors.length,0,errors.join('\n'));
  assert.equal((await p.request.post('http://localhost:3026/api/stats/auth',{data:{password:'fixture-only'}})).status(),200);
  const admin=await p.context().newPage();const earlier='33333333-3333-4333-8333-333333333333',later='44444444-4444-4444-8444-444444444444';
  const row=(id,session_id,time)=>({id,session_id,occurred_at:'2026-11-01T'+time+'Z',created_at:'2026-11-01T'+time+'Z',event_type:'quick_menu',event_name:'gate',language:'en'});
  await admin.route('**/api/stats/report?*',r=>r.fulfill({json:{rows:[row(1,earlier,'08:50:27'),row(2,later,'08:51:11'),row(3,earlier,'08:52:00')],activity:{}}}));await admin.goto('http://localhost:3026/admin/stats');await admin.locator('tbody tr').first().waitFor();const rows=admin.locator('tbody tr');assert.equal(await rows.count(),2);assert.ok((await rows.nth(0).innerText()).includes('17:51:11'));assert.ok((await rows.nth(1).innerText()).includes('17:50:27'));assert.ok((await admin.locator('body').innerText()).includes('최근 접속순'));
  console.log('PASS browser → real event API → fixture DB: offline guide stays usable, reload recovery, same IDs/timestamps, uncertain acknowledgement deduplication, queue cleanup, admin session order matches visible entry time');
 }finally{await browser?.close();server.kill();db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
