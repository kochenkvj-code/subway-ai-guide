const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://localhost:3191';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const errors=[];
async function open(context,path){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/v2/**',r=>r.fulfill({status:503,json:{error:'fixture'}}));const response=await p.goto(base+path);assert.equal(response.status(),200);return p;}
try{
 const c=await browser.newContext({viewport:{width:390,height:844}});await c.addInitScript(()=>localStorage.setItem('subway_ai_guide_analytics_excluded','1'));
 const path='/v2/operation-timetable-test?station=0200&lang=ja';const p=await open(c,path);
 await p.getByLabel('관리자 비밀번호',{exact:true}).waitFor();assert.equal(await p.locator('.tl-table,.tl-top').count(),0);assert.equal((await c.request.get(base+'/api/v2/operation-timetable-test?stationCode=0200')).status(),403);
 await p.getByLabel('관리자 비밀번호',{exact:true}).fill('wrong-fixture');await p.getByRole('button',{name:'로그인하고 시간표 열기',exact:true}).click();await p.getByRole('alert').waitFor();assert.equal(await p.locator('.tl-top').count(),0);
 await p.getByLabel('관리자 비밀번호',{exact:true}).fill('fixture-only');await p.getByRole('button',{name:'로그인하고 시간표 열기',exact:true}).click();await p.locator('.tl-top').waitFor();assert.equal(new URL(p.url()).search,'?station=0200&lang=ja');assert.match(await p.locator('.tl-station').innerText(),/カチサン/);assert.equal(await p.locator('#operation-test-password').count(),0);
 // A previously logged-in statistics session can repair a missing root-scoped staff cookie.
 await c.clearCookies({name:'sag_staff_access'});assert.equal((await c.request.get(base+'/api/v2/operation-timetable-test?stationCode=0200')).status(),403);
 const restored=await open(c,path);await restored.locator('.tl-top').waitFor();assert.equal(await restored.locator('#operation-test-password').count(),0);assert.equal(new URL(restored.url()).search,'?station=0200&lang=ja');
 // With neither cookie, the page presents a login form instead of a fake missing-page response.
 await c.clearCookies();const fresh=await open(c,'/v2/operation-timetable-test?station=0154&lang=ko');await fresh.getByLabel('관리자 비밀번호',{exact:true}).waitFor();assert.equal(await fresh.locator('text=This page could not be found.').count(),0);assert.equal(await fresh.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await fresh.screenshot({path:'work/operation-timetable-login-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS: no-cookie page shows login (200), data API remains 403; wrong password rejected; existing login enters requested station/language; stats-only cookie auto-restores root session; no administrator secret retrieved.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
