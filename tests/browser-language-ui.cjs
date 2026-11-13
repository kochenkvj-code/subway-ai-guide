// Run after npm run build. Playwright must be available on NODE_PATH.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const server=process.env.BASE_URL?null:spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3072'],{stdio:['ignore','pipe','pipe']});
 const base=process.env.BASE_URL||'http://localhost:3072';let logs='',browser,checks=0;
 server?.stdout.on('data',d=>logs+=d);server?.stderr.on('data',d=>logs+=d);
 try{
  if(server){for(let i=0;i<100&&!logs.includes('Ready');i++)await wait(100);assert.ok(logs.includes('Ready'),logs);}
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const errors=[];
  async function setup(locale,unavailable=false,iphone=false){
   const context=await browser.newContext({locale,viewport:{width:390,height:844},...(iphone?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}:{})});
   if(unavailable)await context.addInitScript(()=>Object.defineProperty(Navigator.prototype,'language',{get(){throw Error('unavailable');}}));
   const page=await context.newPage(),calls=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/**',async route=>{
    if(new URL(route.request().url()).pathname==='/api/v2/chat'){
     calls.push(route.request().postDataJSON());
     return route.fulfill({json:{ok:true,answer:'Language request received.',stationCode:calls.at(-1).stationCode,recommendedMenu:null}});
    }
    return route.fulfill({json:{ok:false,count:0}});
   });
   return {context,page,calls};
  }
  async function selected(page,lang){await page.locator('.v2-app').waitFor();await page.waitForFunction(l=>document.querySelector('.v2-app')?.lang===(l==='zh'?'zh-CN':l),lang);assert.equal(await page.locator('.v2-bottom-languages:visible button[aria-pressed="true"]').getAttribute('lang'),lang==='zh'?'zh-CN':lang);checks++;}
  for(const [locale,lang]of [['ko-KR','ko'],['en-US','en'],['en-GB','en'],['ja-JP','ja'],['zh-CN','zh'],['zh-TW','zh'],['fr-FR','en'],['th-TH','en']]){
   console.log('locale',locale);const {context,page,calls}=await setup(locale);
   for(const path of ['/','/v2','/?view=gate','/?from=gate','/v2?from=gate']){await page.goto(base+path);await selected(page,lang);}
   await page.goto(base+'/?lang=ko');await selected(page,'ko');
   await page.goto(base+'/?lang=ja');await selected(page,'ja');
   await page.goto(base+'/');await selected(page,lang);
   await page.locator('.v2-ask input').fill('신라호텔');await page.locator('.v2-ask input').press('Enter');
   await page.waitForFunction(()=>document.querySelector('.sag-bubble')?.textContent.includes('Language request received.')||[...document.querySelectorAll('.sag-bubble')].some(e=>e.textContent.includes('Language request received.')));
   assert.equal(calls.at(-1).lang,lang);checks++;await context.close();
  }
  const unavailable=await setup('ja-JP',true);await unavailable.page.goto(base+'/');await selected(unavailable.page,'en');await unavailable.context.close();
  for(const iphone of [false,true]){
   const {context,page,calls}=await setup('ja-JP',false,iphone);await page.goto(base+'/');await selected(page,'ja');
   await page.locator('.v2-bottom-languages:visible button[lang="ko"]').click();await selected(page,'ko');
   await page.reload();await selected(page,'ko');
   await page.locator('.v2-ask input').fill('신라호텔');await page.locator('.v2-ask input').press('Enter');
   await page.waitForFunction(()=>[...document.querySelectorAll('.sag-bubble')].some(e=>e.textContent.includes('Language request received.')));
   assert.equal(calls.at(-1).lang,'ko');checks++;
   await page.locator('.v2-bottom-tabs:visible > button').first().click();await selected(page,'ko');
   await page.locator('.se-station').click();await page.locator('.se-filters input').fill('0152');await page.locator('[data-station-code="0152"]').click();await page.locator('.se-heading > button').click();await selected(page,'ko');
   assert.equal(new URL(page.url()).searchParams.get('station'),'0152');
   await page.goBack();await page.waitForURL(u=>u.searchParams.get('station')==='0154');await selected(page,'ko');
   await page.goForward();await page.waitForURL(u=>u.searchParams.get('station')==='0152');await selected(page,'ko');
   await page.reload();await selected(page,'ko');
   await context.close();
  }
  assert.deepEqual(errors,[]);console.log(`PASS browser language: ${checks} UI/request assertions; locales, root/V2/gate, URL priority, unavailable language, manual Korean, station/history and iPhone home-to-chat handoff. Gemini requests mocked.`);
 }finally{await browser?.close();server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
