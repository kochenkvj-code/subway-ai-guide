const{chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://localhost:3180',id='11111111-1111-4111-8111-111111111111';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const errors=[],attempts=[],messages=[{id:'welcome',sender:'staff',sourceLang:'ko',targetLang:'zh',original:'안녕하세요',translated:'你好'}];let lang='ja',releaseFirst,holdFirst=true,failNext=false,releaseFailure,holdFailure=false;
try{const c=await browser.newContext({locale:'ja-JP',viewport:{width:390,height:844}});await c.addInitScript(id=>{
 localStorage.setItem('subway_ai_guide_analytics_excluded','1');sessionStorage.setItem('metro-interpreter-test-v1',JSON.stringify({room:id,token:'guest-token',role:'guest',stationCode:'0154',lang:'ja'}));window.voiceInstances=[];window.SpeechRecognition=window.webkitSpeechRecognition=class{constructor(){window.voiceInstances.push(this);}start(){}stop(){this.stopped=true;if(window.autoFinalize&&this.pendingText){const text=this.pendingText;this.pendingText='';setTimeout(()=>{this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:text+'。'}],{isFinal:true})]});this.onend?.();},20);}}abort(){this.aborted=true;}};
 window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},speak(speech){window.lastSpeech=speech;}}});
 },id);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/**',async r=>{const req=r.request(),u=new URL(req.url()),b=req.method()==='POST'?req.postDataJSON():{};
 if(u.pathname==='/api/stats/auth')return r.fulfill({json:{authenticated:false}});if(u.pathname==='/api/interpreter-access')return r.fulfill({json:{admin:false,interpreter:false}});
 if(u.pathname==='/api/interpreter-test'){
  if(u.searchParams.has('realtime'))return r.fulfill({status:503,json:{error:'fixture'}});
  if(b.action==='language')lang=b.lang;
  if(b.action==='send'){
   attempts.push({...b,languageAtSend:lang});
   if(holdFirst){holdFirst=false;await new Promise(resolve=>releaseFirst=resolve);}
   if(holdFailure){holdFailure=false;await new Promise(resolve=>releaseFailure=resolve);}
   if(failNext){failNext=false;return r.fulfill({status:503,json:{ok:false,error:'fixture-network'}});}
   if(!messages.some(m=>m.id===b.requestId))messages.push({id:b.requestId,sender:'guest',sourceLang:lang,targetLang:'ko',original:b.text,translated:'번역 '+b.text,createdAt:new Date().toISOString()});
  }
  return r.fulfill({json:{ok:true,room:{id,role:'guest',stationCode:'0154',staffLang:'ko',guestLang:lang,guestJoined:true,expiresAt:new Date(Date.now()+1800000).toISOString()},messages}});
 }
 return r.fulfill({status:503,json:{error:'fixture'}});
 });await p.goto(base+'/interpreter-test');await p.locator('.it-chat').waitFor();
 const event=async(rows,index=0)=>p.evaluate(({rows,index})=>voiceInstances.at(-1).onresult({resultIndex:index,results:rows.map(([text,isFinal])=>Object.assign([{transcript:text}],{isFinal}))}),{rows,index});
 await p.locator('.it-voice').click();assert.equal(await p.evaluate(()=>voiceInstances.at(-1).lang),'ja-JP');
 await event([['こんにちは',false]]);await p.waitForFunction(()=>document.querySelector('textarea').value==='こんにちは');assert.equal(attempts.length,0);
 const rows=[];for(let i=0;i<5;i++){rows.push(['発話'+i,true]);await event(rows,i);await event(rows,i);}
 await p.waitForFunction(()=>document.querySelector('.it-outbox summary')?.textContent.includes('5'));assert.equal(attempts.length,1);assert.equal(await p.locator('.it-voice.listening').count(),1);assert.equal(await p.locator('textarea').inputValue(),'');
 await p.locator('.it-room-toolbar select').selectOption('zh');assert.equal(lang,'ja');assert.equal(await p.locator('.it-page').getAttribute('lang'),'ja');releaseFirst();
 await p.waitForFunction(()=>document.querySelector('.it-page').lang==='zh-CN');assert.deepEqual(attempts.map(x=>x.text),rows.map(x=>x[0]));assert.ok(attempts.every(x=>x.languageAtSend==='ja'));assert.equal(new Set(attempts.map(x=>x.requestId)).size,5);
 await p.locator('.it-voice').click();assert.equal(await p.evaluate(()=>voiceInstances.at(-1).lang),'zh-CN');await event([['你好',false]]);await p.waitForFunction(()=>document.querySelector('textarea').value==='你好');
 await event([['你好',true],['你好',true]]);await p.waitForFunction(()=>!document.querySelector('.it-outbox'));assert.deepEqual(attempts.slice(-2).map(x=>x.text),['你好','你好']);
 // A normal native session ending restarts; a stale onend cannot restart another session.
 await p.evaluate(()=>{window.oldEnd=voiceInstances.at(-1).onend;voiceInstances.at(-1).onend();});await p.waitForFunction(()=>voiceInstances.length===3);await p.evaluate(()=>oldEnd());assert.equal(await p.evaluate(()=>voiceInstances.length),3);
 // Manual typing is immediately available while automatic translation is active.
 await p.locator('textarea').fill('manual message');assert.equal(await p.locator('.it-voice.listening').count(),0);await p.locator('.it-submit').click();await p.waitForFunction(()=>!document.querySelector('.it-outbox'));assert.equal(attempts.at(-1).text,'manual message');
 await p.locator('.it-voice').click();
 // Playback pauses native capture; OFF while paused prevents automatic resumption.
 const before=await p.evaluate(()=>voiceInstances.length);const listen=p.locator('.it-msg-tools button').filter({hasText:'朗读'}).first();await listen.click();assert.equal(await p.locator('.it-voice.listening').count(),0);await p.locator('.it-voice').click();await p.evaluate(()=>lastSpeech.onend());assert.equal(await p.evaluate(()=>voiceInstances.length),before);
 await p.locator('.it-voice').click();await listen.click();await p.evaluate(()=>lastSpeech.onend());await p.waitForFunction(n=>voiceInstances.length===n+1,before+1);
 // Two finalized utterances survive a failed request and retry with the SAME ID.
 holdFailure=true;failNext=true;const prior=attempts.length;await event([['失败后保留',true],['下一句',true]]);await p.waitForFunction(()=>document.querySelector('.it-outbox summary')?.textContent.includes('2'));releaseFailure();await p.locator('.it-outbox button').waitFor();assert.equal(await p.locator('.it-voice.listening').count(),0);assert.match(await p.locator('.it-outbox').innerText(),/失败后保留/);await p.screenshot({path:'work/continuous-interpreter-retry-mobile.png',fullPage:true});await p.locator('.it-outbox button').click();await p.waitForFunction(()=>!document.querySelector('.it-outbox'));assert.equal(attempts[prior].requestId,attempts[prior+1].requestId);assert.deepEqual(attempts.slice(prior).map(x=>x.text),['失败后保留','失败后保留','下一句']);
 // Safari-shaped fixture: Chinese remains interim until native stop requests finalization.
 await p.evaluate(()=>{window.autoFinalize=true;});
 const chineseStart=attempts.length;
 for(let i=0;i<10;i++){
  await p.waitForFunction(()=>{const r=voiceInstances.at(-1);return !!r.onresult&&!r.stopped;});
  const text='我要去明洞'+i;
  await p.evaluate(text=>{const r=voiceInstances.at(-1);r.pendingText=text;r.onresult({resultIndex:0,results:[Object.assign([{transcript:text}],{isFinal:false})]});},text);
  await p.getByText(text+'。',{exact:true}).waitFor();
 }
 assert.deepEqual(attempts.slice(chineseStart).map(x=>x.text),Array.from({length:10},(_,i)=>'我要去明洞'+i+'。'));
 await p.waitForFunction(()=>{const r=voiceInstances.at(-1);return !!r.onresult&&!r.stopped;});
 // Explicit microphone OFF also prevents restarts after an ordinary onend.
 await p.locator('.it-voice.listening').click();const count=await p.evaluate(()=>voiceInstances.length);await p.evaluate(()=>voiceInstances.at(-1).onend());await p.waitForTimeout(450);assert.equal(await p.evaluate(()=>voiceInstances.length),count);
 assert.deepEqual(errors,[]);await p.screenshot({path:'work/continuous-interpreter-mobile.png',fullPage:true});console.log('PASS: Japanese/Chinese interim; 10+ utterances; duplicate finals; ordered sends during translation; deferred language switch; same-ID retry; manual input; TTS pause/resume; stale callbacks; explicit OFF. Mock recognition and API, not physical Safari.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
