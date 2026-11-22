const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://localhost:3191';
(async()=>{
 const {loadAppModule}=await import('./helpers/load-app-module.mjs');const model=await loadAppModule('app/lib/timetable-lab-model.js'),adapter=await loadAppModule('app/lib/operation-timetable-model.js');
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const errors=[],queries=[];let fail=false,empty=false,crowdFail=false;
 const makeRows=code=>{const row=(dir,dest,id,arrival='15:00:00')=>({'고유번호':String(id),'호선':model.timetableStation(code).line,'역사코드':code,'역사명':model.timetableStation(code).names.ko,'주중주말':'DAY','방향':dir,'급행여부':id===2?'1':'0','열차코드':'T'+id,'열차도착시간':arrival,'열차출발시간':id===1?'15:03:00':'15:05:30','출발역':code==='2611'?'응암':'인천','도착역':dest});return code==='0211'?[row('IN','성수',1),row('OUT','성수',2),row('DOWN','신설동',3,'')]:code==='0200'?[row('DOWN','신도림',1,'')]:[row('UP','의정부',1),row('DOWN','인천',2)];};
 try{
  const anonymous=await browser.newContext();const response=await anonymous.request.get(base+'/api/v2/operation-timetable-test?stationCode=0154');assert.equal(response.status(),403);assert.equal((await anonymous.request.get(base+'/v2/operation-timetable-test')).status(),404);await anonymous.close();
  for(const lang of ['ko','en','ja','zh']){
   const c=await browser.newContext({viewport:{width:390,height:844},locale:lang==='zh'?'zh-CN':lang});await c.addInitScript(()=>localStorage.setItem('subway_ai_guide_analytics_excluded','1'));
   assert.equal((await c.request.post(base+'/api/stats/auth',{data:{password:'fixture-only'}})).status(),200);
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.route('**/api/**',async r=>{const u=new URL(r.request().url());
    if(u.pathname==='/api/v2/operation-timetable-test'){
     const code=u.searchParams.get('stationCode'),day=u.searchParams.get('day');queries.push({code,day});if(fail)return r.fulfill({status:503,json:{ok:false,error:'fixture'}});
     return r.fulfill({json:{ok:true,stationCode:code,line:model.timetableStation(code).line,day,businessDate:model.serviceClock().businessDate,...adapter.compileOperationTimetable(empty?[]:makeRows(code),model.timetableStation(code)),source:{dataset:'15098251',revision:'fixture',cacheState:'fresh'}}});
    }
    if(u.pathname==='/api/v2/timetable-lab/crowding'){
     if(crowdFail)return r.fulfill({status:503,json:{error:'fixture'}});const code=u.searchParams.get('station'),s=model.timetableStation(code);return r.fulfill({json:{stationCode:code,data:{[s.line+':'+code]:'0'.repeat(84)+'1'.repeat(84)+'2'.repeat(84)},hours:[5,25],thresholds:[50,80,110],sourceDate:null}});
    }
    return r.fulfill({status:503,json:{error:'fixture'}});
   });
   await p.goto(base+'/v2/operation-timetable-test?station=0154&lang='+lang);await p.locator('.tl-table').waitFor();
   for(const [index,day]of ['평일','주말','공휴일'].entries()){
    const queryCount=queries.length;await p.locator('.tl-days button').nth(index).click();await p.locator('.tl-table').waitFor();await p.locator('.tl-hour-grid button').filter({hasText:/^15$/}).click();await p.locator('.tl-column li[data-crowd-level="'+index+'"]').first().waitFor();assert.equal(await p.locator('.tl-days button').nth(index).getAttribute('aria-pressed'),'true');if(day!==model.defaultDay(model.serviceClock()))assert.equal(await p.locator('.tl-past,.tl-next').count(),0,'other weekdays must not be labelled past/upcoming today');if(queries.length>queryCount)assert.equal(queries.at(-1).day,day);
   }
   const prior=queries.length;await p.locator('.tl-hour-grid button').filter({hasText:/^16$/}).click();await p.locator('.tl-arrow-left').click();assert.equal(queries.length,prior,'hour changes must not fetch');
   for(const width of [320,390,768]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
   if(lang==='ko'){
    await p.setViewportSize({width:390,height:844});
    fail=true;await p.getByRole('button',{name:'다시 조회',exact:true}).click();await p.locator('.tl-state[role="alert"]').waitFor();assert.ok(await p.locator('.tl-crowd-halves').count()>0,'timetable failure retains selected-day statistical colors');await p.screenshot({path:'work/operation-timetable-error-mobile.png'});
    fail=false;empty=true;await p.getByRole('button',{name:'다시 조회',exact:true}).first().click();await p.locator('.tl-state:not([role="alert"])').waitFor();assert.ok(await p.locator('.tl-crowd-halves').count()>0,'zero departures retains statistical colors');
    empty=false;crowdFail=true;await p.getByRole('button',{name:'다시 조회',exact:true}).first().click();await p.locator('.tl-table').waitFor();assert.equal(await p.locator('.tl-crowd-halves').count(),0,'missing statistics must not block timetable');crowdFail=false;
    await p.goto(base+'/v2/operation-timetable-test?station=0211&lang=ko');await p.locator('.tl-table').waitFor();assert.equal(await p.locator('.tl-column').count(),3);await p.locator('.tl-hour-grid button').filter({hasText:/^15$/}).click();await p.screenshot({path:'work/operation-timetable-seongsu-mobile.png'});
    await p.goto(base+'/v2/operation-timetable-test?station=0200&lang=ko');await p.locator('.tl-table').waitFor();assert.equal(await p.locator('.tl-column').count(),1);assert.match(await p.locator('.tl-column h3').innerText(),/신정네거리/);
   }
   await c.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS mock browser: administrator protection; four languages / three widths; independent weekdays/statistics; timetable failure/empty retains statistics; statistics failure retains timetable; branch columns; no hour-navigation refetch. Not a physical Safari test.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
