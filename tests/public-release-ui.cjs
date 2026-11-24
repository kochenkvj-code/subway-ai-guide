const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://localhost:3192';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR'});
  await context.addInitScript(()=>localStorage.setItem('subway_ai_guide_analytics_excluded','1'));
  const access=await(await context.request.get(base+'/api/interpreter-access')).json();
  assert.equal(access.admin,false);assert.equal(access.qr,true);assert.equal(access.routeShare,true);assert.equal(access.interpreter,false);
  for(const [path,status]of [['/api/v2/operation-timetable?stationCode=bad',400],['/api/v2/congestion?station=bad',400],['/api/v2/timetable-lab/crowding?station=bad',400],['/api/v2/operation-timetable-test?stationCode=0154',403],['/api/timetable-diagnostic',403],['/api/stats/report',401]])assert.equal((await context.request.get(base+path)).status(),status,path);
  assert.equal((await context.request.post(base+'/api/interpreter-test',{data:{action:'create',stationCode:'0154',lang:'ko'}})).status(),403);
  const page=await context.newPage();let congestionCalls=0;
  await page.route('**/api/**',r=>{
   const path=new URL(r.request().url()).pathname;
   if(['/api/interpreter-access','/api/stats/auth'].includes(path))return r.continue();
   if(path==='/api/v2/congestion')congestionCalls++;
   return r.fulfill({status:503,json:{error:'fixture-unavailable'}});
  });
  for(const view of ['home','live']){
   const before=congestionCalls,response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v2/congestion');await page.goto(base+'/?station=0154&view='+view+'&lang=ko');
   await page.waitForFunction(()=>document.querySelector('.v2-bottom-tabs'));
   await response;assert.ok(congestionCalls>before,view+' requests public congestion independently');
   assert.equal(await page.locator('.v2-interpreter-entry').count(),0);
  }
  await page.locator('.v2-view-header .v2-access-qr').click();
  await page.locator('.sag-qr-dialog[open] img').waitFor();
  assert.match(await page.locator('.sag-qr-dialog img').getAttribute('src'),/^data:image\/png/);
  assert.match(await page.locator('.sag-qr-dialog').innerText(),/종로5가/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log('PASS no-login public flags, independent home/live congestion, menu QR generation; interpreter stays hidden. Local production build, mocked arrival/source failures.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
