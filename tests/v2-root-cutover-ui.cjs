const {chromium}=require('playwright'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3086'],{stdio:['ignore','pipe','pipe']});
 let log='',browser;server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
 try{
  for(let i=0;i<100&&!log.includes('Ready');i++)await wait(100);assert.ok(log.includes('Ready'),log);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
  const p=await context.newPage(),errors=[],events=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/api/**',r=>{
   const path=new URL(r.request().url()).pathname;
   if(path==='/api/stats/event'){events.push(r.request().postDataJSON());return r.fulfill({status:204});}
   return r.fulfill({json:{ok:true,groups:[],positions:[],count:0,categories:[],stationCode:'0152'}});
  });
  const root='http://localhost:3086';
  for(const path of ['/','/?station=0152','/v2?station=0152']){
   await p.goto(root+path);await p.locator('.se-station').waitFor();
   const station=path==='/'?'0154':'0152';assert.equal(new URL(p.url()).searchParams.get('station'),station);
   assert.ok((await p.locator('.se-station').innerText()).includes(station==='0154'?'종로5가':'종각'));
  }
  for(const path of ['/?from=gate','/?station=0152&from=gate','/v2?station=0152&from=gate','/?station=0152&view=gate&lang=ja','/?station=0152&from=gate&lang=zh']){
   await p.goto(root+path);await p.locator('.sag-gate-code-grid').waitFor();
   const url=new URL(p.url());assert.equal(url.searchParams.get('view'),'gate');
   const lang=path.includes('lang=ja')?'ja':path.includes('lang=zh')?'zh':'en';
   assert.equal(await p.locator('.v2-app').getAttribute('lang'),lang==='zh'?'zh-CN':lang);
   assert.equal(url.searchParams.get('station'),path.includes('station=0152')?'0152':'0154');
   await p.reload();await p.locator('.sag-gate-code-grid').waitFor();
   await p.locator('.v2-home-button').click();await p.locator('.se-station').waitFor();assert.equal(new URL(p.url()).pathname,path.startsWith('/v2')?'/v2':'/');
  }
  for(const entry of ['/','/v2'])for(const lang of ['ko','en','ja','zh']){
   const before=events.length;await p.goto(root+entry+'?station=0152&lang='+lang);await p.locator('.se-station').waitFor();
   await p.waitForFunction(()=>!!document.querySelector('.v2-home:not([hidden])'));
   await p.locator('.se-station').click();await p.locator('.se-current-station').click();
   const urls=await p.locator('.se-url input').evaluateAll(es=>es.map(e=>e.value));
   for(const [index,href]of urls.entries()){const url=new URL(href);assert.equal(url.pathname,'/');assert.equal(url.searchParams.get('station'),'0152');assert.equal(url.searchParams.get('view'),index?'gate':null);assert.equal(url.searchParams.get('lang'),lang==='ko'?null:lang);}
   await p.locator('.se-url button').first().click();assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),urls[0]);
   assert.ok(events.slice(before).some(e=>e.event_type==='page_view'&&e.language===lang),'visit language '+lang);
   await p.locator('.se-dialog .se-heading>button').click();
  }
  await p.goto(root+'/?station=0152');await p.locator('.se-station').click();await p.locator('.se-filters input').fill('0153');await p.locator('[data-station-code="0153"]').click();
  assert.equal(new URL(p.url()).pathname,'/');await p.locator('.se-current-station').click();assert.ok((await p.locator('.se-url input').first().inputValue()).includes('station=0153'));
  await p.locator('.se-dialog .se-heading>button').click();await p.goBack();await p.locator('.se-station').waitFor();assert.equal(new URL(p.url()).searchParams.get('station'),'0152');
  for(const width of [320,390]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  const before=events.length;await p.locator('.v2-grid button').filter({hasText:'길찾기'}).click();await p.locator('#rl-destination').waitFor();assert.equal(new URL(p.url()).searchParams.get('view'),'route');
  await p.waitForTimeout(100);assert.equal(events.slice(before).filter(e=>e.event_type==='quick_menu'&&e.event_name==='route').length,1);
  await p.goBack();await p.locator('.se-station').waitFor();
  for(const code of ['','154','9999']){await p.goto(root+'/?station='+code);await p.locator('.se-invalid').waitFor();assert.equal(await p.locator('.v2-app').count(),0);}
  for(const path of ['/legacy','/legacy?from=gate']){
   await p.goto(root+path);await p.locator('.sag-phone').waitFor();assert.equal(await p.locator('.v2-app').count(),0);
   if(path.includes('gate')){await p.locator('.sag-gate-code-grid').waitFor();assert.equal(await p.locator('.sag-languages button.active').innerText(),'English');}
  }
  assert.deepEqual(errors,[]);console.log('PASS root and /v2 entry, both gate forms, 4-language visit/QR/clipboard, selection/back/reload/home, invalid stations, legacy/legacy gate, mobile widths, route event once. API fixtures only.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
