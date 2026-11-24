const {chromium}=require('playwright'),{spawn}=require('node:child_process'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const events=[],errors=[];const base='http://localhost:3194';
 const db=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');let raw='';for await(const chunk of req)raw+=chunk;res.setHeader('Content-Type','application/json');
  if(u.pathname.endsWith('/chatbot_events')){
   if(req.method==='POST'){const item=JSON.parse(raw);if(!events.some(e=>e.event_id===item.event_id))events.push({...item,id:events.length+1,created_at:new Date().toISOString()});res.statusCode=204;return res.end();}
   const visitor=u.searchParams.get('visitor_id')?.slice(3);return res.end(JSON.stringify(visitor?events.filter(e=>e.visitor_id===visitor):events));
  }
  return res.end('[]');
 });await new Promise(r=>db.listen(4324,'127.0.0.1',r));
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3194'],{env:{...process.env,SUPABASE_URL:'http://127.0.0.1:4324',SUPABASE_SECRET_KEY:'fixture-only',STATS_ADMIN_PASSWORD:'fixture-only',QR_SHARE_MODE:'public',ROUTE_SHARE_MODE:'public'}});let output='',browser;
 server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
 try{
  for(let i=0;i<100&&!output.includes('Ready');i++)await new Promise(r=>setTimeout(r,100));assert.ok(output.includes('Ready'),output);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR'}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  const {loadAppModule}=await import('./helpers/load-app-module.mjs'),adapter=await loadAppModule('app/lib/operation-timetable-model.js'),model=await loadAppModule('app/lib/timetable-lab-model.js');
  await p.route('**/api/v2/operation-timetable?**',r=>r.fulfill({json:{ok:true,stationCode:'0154',day:new URL(r.request().url()).searchParams.get('day'),businessDate:model.serviceClock().businessDate,...adapter.compileOperationTimetable([{'고유번호':'1','방향':'UP','열차출발시간':'15:03:00','도착역':'의정부','열차코드':'S102'}],model.timetableStation('0154')),source:{cacheState:'fresh'}}}));
  await p.route('**/api/v2/timetable-lab/crowding?**',r=>r.fulfill({json:{stationCode:'0154',data:{'1:0154':'0'.repeat(84)+'1'.repeat(84)+'2'.repeat(84)},hours:[5,25],thresholds:[35,75,110]}}));
  const actions=()=>events.filter(e=>e.event_type==='ui_action');
  async function clickAndRecord(locator){const acknowledged=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/stats/event'&&r.request().postDataJSON()?.event_type==='ui_action');await locator.click();assert.equal((await acknowledged).status(),204);}
  await p.goto(base+'/?station=0154&view=timetable&lang=ko');await p.locator('.tl-table').waitFor();assert.equal(actions().length,0,'automatic day/hour initialization is not a click');
  const selected=await p.locator('.tl-days button[aria-pressed="true"]').innerText();
  for(const name of ['평일','토요일','공휴일'].filter(x=>x!==selected).concat(selected)){
   await clickAndRecord(p.locator('.tl-days').getByRole('button',{name,exact:true}));await p.locator('.tl-table').waitFor();
  }
  await p.locator('.tl-days button[aria-pressed="true"]').click();
  await clickAndRecord(p.locator('.tl-crowd-help'));await p.locator('.tl-vg-close').click();
  await clickAndRecord(p.locator('.v2-view-header .v2-access-qr'));await p.locator('.sag-qr-dialog[open] img').waitFor();await p.locator('.sag-qr-close').click();
  assert.equal(actions().length,5);assert.equal(new Set(actions().map(e=>e.visitor_id)).size,1);assert.equal(new Set(actions().map(e=>e.session_id)).size,1);
  await p.locator('.tl-hour-grid button[aria-label="15:00"]').click();await p.locator('.tl-now').click();
  await p.route('**/api/v2/route-place-test',r=>r.fulfill({json:{ok:true,status:'found',place:'롯데호텔 서울',answer:'안내',walk:'도보 안내',station:{code:'0202',ko:'을지로입구',lines:['2호선']},shareProof:'place'}}));
  await p.route('**/api/subway-route?**',r=>r.fulfill({json:{ok:true,shareProof:'official',route:{origin:'종로5가',destination:'을지로입구',originCode:'0154',itinerary:[{type:'ride',line:'1호선',from:'종로5가',to:'시청',segments:3}],totalSeconds:780}}}));
  await p.route('**/api/route-shares',r=>r.fulfill({json:{id:'A'.repeat(43),url:base+'/route-share/'+'A'.repeat(43)}}));
  await p.goto(base+'/?station=0154&view=route&lang=ko');await p.locator('#rl-destination').fill('롯데호텔 서울');await p.locator('.rl-submit').click();await p.locator('.rl-route-card').waitFor();await clickAndRecord(p.locator('.rl-share>button'));await p.locator('.sag-qr-dialog[open]').waitFor();assert.equal(actions().length,6,'hours, current-time button, rerenders and QR generation must not add events');
  const visitor=actions()[0].visitor_id;assert.ok(visitor);assert.ok(actions().every(e=>e.visitor_id===visitor));
  const admin=await context.newPage();await admin.request.post(base+'/api/stats/auth',{data:{password:'fixture-only'}});await admin.goto(base+'/admin/stats');const summary=admin.getByRole('region',{name:'세부 기능 이용 통계'});await summary.getByText('시간표 공휴일 선택',{exact:true}).waitFor();
  for(const label of ['접속·메뉴 QR 클릭','길찾기 결과 QR 클릭','시간표 혼잡도 보는 법','시간표 평일 선택','시간표 토요일 선택','시간표 공휴일 선택'])assert.equal(await summary.getByText(label,{exact:true}).count(),1);
  const history=admin.getByRole('region',{name:'접속·이용 기록 목록'});await history.locator('button[title^="'+visitor+'"]').first().click();await history.getByText('길찾기 결과 QR 클릭',{exact:true}).waitFor();assert.match(await history.innerText(),/시간표 토요일 선택/);assert.equal(events.filter(e=>e.event_type==='quick_menu').length,0,'new actions never impersonate menu events');assert.deepEqual(errors,[]);
  console.log('PASS actual recordStat → stats API → fixture DB → admin summary and all-history visitor view; six actions, shared identity, no automatic/repeat/hour/filter events; source and QR backend mocked, no production writes.');
 }finally{await browser?.close();server.kill();db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
