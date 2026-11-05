const {chromium}=require('playwright'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3061'],{stdio:['ignore','pipe','pipe']});let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);let browser;try{for(let i=0;i<100&&!log.includes('Ready');i++)await wait(100);assert.ok(log.includes('Ready'),log);browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/**',r=>{if(r.request().url().includes('/api/v2/chat')){const body=r.request().postDataJSON();return r.fulfill({json:{ok:true,stationCode:body.stationCode,answer:'확인 가능한 정보와 연결된 시설을 안내해 드립니다. 질문의 기준역과 호선을 구분하여 안내합니다. '.repeat(3),recommendedMenu:'route',searchSuggestion:'<div style="width:460px;background:#202020;color:white;padding:10px">Google search display fixture · unchanged provider markup</div>'}})}return r.fulfill({json:{ok:false,count:0}})});
for(const width of [320,390])for(const lang of ['ko','en','ja','zh']){await p.setViewportSize({width,height:844});await p.goto('http://localhost:3061/v2?station=2637&lang='+lang+'&view=chat');const input=p.locator('.v2-chat-pane .sag-input-wrap input');await input.fill('시설 안내를 알려주세요.');await input.press('Enter');await p.locator('.sag-menu-recommendation').waitFor();const result=await p.evaluate(()=>{const row=document.querySelector('.v2-chat-pane .sag-row.assistant'),bubble=row.querySelector('.sag-bubble'),notice=document.querySelector('.v2-chat-privacy'),style=getComputedStyle(notice);return {ratio:bubble.getBoundingClientRect().width/row.getBoundingClientRect().width,noticeLines:(notice.getBoundingClientRect().height-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom))/parseFloat(style.lineHeight),noticeFits:notice.scrollWidth<=notice.clientWidth,noticeAtTop:!!notice.closest('.v2-view-header')&&notice.getBoundingClientRect().top>=document.querySelector('.v2-view-header').getBoundingClientRect().top&&notice.getBoundingClientRect().bottom<=document.querySelector('.v2-view-header').getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth,searchScrollable:document.querySelector('.sag-search-suggestion').scrollWidth>document.querySelector('.sag-search-suggestion').clientWidth}});assert.ok(result.ratio<=.855&&result.ratio>.8,JSON.stringify(result));assert.ok(result.noticeAtTop&&result.noticeFits,lang+' '+JSON.stringify(result));assert.equal(await p.locator('.v2-chat-pane .sag-privacy-notice,.v2-chat-station').count(),0);assert.equal(result.overflow,false);assert.ok(result.searchScrollable);console.log(width,lang,result.ratio.toFixed(2),'natural notice inside title row');if(width===390&&lang==='ko')await p.screenshot({path:'work/v2-chat-bubbles-preview.png'});}
// Simulate independent iOS visual-viewport resize/pan updates. This is a
// geometry regression, NOT a substitute for real iPhone Safari verification.
await p.setViewportSize({width:390,height:844});
await p.goto('http://localhost:3061/v2?station=2637&view=chat');
const composer=p.locator('.v2-chat-pane .sag-input-wrap input');
await composer.waitFor();
assert.ok(parseFloat(await composer.evaluate(e=>getComputedStyle(e).fontSize))>=16,'prevent iOS input auto zoom');
assert.equal(await p.locator('.v2-chat-workspace').evaluate(e=>getComputedStyle(e).position),'fixed','one fixed viewport shell');
assert.notEqual(await p.evaluate(()=>getComputedStyle(document.body).position),'fixed','do not fix document');
await composer.fill('작성 중인 질문');
async function viewport(height,top){
  await p.evaluate(({height,top})=>{
    // Deliberately make pageTop disagree with offsetTop. Using pageTop for a
    // fixed element would double count document scrolling.
    Object.defineProperties(visualViewport,{
      height:{configurable:true,value:height},
      offsetTop:{configurable:true,value:top},
      pageTop:{configurable:true,value:top+220}
    });
    visualViewport.dispatchEvent(new Event('resize'));
    visualViewport.dispatchEvent(new Event('scroll'));
  },{height,top});
  await p.waitForFunction(({height,top})=>{
    const rect=document.querySelector('.v2-chat-workspace').getBoundingClientRect();
    return Math.abs(rect.height-height)<2&&Math.abs(rect.top-top)<2;
  },{height,top});
}
const dock=p.locator('.v2-workspace .v2-bottom-tabs');
for(let i=0;i<3;i++){
  await composer.focus();
  await viewport(470,0);
  await viewport(470,86);
  let box=await composer.boundingBox();
  assert.ok(box.y>=86&&box.y+box.height<=556,'composer follows visible viewport');
  assert.ok(await dock.isVisible(),'bottom tabs remain present');
  const dockHeight=(await dock.boundingBox()).height;
  await p.evaluate(()=>{
    window.__scrollCorrections=0;
    window.__originalScrollTo=window.scrollTo;
    window.scrollTo=(...args)=>{window.__scrollCorrections++;window.__originalScrollTo(...args);};
  });
  // iPhone keyboard "Done" does not always blur the input. The viewport
  // must still return to its full height without an extra focusout/timeout.
  let previousHeight=470,previousY=(await composer.boundingBox()).y-86;
  for(const [height,top] of [[520,40],[580,30],[650,20],[720,10],[790,5],[844,0]]){
    await viewport(height,top);
    const currentY=(await composer.boundingBox()).y-top;
    assert.ok(Math.abs((currentY-previousY)-(height-previousHeight))<2,'composer tracks viewport smoothly without a second layout step');
    assert.equal((await dock.boundingBox()).height,dockHeight,'dock does not reflow during closing');
    previousHeight=height;previousY=currentY;
  }
  const finalY=(await composer.boundingBox()).y;
  await p.waitForTimeout(250);
  assert.equal((await composer.boundingBox()).y,finalY,'no delayed keyboard-close jump');
  assert.equal(await p.evaluate(()=>window.__scrollCorrections),0,'no forced page scrolling during keyboard animation');
  assert.ok(box.y>=0);
  box=await composer.boundingBox();
  assert.ok(box.y>680&&box.y+box.height<844,'composer returns to bottom even with retained focus');
  assert.equal(await composer.inputValue(),'작성 중인 질문');
  await composer.evaluate(e=>e.blur());
  await viewport(844,0);
  assert.ok(Math.abs((await composer.boundingBox()).y-finalY)<2,'blur does not move the composer after keyboard is closed');
  await p.evaluate(()=>{window.scrollTo=window.__originalScrollTo;});
}
// A changed document scroll offset must not change where the fixed chat shell
// appears relative to the visual viewport.
await p.evaluate(()=>{document.body.style.minHeight='1600px';window.scrollTo(0,120);});
await viewport(470,86);
assert.ok(Math.abs(await p.locator('.v2-chat-workspace').evaluate(e=>e.getBoundingClientRect().top)-86)<2);
await p.evaluate(()=>{document.body.style.minHeight='';window.scrollTo(0,0);});
await viewport(844,0);
await p.locator('.v2-view-header>button').last().click();await p.locator('.v2-home:not([hidden])').waitFor();
assert.equal(await p.evaluate(()=>document.body.style.position),'','release page scroll on leaving chat');
await p.evaluate(()=>{delete visualViewport.height;delete visualViewport.offsetTop;delete visualViewport.pageTop;});
await p.setViewportSize({width:320,height:500});await p.evaluate(()=>window.scrollTo(0,150));
assert.ok(await p.evaluate(()=>window.scrollY)>0,'home remains scrollable');
console.log('PASS repeated keyboard resize/pan/blur/close, input font, draft retention and home scroll restoration (simulated visual viewport).');
await p.goto('http://localhost:3061/');assert.ok((await p.locator('.sag-privacy-notice').innerText()).includes('질문은 답변 생성을 위해'));assert.equal(await p.locator('.v2-design-refresh').count(),0);assert.deepEqual(errors,[]);console.log('PASS local-only V2 chat widths, four-language natural notices inside the existing title row, provider markup containment, and unchanged V1 privacy text.');}finally{await browser?.close();server.kill('SIGTERM')}})().catch(e=>{console.error(e);process.exit(1)});
