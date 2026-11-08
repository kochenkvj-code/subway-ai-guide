const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 let responseText='',finishReason='STOP',aiCalls=0;const generations=[],routeCalls=[],errors=[];
 const context=vm.createContext({Response,Request,URL,URLSearchParams,AbortSignal,Date,Intl,Map,Set,RegExp,String,Object,Array,console,process:{env:{GCP_PROJECT_ID:'fixture',GCP_PROJECT_NUMBER:'123',GCP_SERVICE_ACCOUNT_EMAIL:'fixture',GCP_WORKLOAD_IDENTITY_POOL_ID:'fixture',GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID:'fixture'}},fetch:async(url,options)=>{
  assert.ok(String(url).startsWith('https://aiplatform.googleapis.com/'));aiCalls++;generations.push(JSON.parse(options.body));
  return Response.json({candidates:[{finishReason,content:{parts:[{text:responseText}]},groundingMetadata:{webSearchQueries:['fixture'],groundingChunks:[{web:{uri:'https://example.org/source',title:'Fixture source'}}]}}]});
 }});
 const cache=new Map();
 async function load(file){
  if(cache.has(file))return cache.get(file);
  const promise=(async()=>{
   if(file==='@vercel/oidc')return new vm.SyntheticModule(['getVercelOidcToken'],function(){this.setExport('getVercelOidcToken',async()=>'fixture');},{context});
   if(file==='google-auth-library')return new vm.SyntheticModule(['ExternalAccountClient'],function(){this.setExport('ExternalAccountClient',{fromJSON:()=>({getAccessToken:async()=>({token:'fixture'})})});},{context});
   const text=await fs.readFile(file,'utf8');
   if(file.endsWith('.json'))return new vm.SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(text));},{context});
   const mod=new vm.SourceTextModule(text,{context,identifier:file});
   await mod.link(name=>load(name.startsWith('.')?path.resolve(path.dirname(file),name.endsWith('.json')?name:name+'.js'):name));return mod;
  })();cache.set(file,promise);return promise;
 }
 const api=await load(path.resolve('app/api/v2/route-place-test/route.js'));await api.evaluate();
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3083'],{stdio:['ignore','pipe','pipe']});let output='',browser;child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 try{
  for(let i=0;i<100&&!output.includes('Ready');i++)await wait(100);assert.ok(output.includes('Ready'),output);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/api/**',async r=>{
   const url=new URL(r.request().url());
   if(url.pathname==='/api/v2/route-place-test'){
    const response=await api.namespace.POST(new Request(url,{method:'POST',headers:{'Content-Type':'application/json',origin:url.origin},body:r.request().postData()}));
    return r.fulfill({status:response.status,json:await response.json()});
   }
   if(url.pathname==='/api/subway-route'){
    routeCalls.push(Object.fromEntries(url.searchParams));
    return r.fulfill({json:{ok:true,route:{originCode:'0154',origin:'종로5가',destination:'을지로입구',totalSeconds:600,totalMeters:2000,fareWon:1550,transferCount:1,itinerary:[{type:'ride',line:'2호선',from:'을지로3가',to:'을지로입구',stations:['을지로3가','을지로입구']}],allStations:['을지로3가','을지로입구']}}});
   }
   return r.fulfill({status:200,json:{ok:true,groups:[],positions:[],count:0}});
  });
  const fixtures=[['ko','롯데호텔 서울','을지로입구','을지로입구역에서 하차하세요.'],['en','Lotte Hotel Seoul','Euljiro 1(il)-ga','Alight at Euljiro 1(il)-ga.'],['ja','ロッテホテルソウル','ウルチロイック駅','乙支路入口駅で下車してください。'],['zh','首尔乐天酒店','乙支路入口站','请在乙支路入口站下车。']];
  for(const [lang,query,stop,answer]of fixtures){
   responseText=answer+'\n\n<route_station> '+stop+' </route_station>\n\n<menu_recommendation>route</menu_recommendation>\n';finishReason='STOP';
   await p.goto('http://localhost:3083/v2?station=0154&view=route&lang='+lang);
   await p.locator('#rl-destination').fill(query);const before=aiCalls;await p.locator('.rl-submit').click();await p.locator('.rl-route-card').waitFor();
   assert.equal(aiCalls,before+1,'one Gemini call per place search');assert.equal(routeCalls.at(-1).toCode,'0202');assert.equal(routeCalls.at(-1).to,'을지로입구');assert.equal(routeCalls.at(-1).station,'0154');
   assert.equal(await p.locator('.rl-unverified').count(),0);assert.ok((await p.locator('.rl-ai-answer').innerText()).includes(answer));
   assert.ok((await p.locator('.rl-route-station-debug').innerText()).includes(stop));
   assert.equal(generations.at(-1).tools[0].googleSearch.constructor,Object);assert.ok(generations.at(-1).systemInstruction.parts[0].text.includes('EXCEPTION: route_station MUST'));
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  for(const [stop,reason]of [['乙支路입구','unknown_or_ambiguous_station'],['乙支로1(일)가','unknown_or_ambiguous_station']]){
   responseText='请在乙支路入口站下车。\n<route_station>'+stop+'</route_station>\n<menu_recommendation>route</menu_recommendation>';
   const before=routeCalls.length;await p.goto('http://localhost:3083/v2?station=0154&view=route&lang=zh');await p.locator('#rl-destination').fill('首尔乐天酒店');await p.locator('.rl-submit').click();await p.locator('.rl-unverified').waitFor();assert.equal(routeCalls.length,before,'mixed metadata must not initiate an official route');assert.ok((await p.locator('.rl-route-station-debug').innerText()).includes(stop));
  }
  assert.deepEqual(errors,[]);console.log('PASS 4 languages: UI → actual place API handler → mocked Gemini → parser → route request with Korean name/0202; one AI call, raw diagnostics preserved; mixed scripts never trigger routes.');
 }finally{await browser?.close();child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
