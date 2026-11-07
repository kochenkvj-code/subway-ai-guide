const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs/promises'),vm=require('node:vm'),assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const master=JSON.parse(await fs.readFile('app/data/seoulMetroStationMaster.json','utf8')).stations;
 const graph=JSON.parse(await fs.readFile('app/data/trainLostGraph.json','utf8')),directions=JSON.parse(await fs.readFile('app/data/trainLostDirection.json','utf8'));
 const m=new vm.SourceTextModule(await fs.readFile('app/lib/train-lost.js','utf8'));await m.link(name=>new vm.SyntheticModule(['default'],function(){this.setExport('default',name.includes('Graph')?graph:directions);}));await m.evaluate();const model=m.namespace;
 let fixture=null;const calls=[],errors=[];
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3036'],{stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);let browser;
 try{
  for(let i=0;i<100&&!log.includes('Ready');i++)await wait(100);assert.ok(log.includes('Ready'),log);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/api/**',async r=>{
   const url=new URL(r.request().url());
   if(url.pathname.startsWith('/api/v2/train-lost/')){
    calls.push(url);const f={...fixture};assert.equal(url.searchParams.get('line'),f.line);
    const at=new Date().toISOString(),direction=model.expectedLiveDirection(f.line,f.name,f.next),path=model.followStops(f.line,f.name,f.next,8).stops,where=path[1]||path[0];
    if(url.pathname.endsWith('/position'))return r.fulfill({json:{ok:true,fetchedAt:at,positions:[{trainNo:'0406',line:f.line,station:where,direction,destination:path.at(-1),express:false,receivedAt:at},{trainNo:'0999',line:f.line,station:where,direction:direction==='0'?'1':'0',express:false,receivedAt:at}]}});
    return r.fulfill({json:{ok:true,evidence:[{trainNo:'0406',line:f.line,station:url.searchParams.get('station'),directionCode:direction,arrivalCode:'99',receivedAt:at,destination:path.at(-1)}]}});
   }
   return r.fulfill({status:url.pathname.includes('/stats/')?204:503,...(url.pathname.includes('/stats/')?{}:{json:{error:'fixture'}})});
  });
  for(const code of ['0152','2637','0319','0150','0409','0432']){
   const s=master.find(x=>x.stationCode===code),name=s.names.ko.replace(/역$/,'');fixture={name,line:s.line,next:''};
   const before=calls.length;await p.goto('http://localhost:3036/v2?station='+code+'&view=lost&line=9');await p.locator('.tf-selected').waitFor();
   assert.ok((await p.locator('.tf-selected').innerText()).includes(s.names.ko));assert.equal(await p.locator('.se-blocked').count(),0);assert.equal(calls.length,before);
   const neighbors=model.stationNeighbors(s.line,name);assert.equal(await p.locator('.tf-direction-options button').count(),neighbors.length);
   fixture.next=neighbors[0];await p.locator('.tf-direction-options button').first().click();await p.locator('.tf-candidate-chips button').first().waitFor();
   assert.ok(!(await p.locator('.tf-candidate-chips').innerText()).includes('0999'));assert.equal(await p.locator('[data-tf-origin="true"]').getAttribute('data-tf-station'),model.trainStationKey(s.line,name));
   assert.equal(await p.locator('.tf-h-stop').nth(1).getAttribute('data-tf-station'),model.trainStationKey(s.line,neighbors[0]));
   await p.locator('.tf-candidate-chips button').first().click();await p.locator('.tf-compact-results').waitFor();assert.ok((await p.locator('.tf-summary-head').innerText()).includes('0406'));
   const previousCalls=calls.length;await p.locator('.tf-quick-times button').first().click();await p.waitForFunction(()=>!document.querySelector('.tf-compact-results'));await p.waitForTimeout(450);assert.ok(calls.length>previousCalls);
   if(neighbors.length>1){fixture.next=neighbors[1];await p.locator('.tf-direction-options button').nth(1).click();await p.waitForFunction(()=>document.querySelectorAll('.tf-h-stop').length>1);await p.waitForTimeout(450);assert.equal(await p.locator('.tf-h-stop').nth(1).getAttribute('data-tf-station'),model.trainStationKey(s.line,neighbors[1]));}
   for(const [width,height]of [[320,640],[390,844]]){await p.setViewportSize({width,height});for(const lang of ['ko','en','ja','zh']){await p.locator('.v2-view-header .v2-language select').selectOption(lang);assert.ok((await p.locator('.tf-selected').innerText()).includes(s.names[lang]));assert.equal(new URL(p.url()).searchParams.get('station'),code);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}}
  }
  // A local alighting-station change does not change the app/QR base station.
  fixture={name:'종각',line:'1',next:''};await p.goto('http://localhost:3036/v2?station=0152&view=lost');await p.locator('.tf-selected button').click();await p.locator('.tf-station-picker input').fill('동묘앞');fixture={name:'동묘앞',line:'6',next:''};await p.locator('.tf-matches button').filter({hasText:'6호선'}).click();assert.ok((await p.locator('.tf-selected').innerText()).includes('6호선'));assert.equal(new URL(p.url()).searchParams.get('station'),'0152');assert.equal(await p.locator('.tf-board').count(),0);
  await p.locator('.v2-view-header > button').filter({hasText:'홈'}).click();await p.locator('.v2-grid button').filter({hasText:'열차 내 유실물'}).click();await p.locator('.tf-selected').waitFor();assert.ok((await p.locator('.tf-selected').innerText()).includes('종각'));
  fixture={name:'암사역사공원',line:'8',next:''};
  const before=calls.length;
  await p.goto('http://localhost:3036/v2?station=2810&view=lost');
  await p.locator('.tf-selected').waitFor();
  assert.ok((await p.locator('.tf-selected').innerText()).includes('암사역사공원'));
  assert.equal(await p.locator('.tf-direction-options button').count(),2);
  assert.equal(calls.length,before);
  fixture.next='장자호수공원';
  await p.locator('.tf-direction-options button').filter({hasText:'장자호수공원'}).click();
  await p.locator('[data-tf-origin="true"]').waitFor();
  assert.equal(await p.locator('.tf-h-stop').nth(1).getAttribute('data-tf-station'),'장자호수공원');
  await p.locator('.tf-candidate-chips button').first().waitFor();
  await p.locator('.tf-selected button').click();
  await p.locator('.tf-station-picker input').fill('구리');
  assert.equal(await p.locator('.tf-matches button').filter({hasText:'8호선'}).count(),0);
  assert.ok((await p.locator('.tf-selected').innerText()).includes('암사역사공원'));
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS six entry stations/lines, direction → correct diagram and candidates, time-change refetch/reset, manual station override, home reset, four languages at 320/390px, URL line override ignored, Amsa History Park has both directions; Byeollae stations are routing-only');
 }finally{await browser?.close();child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
