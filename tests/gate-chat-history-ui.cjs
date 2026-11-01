const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3025'],{stdio:['ignore','pipe','pipe']});let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);let browser;
 try{
  for(let i=0;i<100&&!output.includes('Ready');i++)await pause(100);assert.ok(output.includes('Ready'),output);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  for(const qr of [false,true])for(const [lang,label] of [['ko','한국어'],['en','English'],['ja','日本語'],['zh','中文']]){
   const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true});const errors=[],requests=[];let documents=0;
   await p.addInitScript(()=>{window.SpeechRecognition=class{start(){window.activeSpeech=this;}abort(){this.onend?.();}};});
   p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.isNavigationRequest()&&r.frame()===p.mainFrame())documents++;});
   await p.route('**/api/stats/**',r=>r.fulfill({status:204}));
   await p.route('**/api/google-search',async r=>{const body=r.request().postDataJSON();requests.push(body);await pause(150);await r.fulfill({json:{ok:true,answer:'Reply: '+body.question,sources:[]}});});
   await p.goto('http://localhost:3025/'+(qr?'?from=gate':''));await p.getByRole('button',{name:label,exact:true}).click();
   async function ask(question){await p.getByRole('textbox',{name:'message'}).fill(question);await p.locator('.sag-input-wrap button[type=submit]').click();await p.locator('.sag-row.assistant').filter({hasText:'Reply: '+question}).waitFor();}
   await ask('first question');await p.locator('.sag-actions button').nth(1).click();await p.locator('.sag-gate-code-grid button').first().click();
   const guide=p.locator('.sag-gate-resolution');await guide.waitFor();const guideText=await guide.innerText();
   await p.getByRole('textbox',{name:'message'}).fill('gate follow-up');await p.locator('.sag-input-wrap button[type=submit]').click();
   assert.equal(await guide.count(),1,'gate result must remain while the answer loads');
   await p.locator('.sag-row.assistant').filter({hasText:'Reply: gate follow-up'}).waitFor();assert.equal(await guide.innerText(),guideText);assert.equal(requests[1].history.length,0,'gate selection keeps the existing context boundary');assert.ok((await p.locator('.sag-chat').innerText()).includes('Reply: first question'));
   await ask('another follow-up');assert.equal(await guide.count(),1);assert.ok((await p.locator('.sag-chat').innerText()).includes('Reply: gate follow-up'));assert.equal(requests.at(-1).history.length,2);assert.equal(requests.at(-1).lang,lang);assert.equal(documents,1,'no document reload');assert.equal(errors.length,0,errors.join('\n'));
   if(!qr&&lang==='ko'){await pause(750);await p.locator('.sag-actions button').nth(1).click();await p.locator('.sag-gate-code-grid button').first().click();const count=await p.locator('.sag-gate-resolution').count();await p.getByRole('button',{name:'Start voice input',exact:true}).click();await p.evaluate(()=>{const speech=window.activeSpeech;speech.onresult({results:[Object.assign([{transcript:'voice follow-up'}],{isFinal:true})]});speech.onend();});await p.locator('.sag-row.assistant').filter({hasText:'Reply: voice follow-up'}).waitFor();assert.equal(await p.locator('.sag-gate-resolution').count(),count,'voice keeps gate results too');}
   console.log('PASS',qr?'gate QR':'normal',lang,'gate result, previous chat and follow-ups preserved');await p.close();
  }
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
