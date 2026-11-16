const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');

(async()=>{
 const legacy=JSON.parse(await fs.readFile('tests/fixtures/facility-display-before-open.json','utf8')).languages;
 const categories=[
  {id:'toilet',items:[{dtlPstn:'지하1층 지하상가 연결통로앞',stnFlr:'B1',vcntEntrcNo:'8',gateInoutSe:'외부',whlchrAcsPsbltyYn:'Y',rstrmInfo:'일반(남,여) / 교통약자(남,여)'}]},
  {id:'elevator',items:[
   {dtlPstn:'8,9번 출입구 사이',bgngFlr:'B1',endFlr:'1',oprtngSitu:'M'},
   {dtlPstn:'동대문(1) 방면8-3',bgngFlr:'B1',endFlr:'B2',oprtngSitu:'S'},
   {dtlPstn:'종로3가 방면3-2',oprtngSitu:'M'},
   {dtlPstn:'장자호수공원 방면6-1',oprtngSitu:'M'},
   {dtlPstn:'삭제된 설비',oprtngSitu:'D'}
  ]},
  {id:'escalator',items:Array.from({length:5},(_,i)=>({dtlPstn:i===4?'미등록장소 3번 출입구 옆':'동대문 방면'+(i+1)+'-1',oprtngSitu:'M'}))},
  {id:'locker',items:[{lckrNm:'종로5가(1~19)',lckrDtlLocNm:'대합실 중앙',lckrCnt:19,wkdayOperBgngTm:'050000',wkdayOperEndTm:'010000',custCntrTelno:'18771265'}]},
  {id:'nursing',items:[{dtlPstn:'고객안전실 내부',stnFlr:'B1',nrsrmUtztnMth:'1인가족 단독사용',stllAcsYn:'Y',utztnHr:'영업시간내'}]},
  {id:'atm',items:[{dtlPstn:'대합실 중앙',stnFlr:'B1',fnstNm:'효성티앤에스',utztnHr:'05:00~24:00'}]}
 ];
 const office={id:'customerOffice',items:[{dtlPstn:'B1층 대합실',operInstTelno:'0261101291',utztnPsbltyHr:'05:00~00:00'}]};
 const names={ko:['화장실','엘리베이터','고객안전실','물품보관함','에스컬레이터','수유실','ATM'],en:['Restroom','Elevator','Station office','Lockers','Escalator','Nursing room','ATM'],ja:['トイレ','エレベーター','駅務室','ロッカー','エスカレーター','授乳室','ATM'],zh:['洗手间','电梯','车站服务室','储物柜','自动扶梯','母婴室','ATM']};
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3106']);
 let output='',browser,fail=false,partial=false,empty=false,officeFail=false;
 server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
 try{
  for(let i=0;i<100&&!output.includes('Ready');i++)await new Promise(r=>setTimeout(r,100));assert.ok(output.includes('Ready'),output);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url()),code=url.searchParams.get('stationCode')||'0154';
   if(url.pathname==='/api/v2/facilities')return route.fulfill({status:fail?503:200,json:fail?{ok:false}:{ok:true,stationCode:code,categories:empty?[]:categories,partial}});
   if(url.pathname==='/api/v2/station-office')return route.fulfill({status:officeFail?503:200,json:officeFail?{ok:false}:{ok:true,stationCode:code,status:empty?'missing':'direct',category:empty?null:office}});
   return route.fulfill({json:{ok:true,count:0,positions:[],groups:[]}});
  });
  async function allVisible(){
   const scope=page.locator('.v2-facility-scope');
   await scope.locator('.sf-contact[href="tel:0261101291"]').waitFor();
   assert.equal(await scope.locator('.sf-category').count(),7);
   assert.equal(await scope.locator('.sf-record').count(),14,'all records, including the fourth elevator and fifth escalator, must be present');
   assert.equal(await scope.locator('details,[aria-expanded],.sf-more').count(),0);
   assert.equal(await scope.locator('.sf-records').evaluateAll(xs=>xs.some(x=>getComputedStyle(x).maxHeight!=='none')),false);
   return scope;
  }
  for(const lang of ['ko','en','ja','zh']){
   await page.goto('http://localhost:3106/?station=0154&view=facility&lang='+lang);
   const scope=await allVisible();
   for(const category of legacy[lang]){
    const section=scope.locator('.sf-category').filter({has:page.getByRole('heading',{name:category.label,exact:true})});
    assert.equal(await section.locator('.sf-record').count(),category.records.length);
    for(const [index,fields]of category.records.entries()){
     const record=section.locator('.sf-record').nth(index),text=await record.innerText();
     for(const [field,value]of Object.entries(fields)){
      const visibleText=field==='name'&&value===category.label?await section.innerText():text;
      assert.ok(visibleText.includes(value),lang+' '+category.id+' '+index+' lost legacy '+field+': '+value);
     }
    }
   }
   assert.equal(await scope.locator('.sf-contact[href="tel:0261101291"]').count(),1);
   assert.equal(await scope.locator('.sf-contact[href="tel:18771265"]').count(),1);
   assert.ok((await scope.innerText()).includes('02-6110-1291'));
   assert.ok((await scope.innerText()).includes('05:00'));
   const toilet=scope.locator('.sf-category').filter({has:page.getByRole('heading',{name:names[lang][0],exact:true})});
   assert.equal(await toilet.locator('.sf-tag-accessible').count(),1);
   assert.equal(await toilet.locator('.sf-tag-restroom').count(),1);
   assert.equal(await scope.locator('.sf-contact span').first().evaluate(el=>getComputedStyle(el).fontSize),await scope.locator('.sf-tag').first().evaluate(el=>getComputedStyle(el).fontSize),'phone text matches information chips');
   if(lang!=='ko')assert.ok((await scope.innerText()).includes(({en:'Korean source',ja:'韓国語原文',zh:'韩文原文'})[lang]+': 미등록장소 3번 출입구 옆'));
   for(const width of [320,390,768]){
    await page.setViewportSize({width,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,lang+' '+width+' horizontal overflow');
    const clipped=await scope.locator('.sf-category,.sf-tag,.sf-filter,.sf-contact').evaluateAll(xs=>xs.filter(x=>x.scrollWidth>x.clientWidth+1).map(x=>x.textContent));
    assert.deepEqual(clipped,[],lang+' '+width+' clipped content');
   }
   for(const name of names[lang]){const filter=scope.locator('.sf-filter').filter({hasText:name});await filter.click();assert.equal(await scope.locator('.sf-category').count(),1);await filter.click()}
   assert.equal(await scope.locator('.sf-record').count(),14);
   await page.setViewportSize({width:390,height:844});
   await scope.locator('input').fill('6-1');assert.equal(await scope.locator('.sf-record').count(),1);
   assert.ok((await scope.locator('.sf-record').innerText()).includes(names[lang][1]+' 04'),'a single search result keeps its original elevator number');
   await scope.locator('.sf-clear').click();assert.equal(await scope.locator('.sf-record').count(),14);
   await scope.locator('input').fill('1~19');assert.equal(await scope.locator('.sf-record').count(),1);
   assert.ok((await scope.locator('.sf-record-name').innerText()).includes('1~19'),'a single locker keeps its range');
   await scope.locator('.sf-clear').click();
   await scope.locator('input').fill('no-such-facility');assert.equal(await scope.locator('.sf-record').count(),0);
   await scope.locator('.sf-clear').click();
   await scope.evaluate(el=>el.scrollTop=0);
   await fs.mkdir('work/facility-redesign/production-ui',{recursive:true});
   await page.screenshot({path:'work/facility-redesign/production-ui/'+lang+'.png'});
   await scope.locator('.sf-record').last().scrollIntoViewIfNeeded();assert.ok(await scope.locator('.sf-footer').isVisible());
   checks.push(lang+': all pre-redesign information retained across 14 records; facility and locker numbers remain after search; toilet details in a chip; phone matches chip text; 7 filters, 320/390/768px');
  }
  await page.goto('http://localhost:3106/v2?station=0154&view=facility&lang=en');await allVisible();checks.push('existing /v2 entry uses the same complete facility guide');
  await page.goto('http://localhost:3106/v2/facilities-demo');await allVisible();assert.ok(await page.locator('.sf-hero').isVisible());checks.push('standalone facility page');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://localhost:3106/wide?station=0154');await page.locator('.wide-menu-grid').waitFor();
  await page.locator('.wide-menu-grid button').filter({hasText:'시설안내'}).click();await allVisible();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push('wide view shares the same cards without overflow');
  await page.setViewportSize({width:390,height:844});
  partial=true;await page.goto('http://localhost:3106/?station=0154&view=facility&lang=ko');await allVisible();assert.ok((await page.locator('.sf-alert').innerText()).includes('일부'));partial=false;
  fail=true;await page.goto('http://localhost:3106/?station=0154&view=facility&lang=en');await page.locator('.sf-contact').waitFor();assert.equal(await page.locator('.sf-record').count(),1);fail=false;
  officeFail=true;await page.goto('http://localhost:3106/?station=0154&view=facility&lang=en');await page.locator('.sf-record').first().waitFor();assert.equal(await page.locator('.sf-record').count(),13);officeFail=false;
  empty=true;await page.goto('http://localhost:3106/?station=0154&view=facility&lang=en');await page.locator('.sf-empty').waitFor();assert.equal(await page.locator('.sf-record').count(),0);
  checks.push('partial, office-only, facilities-only and empty responses handled');
  assert.deepEqual(errors,[]);
  await fs.writeFile('work/facility-redesign/production-ui/results.json',JSON.stringify({checks,errors,productionAnalyticsWrites:0},null,2));
  console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
