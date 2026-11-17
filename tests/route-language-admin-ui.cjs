const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://localhost:3132';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
for(const admin of [false,true]){const context=await browser.newContext({locale:'ko-KR',viewport:{width:390,height:844}}),page=await context.newPage();let outputLanguage=null;
 await page.addInitScript(()=>localStorage.setItem('subway_ai_guide_analytics_excluded','1'));
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;if(path==='/api/stats/auth')return r.fulfill({json:{authenticated:admin}});if(path==='/api/interpreter-access')return r.fulfill({json:{admin,routeShare:admin}});if(path==='/api/v2/route-place-test'){outputLanguage=r.request().postDataJSON().lang;return r.fulfill({json:{ok:true,status:'ambiguous',answer:'test'}});}return r.fulfill({status:503,json:{error:'fixture'}});});
 await page.goto(base+'/?station=0154&view=route&lang=ko');await page.locator('#rl-destination').waitFor();
 if(admin){await page.locator('select[aria-label="Result language"]').waitFor();await page.locator('select[aria-label="Result language"]').selectOption('ja');}
 else{await page.locator('.rl-submit-full').waitFor();assert.equal(await page.locator('select[aria-label="Result language"]').count(),0);const widths=await page.locator('.rl-submit-row').evaluate(e=>[e.clientWidth,e.querySelector('button').getBoundingClientRect().width]);assert.ok(Math.abs(widths[0]-widths[1])<2);await page.locator('.v2-workspace .v2-bottom-languages button[lang="ja"]').click();}
 await page.locator('#rl-destination').fill('롯데호텔 서울');await page.locator('.rl-submit').click();await page.locator('.rl-place-card').waitFor();assert.equal(outputLanguage,'ja');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await context.close();}
 console.log('PASS admin-only language selector, full-width passenger button, and Japanese request in both modes');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
