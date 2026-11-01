const {chromium}=require('playwright'),{spawn,execFileSync}=require('node:child_process'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 // The live copy must stay identical to the version preceding this V2 change.
 const before=execFileSync('git',['show','1d970d0:app/components/GuideExperience.jsx'],{encoding:'utf8'}),after=fs.readFileSync('app/components/GuideExperience.jsx','utf8');
 for(const name of ['GATE_MENU','GATE_UI','GATE_GUIDES']){function read(s){const start=s.indexOf('const '+name+' =');return vm.runInNewContext(s.slice(start,s.indexOf('\n};',start)+3)+'\n'+name);}assert.deepEqual(JSON.stringify(read(after)),JSON.stringify(read(before)),name+' live copy changed');}
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3027'],{stdio:['ignore','pipe','pipe']});let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);let browser;
 try{for(let i=0;i<100&&!output.includes('Ready');i++)await wait(100);assert.ok(output.includes('Ready'),output);browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/stats/**',r=>r.fulfill({status:204}));await p.route('**/api/train-arrivals*',r=>r.fulfill({json:{ok:false}}));
 const phrases={ko:'멈추거나 되돌아가지 말고',en:'Do not stop or turn back',ja:'立ち止まったり引き返したりせず',zh:'不要停下或返回'};
 for(const [width,height] of [[390,844],[320,640]]){
 await p.setViewportSize({width,height});await p.goto('http://localhost:3027/v2?view=gate');
 for(const lang of ['ko','en','ja','zh']){
 await p.locator('.v2-view-header .v2-language select').selectOption(lang);await p.locator('.sag-gate-code-grid').waitFor();
 for(const code of ['E-01','E-03','E-04','E-05','E-06','E-14','E-33','E-44']){
 await p.locator('.sag-gate-code-grid button').filter({hasText:code}).click();const card=p.locator('.sag-gate-resolution').last();await card.waitFor();
 if(['E-33','E-44'].includes(code)){assert.equal(await card.locator('.sag-gate-steps li').count(),2);assert.equal(await card.locator('.sag-gate-ux-status').count(),1);assert.ok((await card.locator('.sag-gate-steps').innerText()).includes(phrases[lang]));}
 if(['E-03','E-04','E-05'].includes(code))assert.equal(await card.locator('.sag-gate-ux-note').count(),1);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(code==='E-44'&&width===390){await p.screenshot({path:'work/v2-gate-writing-'+lang+'.png'});const actions=await card.locator('.sag-gate-result-actions').boundingBox();const chat=await p.locator('.sag-chat').boundingBox();assert.ok(actions.y+actions.height<=chat.y+chat.height+2,JSON.stringify({lang,actions,chat}));}
 await card.locator('.sag-gate-result-actions > button').first().click();}
 }
 }
 // Switching language on the result must keep the same selected error.
 await p.locator('.sag-gate-code-grid button').filter({hasText:'E-44'}).click();await p.locator('.v2-view-header .v2-language select').selectOption('ja');assert.equal(await p.locator('.sag-gate-resolution .sag-gate-result-code').last().innerText(),'E-44');assert.ok((await p.locator('.sag-gate-resolution').last().innerText()).includes(phrases.ja));
 await p.goto('http://localhost:3027/');await p.locator('.sag-actions button').nth(1).click();await p.locator('.sag-gate-code-grid button').filter({hasText:'E-44'}).click();assert.equal(await p.locator('.sag-gate-ux-status').count(),0);assert.equal(await p.locator('.sag-gate-result-heading h2').last().innerText(),'당역 재하차');assert.equal(errors.length,0,errors.join('\n'));console.log('PASS V2 gate copy: 8 errors × 4 languages × 2 mobile sizes, explicit beep guidance, result language preservation, actions visible at 390px; V1 copy unchanged');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
