const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const master=JSON.parse(fs.readFileSync('app/data/seoulMetroStationMaster.json')).stations;
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const ctx=await browser.newContext();const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api/train-arrivals*',r=>r.fulfill({json:{ok:false}}));await p.route('**/api/stats/event*',r=>r.fulfill({json:{ok:true}}));
 let current,tt=0,fc=0,counts=0;
 await p.route('**/api/v2/timetable?*',r=>{const q=new URL(r.request().url()).searchParams;assert.equal(q.get('stationCode'),current.stationCode);tt++;return r.fulfill({json:{ok:true,stationCode:current.stationCode,rows:[{time:'23:55',number:'6001',destination:'봉화산',origin:current.names.ko,express:false}],total:1}});});
 await p.route('**/api/v2/facilities?*',r=>{assert.equal(new URL(r.request().url()).searchParams.get('stationCode'),current.stationCode);fc++;return r.fulfill({json:{ok:true,stationCode:current.stationCode,categories:[{id:'elevator',count:1,items:[{fcltNm:current.names.ko+' 엘리베이터',dtlPstn:'B2 고객안전실 앞',stnCd:current.stationCode,lineNm:current.line+'호선'}]}]}});});
 await p.route('**/api/stats/feedback/count?*',r=>{assert.equal(new URL(r.request().url()).searchParams.get('station'),current.stationCode);counts++;return r.fulfill({json:{count:3}});});
 for(const code of ['0154','0152','0159','2637','0222','0150']){current=master.find(s=>s.stationCode===code);for(const [lang,width]of [['ko',320],['en',390],['ja',320],['zh',390]]){
 await p.setViewportSize({width,height:844});
 for(const view of ['timetable','facility','feedback']){
 await p.goto('http://localhost:3020/v2?station='+code+'&lang='+lang+'&view='+view);
 const root=p.locator(view==='timetable'?'.tt-root':view==='facility'?'.v2-facility-scope':'.sf-pane');await root.waitFor();
 if(view==='timetable'){await p.locator('.tt-train').first().waitFor();assert.equal(await p.locator('.tt-current button').count(),0);assert.ok((await p.locator('.tt-current').innerText()).includes(current.names[lang]));}
 if(view==='facility'){await p.locator('.tile').first().waitFor();assert.ok((await p.locator('.v2-facility-scope .station').innerText()).includes(current.names[lang]));await p.locator('.tile').first().click();await p.locator('.record').first().click();assert.ok((await p.locator('.primary').innerText()).includes('B2 고객안전실 앞'));}
 if(view==='feedback')assert.ok((await p.locator('.sf-station').innerText()).includes(current.names[lang]));
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),[code,lang,view,'horizontal overflow'].join(' '));
 }
 }}
 await p.screenshot({path:'work/station-menus-mobile.png',fullPage:true});assert.deepEqual(errors,[]);console.log({stations:6,languages:4,views:3,tt,fc,counts,errors});
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
