const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const origins={'0152':['종각','1호선'],'2637':['동묘앞','6호선'],'0319':['종로3가','3호선'],'0150':['서울역','1호선'],'0154':['종로5가','1호선']};
 const upstream=[],requests=[],errors=[];
 const context=vm.createContext({Response,AbortSignal,URL,URLSearchParams,Date,Intl,Map,Set,process:{env:{SEOUL_METRO_API_KEY:'fixture'}},fetch:async value=>{
  const q=new URL(value).searchParams;upstream.push(Object.fromEntries(q));
  const code=q.get('stationValueType')==='code'?q.get('dptreStn'):'0154', [name,line]=origins[code];
  return Response.json({header:{resultCode:'00'},body:{totalReqHr:1200,totalDstc:12000,totalCardCrg:1550,trsitNmtm:0,paths:[{dptreStn:{stnNm:name,stnCd:code,lineNm:line},arvlStn:{stnNm:'강남',stnCd:'0222',lineNm:line},trsitYn:'N',reqHr:1200}]}});
 }});
 const cache=new Map();async function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const text=await fs.readFile(file,'utf8'),mod=file.endsWith('.json')?new vm.SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(text));},{context}):new vm.SourceTextModule(text,{context});cache.set(file,mod);await mod.link(name=>load(path.resolve(path.dirname(file),name.endsWith('.json')?name:name+'.js')));return mod;}
 const api=await load('app/api/subway-route/route.js');await api.evaluate();
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3035'],{stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);let browser;
 try{
  for(let i=0;i<100&&!output.includes('Ready');i++)await wait(100);assert.ok(output.includes('Ready'),output);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/api/**',async r=>{
   const url=r.request().url();requests.push(url);
   if(url.includes('/api/subway-route?')){const response=await api.namespace.GET({url});return r.fulfill({status:response.status,json:await response.json()});}
   return r.fulfill({status:url.includes('/stats/')?204:503,...(url.includes('/stats/')?{}:{json:{error:'fixture'}})});
  });
  for(const code of ['0152','2637','0319','0150']){
   await p.goto('http://localhost:3035/v2?station='+code+'&view=route');await p.locator('.srg-card').waitFor();
   assert.equal(await p.locator('.se-blocked').count(),0);assert.ok((await p.locator('.srg-origin').innerText()).includes(origins[code][0]));
   await p.locator('#srg-destination-input').fill('강남');await p.locator('.srg-suggestion').first().click();await p.locator('.srg-submit').click();await p.locator('.srg-result').waitFor();
   assert.equal(upstream.at(-1).dptreStn,code);assert.equal(upstream.at(-1).arvlStn,'0222');assert.equal(new URL(requests.findLast(u=>u.includes('/subway-route?'))).searchParams.get('station'),code);
   const calls=upstream.length;await p.goBack();await p.waitForFunction(()=>!document.querySelector('.srg-result'));await p.goForward();await p.locator('.srg-result').waitFor();assert.equal(upstream.length,calls);
   for(const [width,height]of [[320,640],[390,844]]){
    await p.setViewportSize({width,height});for(const lang of ['ko','en','ja','zh']){await p.locator('.v2-view-header .v2-language select').selectOption(lang);assert.equal(new URL(p.url()).searchParams.get('station'),code);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(upstream.length,calls);assert.equal(await p.locator('.srg-result').count(),1);}
   }
   await p.locator('.v2-view-header .v2-language select').selectOption('ko');await p.locator('.v2-view-header > button').filter({hasText:'홈'}).click();await p.locator('.v2-grid button').filter({hasText:'길찾기'}).click();await p.waitForFunction(()=>document.querySelector('.srg-card')&&!document.querySelector('.srg-result'));assert.ok((await p.locator('.srg-origin').innerText()).includes(origins[code][0]));
  }
  assert.equal(requests.some(u=>u.includes('/api/google-search')),false);
  await p.goto('http://localhost:3035/');await p.locator('.sag-actions button').filter({hasText:'길찾기'}).click();await p.locator('.srg-card').waitFor();assert.ok((await p.locator('.srg-origin').innerText()).includes('종로5가'));await p.locator('#srg-destination-input').fill('강남');await p.locator('.srg-suggestion').first().click();await p.locator('.srg-submit').click();await p.locator('.srg-result').waitFor();assert.equal(new URL(requests.findLast(u=>u.includes('/subway-route?'))).searchParams.has('station'),false);
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS browser → route API → provider fixture: four station codes/lines, languages, mobile widths, back/forward without refetch, home reset, V1 origin unchanged and no AI calls');
 }finally{await browser?.close();child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
