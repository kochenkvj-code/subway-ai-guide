const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3084'],{stdio:['ignore','pipe','pipe']});
 let log='',browser;server.stdout.on('data',x=>log+=x);server.stderr.on('data',x=>log+=x);
 try{
  for(let i=0;i<100&&!log.includes('Ready');i++)await wait(100);assert.ok(log.includes('Ready'),log);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const p=await browser.newPage({viewport:{width:375,height:812}}),errors=[];let facilityCalls=0,placeFound=false;
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{
   window.__resultScrolls=[];
   const original=Element.prototype.scrollTo;
   Element.prototype.scrollTo=function(...args){if(this.classList.contains('v2-feature-pane'))window.__resultScrolls.push({args,hasPlace:!!this.querySelector('.rl-place-card'),hasRoute:!!this.querySelector('.rl-route-card')});return original.apply(this,args);};
  });
  await p.route('**/api/**',async r=>{
   const url=new URL(r.request().url());
   if(url.pathname==='/api/v2/facilities'){
    facilityCalls++;
    return r.fulfill({json:{ok:true,stationCode:'0154',categories:[
     {id:'elevator',count:2,items:[{elvtrNm:'엘리베이터',dtlPstn:'지하1층 2번 출입구 부근',bgngFlr:'B1',endFlr:'1',oprtngSitu:'M'},{elvtrNm:'엘리베이터',dtlPstn:'미등록장소 3번 출입구 옆',bgngFlr:'B1',endFlr:'1',oprtngSitu:'M'}]},
     {id:'nursing',count:1,items:[{dtlPstn:'고객안전실 내부',stnFlr:'B1',nrsrmUtztnMth:'1인가족 단독사용',utztnHr:'영업시간내'}]}
    ],partial:false}});
   }
   if(url.pathname==='/api/v2/route-place-test'){
    await wait(250);
    return r.fulfill({json:{ok:true,status:placeFound?'found':'unverified',answer:Array(15).fill('Destination guidance fixture.').join('\n\n'),place:'Fixture destination',station:placeFound?{ko:'강남',en:'Gangnam',ja:'カンナム',zh:'江南',code:'0222',lines:['2호선']}:null,rawRouteStationValues:[]}});
   }
   if(url.pathname==='/api/subway-route'){
    await wait(250);
    return r.fulfill({json:{ok:true,route:{originCode:'0154',origin:'종로5가',destination:'강남',totalSeconds:1800,totalMeters:12000,fareWon:1550,transferCount:1,itinerary:Array.from({length:6},()=>({type:'ride',line:'2호선',from:'을지로3가',to:'강남',segments:12,stations:['을지로3가','강남']}))}}});
   }
   return r.fulfill({json:{ok:true,groups:[],positions:[],count:0}});
  });
  for(const lang of ['ko','en','ja','zh']){
   await p.goto('http://localhost:3084/v2?station=0154&view=facility&lang='+lang);
   await p.locator('.sf-record').first().waitFor();
   const text=await p.locator('.v2-facility-scope').innerText();
   if(lang!=='ko'){
    assert.ok(!text.includes('1인가족 단독사용'));assert.ok(!text.includes('고객안전실 내부'));
    assert.ok(text.includes(({en:'Korean source',ja:'韓国語原文',zh:'韩文原文'})[lang]+': 미등록장소 3번 출입구 옆'));
   }
   assert.equal(await p.locator('.sf-record').count(),3);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  assert.equal(facilityCalls,4,'one live facility request per visit, no translation requests');
  for(const width of [320,375,390,768])for(const lang of ['ko','en','ja','zh']){
   await p.setViewportSize({width,height:812});
   await p.goto('http://localhost:3084/v2?station=0154&view=route&lang='+lang);
   await p.locator('#rl-destination').waitFor();
   const metrics=await p.evaluate(()=>{
    const hero=document.querySelector('.rl-top p'),label=document.querySelector('.rl-destination-heading label'),chip=document.querySelector('.rl-departure-chip');
    return {hero:{scroll:hero.scrollWidth,client:hero.clientWidth,height:hero.getBoundingClientRect().height,line:parseFloat(getComputedStyle(hero).lineHeight)},labelSize:parseFloat(getComputedStyle(label).fontSize),labelRight:label.getBoundingClientRect().right,chipLeft:chip.getBoundingClientRect().left,noOverflow:document.documentElement.scrollWidth<=innerWidth};
   });
   assert.ok(metrics.noOverflow,lang+' '+width+' page overflow');assert.ok(metrics.labelSize>=14);
   assert.ok(metrics.labelRight<=metrics.chipLeft+1,lang+' '+width+' heading overlap');
   if(lang==='en'){assert.ok(metrics.hero.height<=metrics.hero.line+1);assert.ok(metrics.hero.scroll<=metrics.hero.client+1,'English subtitle clips');}
  }
  await p.setViewportSize({width:375,height:812});
  for(const [query,target,found]of [['강남','.rl-route-card',false],['Fixture destination','.rl-place-card',true],['Unverified destination','.rl-place-card',false]]){
   placeFound=found;await p.goto('http://localhost:3084/v2?station=0154&view=route&lang=en');
   await p.locator('#rl-destination').fill(query);if(query==='강남')await p.getByRole('option').first().click();await p.locator('.rl-submit').click();
   assert.ok(await p.locator('.rl-submit').evaluate(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1),'loading button clips');
   await p.waitForFunction(()=>window.__resultScrolls.length>0);
   const scroll=await p.evaluate(()=>window.__resultScrolls.at(-1));
   assert.equal(scroll.args[0].behavior,'smooth');assert.equal(scroll.hasPlace,target==='.rl-place-card');
   if(found)assert.ok(scroll.hasRoute,'place scrolling waits for route completion');
   await p.waitForTimeout(700);
   assert.ok(await p.locator('.v2-route-pane').evaluate(e=>e.scrollTop>100),'results scroll within the pane');
  }
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.goto('http://localhost:3084/v2?station=0154&view=route&lang=en');
  await p.locator('#rl-destination').fill('강남');await p.getByRole('option').first().click();await p.locator('.rl-submit').click();await p.waitForFunction(()=>window.__resultScrolls.length>0);
  assert.equal((await p.evaluate(()=>window.__resultScrolls.at(-1))).args[0].behavior,'auto');
  assert.deepEqual(errors,[]);
  console.log('PASS: facility translations/fallback and record preservation; 4 languages × 4 widths; single-line English subtitle; larger label; rendered route/place result smooth scrolling and reduced motion. Mocked APIs only.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
