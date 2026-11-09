const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3067'],{stdio:['ignore','pipe','pipe']});
  let logs='';
  server.stdout.on('data',chunk=>{logs+=chunk;});
  server.stderr.on('data',chunk=>{logs+=chunk;});
  let browser;
  try{
    for(let i=0;i<200&&!logs.includes('Ready');i++)await sleep(100);
    assert.ok(logs.includes('Ready'),logs.slice(-800));
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/**',async route=>route.fulfill({status:200,json:{ok:true,categories:[],items:[],results:[]}}));
    await page.goto('http://127.0.0.1:3067/v2?station=0154&view=route',{waitUntil:'networkidle'});
    await page.locator('#rl-destination').waitFor();

    async function assertDock(view){
      const data=await page.evaluate(()=>{
        const shell=document.querySelector('.v2-workspace');
        const nav=shell.querySelector('.v2-bottom-tabs');
        const button=nav.querySelector('button');
        const rect=button.getBoundingClientRect();
        const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
        return {position:getComputedStyle(shell).position,height:shell.getBoundingClientRect().height,bottom:nav.getBoundingClientRect().bottom,hit:hit===button||button.contains(hit)};
      });
      assert.equal(data.position,'fixed',view+' should use a fixed workspace');
      assert.ok(Math.abs(data.height-844)<=2,view+' height '+JSON.stringify(data));
      assert.ok(Math.abs(data.bottom-844)<=2,view+' nav '+JSON.stringify(data));
      assert.equal(data.hit,true,view+' visible tab is not a click target');
    }
    await assertDock('route before keyboard');

    await page.locator('#rl-destination').focus();
    await page.evaluate(()=>{
      Object.defineProperty(window.visualViewport,'height',{configurable:true,value:480});
      window.visualViewport.dispatchEvent(new Event('resize'));
    });
    await page.waitForFunction(()=>Math.abs(document.querySelector('.v2-workspace').getBoundingClientRect().height-480)<=2,null,{polling:100});
    await page.evaluate(()=>{
      document.activeElement.blur();
      // Simulate iOS Safari retaining the keyboard-shrunken visual viewport
      // for several frames after the Done button has been pressed.
      window.visualViewport.dispatchEvent(new Event('resize'));
    });
    await page.waitForFunction(()=>Math.abs(document.querySelector('.v2-workspace').getBoundingClientRect().height-844)<=2,null,{polling:100});
    await assertDock('route after Done');

    await page.locator('.v2-workspace .v2-bottom-tabs button').first().click();
    await page.locator('.v2-grid button').filter({hasText:'시설안내'}).click();
    await assertDock('facilities after route Done');
    await page.locator('.v2-workspace .v2-bottom-tabs button').nth(1).click();
    await assertDock('AI chat after route Done');
    await page.locator('.v2-workspace .v2-bottom-tabs button').first().click();
    await page.locator('.v2-grid button').filter({hasText:'관광지 안내'}).click();
    await assertDock('tour after route Done');
    // The keyboard failure used to leak into nearly every menu after route.
    for(let i=0;i<9;i++){
      await page.locator('.v2-workspace .v2-bottom-tabs button').first().click();
      const menu=page.locator('.v2-grid>button').nth(i);
      const label=(await menu.innerText()).trim();
      await menu.click();
      await page.locator('.v2-workspace:not([hidden])').waitFor();
      await assertDock('menu '+i+': '+label);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS route keyboard Done restores bottom navigation and hit testing through facilities/chat/tour');
  }finally{
    await browser?.close();
    server.kill();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
