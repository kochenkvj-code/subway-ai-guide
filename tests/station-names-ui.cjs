const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await fs.mkdir('work/station-names-799',{recursive:true});
 const official=JSON.parse(await fs.readFile('app/data/seoulMetroOfficialStations.json'));
 const label=(ko,lang)=>official.find(s=>s.ko===ko)[lang].normalize('NFC').trim().replace(/\s+/g,' ');
 const requests=[],upstream=[],errors=[],checks=[];
 const apiContext=vm.createContext({Response,AbortSignal,URL,URLSearchParams,Date,Intl,Map,Set,process:{env:{SEOUL_METRO_API_KEY:'fixture'}},fetch:async value=>{
  const q=new URL(value).searchParams;upstream.push(Object.fromEntries(q));
  const from=official.find(s=>s.code===q.get('dptreStn')),to=official.find(s=>s.code===q.get('arvlStn'));
  return Response.json({header:{resultCode:'00'},body:{totalReqHr:900,totalDstc:9000,totalCardCrg:1550,trsitNmtm:0,paths:[{dptreStn:{stnNm:from.ko,stnCd:from.code,lineNm:from.line},arvlStn:{stnNm:to.ko,stnCd:to.code,lineNm:to.line},reqHr:900,trsitYn:'N',tmnlStnNm:to.ko}]}});
 }});
 const modules=new Map();async function load(file){file=path.resolve(file);if(modules.has(file))return modules.get(file);const text=await fs.readFile(file,'utf8');const m=file.endsWith('.json')?new vm.SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(text));},{context:apiContext}):new vm.SourceTextModule(text,{context:apiContext});modules.set(file,m);await m.link(name=>load(path.resolve(path.dirname(file),/\.(json|m?js)$/.test(name)?name:name+'.js')));return m;}
 const routeApi=await load('app/api/subway-route/route.js');await routeApi.evaluate();
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3095']);let output='',browser;server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
 try{
  for(let i=0;i<100&&!output.includes('Ready');i++)await wait(100);assert.ok(output.includes('Ready'),output);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const p=await browser.newPage({viewport:{width:390,height:844},locale:'en-US'});p.on('pageerror',e=>errors.push(e.message));
  let rawDestination='별내';
  await p.route('**/api/**',async r=>{
   const u=new URL(r.request().url());requests.push(u.pathname+u.search);
   if(u.pathname==='/api/subway-route'){const result=await routeApi.namespace.GET({url:u.href});return r.fulfill({status:result.status,json:await result.json()});}
   if(u.pathname==='/api/arrival-test/position'){
    const line=u.searchParams.get('line'),station=line==='8'?'암사':line==='6'?'응암':'종로5가';
    return r.fulfill({json:{line,raw:{realtimePositionList:[{subwayId:'100'+line,statnNm:station,trainNo:'8090',statnTnm:line==='8'?rawDestination:'응암순환(상선)',updnLine:'0',trainSttus:'1',recptnDt:new Date(Date.now()+9*3600000).toISOString().slice(0,19).replace('T',' ')}]}}});
   }
   if(u.pathname==='/api/v2/timetable')return r.fulfill({json:{ok:true,stationCode:u.searchParams.get('stationCode'),total:3,rows:[{time:'05:30',number:'8100',destination:rawDestination},{time:'23:50',number:'8102',destination:rawDestination},{time:'24:00',number:'8104',destination:rawDestination}]}});
   if(u.pathname==='/api/v2/facilities')return r.fulfill({json:{ok:true,stationCode:u.searchParams.get('stationCode'),categories:[{id:'elevator',items:[{elvtrNm:'승강기01',dtlPstn:'장자호수공원 방면6-1',bgngFlr:'B1',endFlr:'B2',oprtngSitu:'M'},{elvtrNm:'승강기02',dtlPstn:'암사 방면3-4',oprtngSitu:'M'}]},{id:'escalator',items:[{dtlPstn:'장자호수공원 방면2-4',oprtngSitu:'M'}]}]}});
   if(u.pathname==='/api/v2/train-lost/position')return r.fulfill({json:{ok:true,positions:[{trainNo:'8090',line:'8',station:'구리',destination:rawDestination,direction:'0',status:'1',receivedAt:new Date().toISOString()}],fetchedAt:new Date().toISOString()}});
   if(u.pathname==='/api/v2/train-lost/arrival')return r.fulfill({json:{ok:true,evidence:[]}});
   return r.fulfill({json:{ok:true,count:0}});
  });
  async function goto(view,lang='en'){await p.goto('http://localhost:3095/?station=2811&lang='+lang+(view?'&view='+view:''));}
  async function noOverflow(){for(const width of [320,390]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}}
  for(const lang of ['ko','en','ja','zh']){
   await goto('',lang);await p.locator('.v2-arrival-available').first().waitFor();assert.ok((await p.locator('.v2-position-trains').innerText()).includes(label('별내',lang)));await noOverflow();
   await p.locator('.v2-position-train').first().click();await p.locator('.v2-position-detail-card').first().waitFor();assert.ok((await p.locator('.v2-position-detail-grid').innerText()).includes(label('별내',lang)));await noOverflow();
   await p.locator('.v2-position-raw summary').first().click();assert.ok((await p.locator('.v2-position-raw').first().innerText()).includes('별내'),'API JSON must retain raw Korean destination');
   await goto('timetable',lang);await p.locator('.tt2-train-row').first().waitFor();assert.ok((await p.locator('.tt2-train-dest').first().innerText()).includes(label('별내',lang)));assert.ok((await p.locator('.tt2-first-panel').innerText()).includes(label('별내',lang)));await p.locator('.tt2-full-cta').click();assert.ok((await p.locator('.tt2-train-dest').first().innerText()).includes(label('별내',lang)));await noOverflow();
   await goto('facility',lang);await p.locator('.sf-location-text').first().waitFor();const facilities=await p.locator('.sf-location-text').allInnerTexts();for(const code of ['6-1','2-4'])assert.ok(facilities.some(v=>v.includes(label('장자호수공원',lang))&&v.includes(code)));if(lang!=='ko')assert.ok(!facilities.join('').includes('Korean source'));await noOverflow();
   await goto('lost',lang);await p.locator('#tl-item').fill('black bag');await p.locator('.tl-direction-options button,.tl-directions button').filter({hasText:label('암사역사공원',lang)}).click();await p.locator('.tl-cars button').first().click();await p.locator('.tl-door-options button').first().click();await p.locator('.tl-search-footer button').click();await p.locator('.tl-candidate-chip').waitFor();assert.ok((await p.locator('.tl-candidate-destination').innerText()).includes(label('별내',lang)));assert.ok((await p.locator('.tl-live-map-main').innerText()).includes(label('구리',lang)));await noOverflow();await p.screenshot({path:'work/station-names-799/lost-'+lang+'.png'});
   await p.locator('.tl-next-panel .tl-primary').click();await p.locator('.tl-message').waitFor();assert.ok((await p.locator('.tl-message').innerText()).includes('8090'));
   await goto('route',lang);await p.locator('#rl-destination').fill('ㅂㄴ');await p.locator('.rl-match-list button').filter({hasText:label('별내',lang)}).first().click();await p.locator('.rl-submit').click();await p.locator('.rl-route-card').waitFor();assert.ok((await p.locator('.rl-route-head').innerText()).includes(label('별내',lang)));assert.equal(upstream.at(-1).dptreStn,'2811');assert.equal(upstream.at(-1).arvlStn,'2805');await noOverflow();
   checks.push(lang+': home/live, timetable upcoming/full/first-last, facility locations, lost-item candidate/map/handoff, route code 2811→2805, 320/390px');
  }
  rawDestination='임시운행행선지';await goto('live','en');await p.locator('.v2-position-detail-card').first().waitFor();assert.ok((await p.locator('.v2-position-detail-grid').innerText()).includes(rawDestination));
  await goto('timetable','en');await p.locator('.tt2-train-row').first().waitFor();assert.ok((await p.locator('.tt2-train-dest').first().innerText()).includes(rawDestination));checks.push('unknown nonempty API destination retained in live/timetable');
  rawDestination='별내';await goto('','en');await p.locator('.se-station').click();await p.locator('.se-line-filters button').first().click();assert.equal(await p.locator('.se-options button').count(),289);await p.locator('.se-filters input').fill('종로3가');assert.deepEqual(await p.locator('.se-options button').evaluateAll(xs=>xs.map(x=>x.dataset.stationCode)),['0153','0319','2535']);checks.push('base-station picker retains 289 line-specific records; Jongno 3-ga 1/3/5 unchanged');
  await p.setViewportSize({width:1440,height:1000});await p.goto('http://localhost:3095/wide?station=2811');await p.locator('.wide-menu-grid').waitFor();await p.locator('.wide-language-grid button').filter({hasText:'English'}).click();await p.locator('.wide-menu-grid button').filter({hasText:'Facilities'}).click();await p.locator('.sf-location-text').first().waitFor();assert.ok((await p.locator('.sf-location-text').first().innerText()).includes(label('장자호수공원','en')));checks.push('wide view reused facility translation verified');
  assert.deepEqual(errors,[]);assert.equal(requests.some(u=>u.includes('google-search')||u.includes('route-place-test')),false);
  const report={checks,errors,routeProviderRequests:upstream,productionWrites:0,note:'Local production build. External provider data mocked; route requests execute the actual API handler. No Gemini calls or SMS sends.'};await fs.writeFile('work/station-names-799/browser-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
