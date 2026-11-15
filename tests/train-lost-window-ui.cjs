const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const messages={
 ko:'하차 후 30분 이내의 최근 열차만 실시간 위치로 검색할 수 있어요.',
 en:'You can only search live train positions within 30 minutes of getting off.',
 ja:'下車後30分以内の列車のみ、リアルタイム位置を検索できます。',
 zh:'仅可查询下车后30分钟内的列车实时位置。'
};
(async()=>{
 await fs.mkdir('work/train-lost-window',{recursive:true});
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3097']);let output='',browser;
 server.stdout.on('data',data=>output+=data);server.stderr.on('data',data=>output+=data);
 const errors=[],checks=[];
 try{
  for(let i=0;i<100&&!output.includes('Ready');i++)await pause(100);assert.ok(output.includes('Ready'),output);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  for(const clock of ['2026-11-15T13:30:40+09:00','2026-11-15T13:30:59.999+09:00','2026-11-15T00:10:40+09:00']){
   const now=Date.parse(clock),page=await browser.newPage({viewport:{width:390,height:844}});
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(fixed=>{const NativeDate=Date;class FixedDate extends NativeDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}}window.Date=FixedDate;},now);
   let requests=0;
   await page.route('**/api/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/v2/train-lost/position'){
     requests++;
     return route.fulfill({json:{ok:true,positions:[{trainNo:'1099',line:'1',station:'도봉',destination:'소요산',direction:'0',status:'1',express:false,receivedAt:new Date(now).toISOString()}],fetchedAt:new Date(now).toISOString()}});
    }
    return route.fulfill({json:{ok:true,evidence:[],count:0}});
   });
   async function form(lang){
    await page.goto('http://localhost:3097/?station=0154&view=lost&lang='+lang);
    await page.locator('#tl-item').fill('black bag');
    const names={ko:'동대문',en:'Dongdaemun',ja:'トンデムン',zh:'东大门'};
    await page.locator('.tl-directions button').filter({hasText:names[lang]}).click();
    await page.locator('.tl-cars button').first().click();await page.locator('.tl-door-options button').first().click();
    assert.equal(await page.locator('.tl-time-slider').getAttribute('max'),'30');
   }
   for(const lang of ['ko','en','ja','zh']){
    for(const minutes of [29,30]){
     await form(lang);await page.locator('.tl-time-slider').focus();await page.locator('.tl-time-slider').press('End');if(minutes===29)await page.locator('.tl-time-slider').press('ArrowLeft');
     assert.equal(await page.locator('.tl-time-slider').inputValue(),String(minutes));
     const before=requests;await page.locator('.tl-search-footer button').click();await page.locator('.tl-candidate-chip').first().waitFor();
     assert.ok(requests>before,'slider '+minutes+' must reach live API');assert.equal(await page.locator('.tl-time-window-error').count(),0);assert.ok((await page.locator('.tl-candidate-chip').first().innerText()).includes('1099'));
     checks.push({clock,lang,input:'slider',minutes,result:'live query and candidate visible'});
    }
    for(const minutes of [30,31]){
     await form(lang);await page.locator('.tl-chip-manual').click();const kst=new Date(now-minutes*60000+9*3600000).toISOString();await page.locator('.tl-time-edit input').fill(kst.slice(11,16));const before=requests;await page.locator('.tl-search-footer button').click();
     if(minutes===30){await page.locator('.tl-candidate-chip').first().waitFor();assert.ok(requests>before);assert.equal(await page.locator('.tl-time-window-error').count(),0);checks.push({clock,lang,input:'manual',minutes,result:'live query and candidate visible'});}
     else{
      const warning=page.locator('.tl-time-window-error');await warning.waitFor();assert.equal((await warning.innerText()).trim(),messages[lang]);assert.equal(await warning.evaluate(node=>getComputedStyle(node).textAlign),'center');assert.equal(requests,before,'31-minute input must not call live API');
      await page.screenshot({path:'work/train-lost-window/window-'+lang+'.png'});checks.push({clock,lang,input:'manual',minutes,result:'blocked before API; localized, centered error'});
     }
    }
   }
   // A displayed error follows language changes without rerunning the query.
   const before=requests;for(const lang of ['en','ja','zh','ko']){await page.locator('.v2-bottom-languages button[lang="'+(lang==='zh'?'zh-CN':lang)+'"]:visible').first().click();assert.equal((await page.locator('.tl-time-window-error').innerText()).trim(),messages[lang]);}
   assert.equal(requests,before);await page.close();
  }
  assert.deepEqual(errors,[]);const report={cases:checks.length,checks,errors,liveData:'local API fixtures; fixed clock, no production analytics or SMS sends',productionDeployments:0,previewDeployments:0};await fs.writeFile('work/train-lost-window/browser-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({cases:checks.length,errors,clocks:3,languages:4,checks:'29/30-minute slider + 30-minute manual query/candidate, 31-minute manual blocked, centered translations and language switch',productionDeployments:0}));
 }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
