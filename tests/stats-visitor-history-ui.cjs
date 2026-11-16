const{chromium}=require('playwright'),{spawn}=require('node:child_process'),http=require('node:http'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{
 const visitor='11111111-1111-4111-8111-111111111111',other='55555555-5555-4555-8555-555555555555';
 const a='22222222-2222-4222-8222-222222222222',b='33333333-3333-4333-8333-333333333333',old='44444444-4444-4444-8444-444444444444',older='66666666-6666-4666-8666-666666666666';
 const date=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
 const row=(id,session_id,visitor_id,day,type='page_view',question=null)=>({id,session_id,visitor_id,created_at:day+'T01:00:00Z',occurred_at:day+'T01:00:00Z',event_type:type,event_name:type==='page_view'?'visit':type==='ai_question'?'request':'facility',language:'ko',country:'KR',os_type:'iOS',browser:'Safari',question});
 const current=[row(1,a,visitor,date),row(2,a,visitor,date,'quick_menu'),row(3,b,other,date)];
 const history=[current[0],current[1],row(4,old,visitor,'2025-01-01','ai_question','오래된 질문 확인'),row(5,older,visitor,'2026-10-01')];
 let fail=false;const paths=[],writes=[];
 const db=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;const u=new URL(req.url,'http://localhost');paths.push(u.pathname+u.search);res.setHeader('Content-Type','application/json');
  if(req.method==='POST'&&!u.pathname.includes('/rpc/'))writes.push(u.pathname);
  if(u.pathname.endsWith('/chatbot_events')){if(u.searchParams.has('visitor_id')&&fail){res.statusCode=503;return res.end('{"message":"fixture unavailable"}');}return res.end(JSON.stringify(u.searchParams.has('visitor_id')?history:current));}
  if(u.pathname.endsWith('/chatbot_session_activity'))return res.end(JSON.stringify([{session_id:a,visible_ms:3000},{session_id:old,visible_ms:62000},{session_id:older,visible_ms:4000}]));
  return res.end(JSON.stringify([{session_id:a,visible_ms:1000},{session_id:b,visible_ms:2000}]));
 });await new Promise(r=>db.listen(4304,'127.0.0.1',r));
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3103'],{env:{...process.env,SUPABASE_URL:'http://127.0.0.1:4304',SUPABASE_SECRET_KEY:'fixture-only',STATS_ADMIN_PASSWORD:'fixture-only'}});let out='',browser;server.stdout.on('data',d=>out+=d);server.stderr.on('data',d=>out+=d);
 try{
  for(let i=0;i<100&&!out.includes('Ready');i++)await new Promise(r=>setTimeout(r,100));assert.ok(out.includes('Ready'),out);browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.request.post('http://localhost:3103/api/stats/auth',{data:{password:'fixture-only'}});await p.goto('http://localhost:3103/admin/stats');const region=p.getByRole('region',{name:'접속·이용 기록 목록'});await region.locator('tbody tr').first().waitFor();assert.equal(await region.locator('tbody tr').count(),2);
  const count=await p.getByText('접속 횟수',{exact:true}).locator('..').innerText();
  await p.getByLabel('기록 필터',{exact:true}).selectOption('functional');await region.locator('button[title^="'+visitor+'"]').first().click();await p.getByText('오래된 질문 확인',{exact:true}).waitFor();assert.equal(await region.locator('tbody tr').count(),3);assert.equal(await p.getByLabel('기록 필터',{exact:true}).inputValue(),'all');assert.ok((await region.innerText()).includes('1분 2초'));assert.ok(!(await region.innerText()).includes(other.slice(0,8)));assert.equal(await p.getByText('접속 횟수',{exact:true}).locator('..').innerText(),count);
  assert.ok(paths.some(path=>path.includes('visitor_id=eq.')));await fs.mkdir('work/visitor-history',{recursive:true});await p.screenshot({path:'work/visitor-history/history.png',fullPage:true});
  await p.getByRole('button',{name:/방문 .* 필터 해제/}).click();await p.waitForFunction(()=>document.querySelectorAll('[aria-label="접속·이용 기록 목록"] tbody tr').length===2);assert.equal(await p.getByText('오래된 질문 확인',{exact:true}).count(),0);assert.ok((await region.innerText()).includes(other.slice(0,8)));
  fail=true;await region.locator('button[title^="'+visitor+'"]').first().click();await p.getByRole('alert').waitFor();assert.equal(await region.locator('tbody tr').count(),0);assert.equal(await p.getByText('접속 횟수',{exact:true}).locator('..').innerText(),count);await p.getByRole('button',{name:/방문 .* 필터 해제/}).click();await p.waitForFunction(()=>document.querySelectorAll('[aria-label="접속·이용 기록 목록"] tbody tr').length===2);
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checks:['visitor click queries all history through actual report handler','year-old AI question and full activity visible','access-only history included','other visitor excluded','date-scoped cards unchanged','clear restores date report','history failure does not show stale/partial rows'],errors,productionWrites:0}));
 }finally{await browser?.close();server.kill();db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
