// Isolated browser → actual Next APIs → PostgREST test server. Production data is untouched.
const {chromium}=require('playwright');
const http=require('node:http'),{spawn}=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const origin='http://localhost:3015',station='jongno5ga-1';
let rows=[{id:crypto.randomUUID(),station_id:'other-station',type:'idea',content:'OTHER STATION PRIVATE',created_at:new Date().toISOString(),starred:false,hidden:false}];
const calls=[];
const server=http.createServer(async(req,res)=>{
 try{let raw='';for await(const c of req)raw+=c;const body=raw?JSON.parse(raw):{},url=new URL(req.url,'http://localhost');const path=url.pathname;calls.push({path,method:req.method,params:[...url.searchParams]});res.setHeader('Content-Type','application/json');
 if(path==='/rest/v1/rpc/submit_station_feedback'){
  const existing=rows.find(x=>x.request_id===body.p_data.request_id);if(!existing)rows.unshift({...body.p_data,id:crypto.randomUUID(),created_at:new Date().toISOString(),starred:false,hidden:false});res.end(JSON.stringify(existing?'duplicate':'created'));
 }else if(path==='/rest/v1/rpc/feedback_rate_limit'){res.end('true');}
 else if(path==='/rest/v1/station_feedback'){
  assert.ok(url.searchParams.get('station_id')?.startsWith('eq.'));
  let found=rows.filter(x=>x.station_id===url.searchParams.get('station_id').slice(3));
  if(url.searchParams.get('hidden'))found=found.filter(x=>x.hidden===(url.searchParams.get('hidden')==='eq.true'));
  for(const key of ['id','type']){const v=url.searchParams.get(key);if(v)found=found.filter(x=>x[key]===v.slice(3));}
  if(url.searchParams.get('starred'))found=found.filter(x=>x.starred);
  if(req.method==='PATCH'){found.forEach(x=>Object.assign(x,body));res.end(JSON.stringify(found.map(x=>({id:x.id}))));return;}
  const since=url.searchParams.get('created_at');if(since)found=found.filter(x=>x.created_at>=since.slice(4));
  const total=found.length,offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||10);found=found.slice(offset,offset+limit);res.setHeader('Content-Range',`${offset}-${offset+found.length-1}/${total}`);res.end(JSON.stringify(found));
 }else if(path.startsWith('/rest/v1/')){res.end('null');}else{res.statusCode=404;res.end('{}');}
 }catch(e){console.error(e);res.statusCode=500;res.end('{}');}
});
(async()=>{
 await new Promise(r=>server.listen(4315,'127.0.0.1',r));
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3015'],{env:{...process.env,SUPABASE_URL:'http://127.0.0.1:4315',SUPABASE_SECRET_KEY:'test-only',STATS_ADMIN_PASSWORD:'test-only-password',FEEDBACK_STATION_PINS:JSON.stringify({[station]:'1234'})},stdio:['ignore','pipe','pipe']});
 let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);let browser;
 try{
  for(let i=0;i<100&&!log.includes('Ready');i++)await wait(100);assert.ok(log.includes('Ready'),log);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true});const p=await ctx.newPage();
  await p.route('**/api/train-arrivals*',r=>r.fulfill({json:{ok:false}}));
  await p.goto(origin+'/v2?view=feedback');await p.locator('.sf-choice').first().click();
  assert.equal(await p.locator('.sf-chips [aria-pressed=true]').count(),0);
  await p.locator('#sf-content').fill('출구 안내 표지판을 더 잘 보이게 해주세요. '.repeat(8));await p.locator('.sf-chips button').nth(1).click();assert.ok((await p.locator('#sf-content').inputValue()).startsWith('출구'));
  await p.locator('.sf-locations button').nth(3).click();assert.equal(await p.locator('#sf-detail').count(),0);await p.locator('.sf-primary').click();await p.locator('.sf-success').waitFor();
  assert.equal(rows.filter(x=>x.station_id===station).length,1);assert.equal(rows[0].location_detail,'');
  await p.locator('.v2-view-header > button').first().click();await p.locator('.sf-choice').first().waitFor();await p.locator('.v2-view-header > button').first().click();await p.locator('.v2-home:not([hidden])').waitFor();await p.locator('.sf-badge').waitFor();assert.equal(await p.locator('.sf-badge').innerText(),'1');
  await p.locator('.v2-grid > button').last().click();await p.locator('.sf-choice').nth(1).click();await p.locator('#sf-pin').waitFor();
  assert.equal((await ctx.request.get(origin+'/api/stats/feedback?station='+station)).status(),401);
  assert.equal((await ctx.request.get(origin+'/api/stats/feedback?station=other-station')).status(),400);
  await p.locator('#sf-pin').fill('9999');await p.locator('.sf-primary').click();await p.getByRole('alert').waitFor();await p.locator('#sf-pin').fill('1234');await p.locator('.sf-primary').click();await p.locator('.sf-opinion').waitFor();assert.ok(!(await p.locator('.sf-pane').innerText()).includes('OTHER STATION PRIVATE'));
  await p.locator('.sf-expand').click();assert.equal(await p.locator('.sf-expand').getAttribute('aria-expanded'),'true');await p.locator('.sf-detail-dialog[open] > button').click();await p.locator('.sf-star').click();await p.locator('.sf-star[aria-pressed=true]').waitFor();assert.equal(rows[0].starred,true);
  const token=await p.evaluate(station=>sessionStorage.getItem('sag_feedback_access_'+station),station);
  assert.equal((await ctx.request.patch(origin+'/api/stats/feedback',{headers:{Authorization:'Bearer '+token},data:{station,id:rows[0].id,field:'hidden',value:true}})).status(),403);
  await p.reload();await p.locator('.sf-choice').nth(1).click();await p.locator('.sf-opinion').waitFor();assert.equal(await p.locator('#sf-pin').count(),0);
  // An older opinion appears in the all-time list but not the thirty-day badge.
  rows.push({...rows[0],id:crypto.randomUUID(),request_id:crypto.randomUUID(),created_at:'2020-01-01T00:00:00Z',content:'오래된 의견',starred:false});
  const list=await ctx.request.get(origin+'/api/stats/feedback?station='+station,{headers:{Authorization:'Bearer '+token}});const listData=await list.json();assert.equal(listData.total,2);assert.equal(listData.recent,1);
  const admin=await browser.newContext();assert.equal((await admin.request.post(origin+'/api/stats/auth',{data:{password:'test-only-password'}})).status(),200);
  assert.equal((await admin.request.patch(origin+'/api/stats/feedback',{data:{station,id:rows[0].id,field:'hidden',value:true}})).status(),200);assert.equal(rows[0].hidden,true);
  const hidden=await admin.request.get(origin+'/api/stats/feedback?station='+station+'&visibility=hidden');assert.equal((await hidden.json()).total,1);
  assert.equal((await ctx.request.get(origin+'/api/stats/feedback?station='+station+'&visibility=all',{headers:{Authorization:'Bearer '+token}})).status(),403);
  assert.equal((await admin.request.patch(origin+'/api/stats/feedback',{data:{station,id:rows[0].id,field:'hidden',value:false}})).status(),200);assert.equal(rows[0].hidden,false);

  // The inbox adapts its server page size to the viewport, rather than stacking ten cards.
  for(let i=0;i<10;i++)rows.push({...rows[0],id:crypto.randomUUID(),request_id:crypto.randomUUID(),content:'긴 테스트 의견입니다. '.repeat(30),starred:false});
  const ap=await admin.newPage({viewport:{width:390,height:844}});await ap.goto(origin+'/v2?view=feedback');await ap.locator('.sf-choice').nth(1).click();await ap.locator('.sf-opinion').first().waitFor();
  for(const [width,height,language] of [[390,640,'ko'],[390,740,'ko'],[390,844,'ko'],[320,640,'en'],[320,640,'ja'],[320,640,'zh'],[390,844,'en'],[390,844,'ja'],[390,844,'zh']]){await ap.setViewportSize({width,height});await ap.locator('.v2-view-header .v2-language select').selectOption(language);await wait(350);const count=await ap.locator('.sf-opinion').count();assert.ok(count>=4&&count<=5);const bounds=await ap.evaluate(()=>{const pane=document.querySelector('.sf-inbox'),pager=document.querySelector('.sf-pager');return {bottom:pager.getBoundingClientRect().bottom,end:pane.getBoundingClientRect().bottom,overflow:pane.scrollHeight-pane.clientHeight}});assert.ok(bounds.bottom<=bounds.end,JSON.stringify({height,...bounds}));assert.ok(bounds.overflow<=2,JSON.stringify({height,...bounds}));}
  await ap.locator('.sf-pager button').last().click();await wait(250);assert.ok((await ap.locator('.sf-pager span').innerText()).startsWith('2 /'));
  await ap.locator('.v2-view-header .v2-language select').selectOption('ko');await wait(200);await ap.screenshot({path:'work/feedback-compact.png'});await ap.locator('.v2-view-header > button').first().click();await ap.screenshot({path:'work/feedback-entry-compact.png'});await ap.close();
  // Every language and width remains within the screen. No production mutations.
  const labels={ko:'한국어',en:'English',ja:'日本語',zh:'中文'};
  for(const width of [320,390,768]){await p.setViewportSize({width,height:844});for(const lang of ['ko','en','ja','zh']){
   await p.locator('.v2-view-header .v2-language select').selectOption(lang);
   await p.locator('.v2-view-header > button').first().click();await p.locator('.sf-choice').first().click();await p.locator('#sf-content').waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.equal(await p.locator('#sf-content').getAttribute('maxlength'),'500');assert.equal(await p.locator('.sf-locations button').count(),6);
  }}
  await p.setViewportSize({width:390,height:844});await p.locator('.v2-view-header .v2-language select').selectOption('ko');await p.locator('.sf-locations button').last().click();await p.screenshot({path:'work/feedback-write-compact.png'});
  console.log('PASS browser → APIs → storage: draft, unset category, detail, submit, back/home, live badge, PIN, tab session, star, admin-only hide, station scope, 30-day/all-time, four languages at 320/390/768px');
 }finally{await browser?.close();child.kill();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
