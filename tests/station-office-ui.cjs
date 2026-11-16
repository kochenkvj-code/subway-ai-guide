const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs/promises'),assert=require('node:assert/strict');
(async()=>{
 const {loadModule}=await import('./station-menu-loader.mjs');
 const rows=JSON.parse(await fs.readFile('tests/fixtures/station-offices.json'));
 const master=JSON.parse(await fs.readFile('app/data/seoulMetroStationMaster.json'));
 const {GET}=await loadModule('app/api/v2/station-office/route.js',{process:{env:{SEOUL_METRO_STATION_OFFICE_API_KEY:'fixture'}},fetch:async url=>{const page=Number(new URL(url).searchParams.get('pageNo'));return Response.json({response:{header:{resultCode:'00'},body:{totalCount:rows.length,items:{item:rows.slice((page-1)*100,page*100)}}}});}});
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3099']);let output='',browser;server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
 try{
  for(let i=0;i<100&&!output.includes('Ready');i++)await new Promise(r=>setTimeout(r,100));assert.ok(output.includes('Ready'),output);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[],checks=[];p.on('pageerror',e=>errors.push(e.message));
  let fail=false,officeCalls=0,held=null,hold=true;
  await p.route('**/api/**',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/api/v2/station-office'){
    officeCalls++;if(hold)await new Promise(resolve=>{held=resolve;});
    if(fail)return route.fulfill({status:503,json:{ok:false,error:'OFFICE_UNAVAILABLE'}});
    const response=await GET({url:u.href});return route.fulfill({status:response.status,json:await response.json()});
   }
   if(u.pathname==='/api/v2/facilities')return route.fulfill({json:{ok:true,stationCode:u.searchParams.get('stationCode'),categories:[{id:'toilet',items:[{dtlPstn:'B1',oprtngSitu:'M'}]}]}});
   return route.fulfill({json:{ok:true,count:0}});
  });
  await p.goto('http://localhost:3099/?station=0154&view=facility&lang=ko');await p.locator('.sf-record').first().waitFor();assert.ok((await p.locator('.sf-category-head').innerText()).includes('화장실'));assert.equal(await p.locator('.sf-count[role="status"]').count(),1);assert.ok(held);hold=false;held();await p.locator('.sf-contact').waitFor();checks.push('existing facilities render before pending office request completes');
  const names={ko:'고객안전실',en:'Station office',ja:'駅務室',zh:'车站服务室'};
  const shared={ko:'다른 호선과 공용 고객안전실',en:'Shared station office with another line',ja:'他路線と共用の駅務室',zh:'与其他线路共用的车站服务室'};
  for(const lang of ['ko','en','ja','zh'])for(const code of ['0154','0311']){
   await p.goto('http://localhost:3099/?station='+code+'&view=facility&lang='+lang);await p.locator('.sf-contact').waitFor();const section=p.locator('.sf-category').filter({has:p.locator('h3',{hasText:names[lang]})});assert.equal(await section.count(),1);assert.ok((await section.locator('.sf-contact').getAttribute('href')).startsWith('tel:02'));
   assert.equal(new URL(p.url()).searchParams.get('station'),code);assert.ok(!(await section.innerText()).includes(shared[lang]));
   await p.locator('.sf-filter').filter({hasText:names[lang]}).click();assert.equal(await p.locator('.sf-category').count(),1);
   for(const width of [320,390]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
   if(code==='0311'){await fs.mkdir('work/station-office',{recursive:true});await p.screenshot({path:'work/station-office/shared-'+lang+'.png'});}checks.push(lang+': '+code+' office location/phone/filter; source sharing remains internal; 320/390px');
  }
  const beforeAmsa=officeCalls;await p.goto('http://localhost:3099/?station=2810&view=facility&lang=ko');await p.locator('.sf-record').waitFor();assert.equal(await p.locator('.sf-contact').count(),0);assert.equal(officeCalls,beforeAmsa);assert.ok(!(await p.locator('.sf-filter-scroll').innerText()).includes('고객안전실'));checks.push('Amsa History Park is excluded from office requests and office filter; other facilities remain');
  fail=true;await p.goto('http://localhost:3099/?station=0154&view=facility&lang=en');await p.getByText('Station office · Facilities could not be loaded.',{exact:true}).waitFor();assert.equal(await p.locator('.sf-record').count(),1);checks.push('office service failure does not hide other facilities');fail=false;
  const before=officeCalls,nine=master.stations.find(s=>s.line==='9').stationCode;await p.goto('http://localhost:3099/?station='+nine+'&view=facility&lang=en');await p.locator('.sf-record').waitFor();assert.equal(officeCalls,before);checks.push('line 9 makes no office request');
  assert.deepEqual(errors,[]);await fs.writeFile('work/station-office/browser-results.json',JSON.stringify({checks,errors,productionWrites:0},null,2));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
