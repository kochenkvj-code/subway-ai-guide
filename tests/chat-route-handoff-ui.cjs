const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 let responseText='',finishReason='STOP',aiCalls=0,chatRaw='',placeAnswer='';const generations=[],routeCalls=[],errors=[];
 const context=vm.createContext({Buffer,Response,Request,URL,URLSearchParams,AbortSignal,Date,Intl,Map,Set,RegExp,String,Object,Array,console,process:{env:{GCP_PROJECT_ID:'fixture',GCP_PROJECT_NUMBER:'123',GCP_SERVICE_ACCOUNT_EMAIL:'fixture',GCP_WORKLOAD_IDENTITY_POOL_ID:'fixture',GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID:'fixture'}},fetch:async(url,options)=>{
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
   await mod.link(name=>load(name.startsWith('.')?path.resolve(path.dirname(file),/\.(json|js)$/.test(name)?name:name+'.js'):name));return mod;
  })();cache.set(file,promise);return promise;
 }
 const chatApi=await load(path.resolve('app/api/v2/chat/route.js'));await chatApi.evaluate();
 const placeApi=await load(path.resolve('app/api/v2/route-place-test/route.js'));await placeApi.evaluate();
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3088'],{stdio:['ignore','pipe','pipe']});let output='',browser,placeCalls=0;
 child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 try{
  for(let i=0;i<100&&!output.includes('Ready');i++)await wait(100);assert.ok(output.includes('Ready'),output);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/api/**',async r=>{
   const u=new URL(r.request().url());
   if(u.pathname==='/api/v2/chat'||u.pathname==='/api/v2/route-place-test'){
    const isChat=u.pathname==='/api/v2/chat';responseText=isChat?chatRaw:placeAnswer;if(!isChat)placeCalls++;
    const api=isChat?chatApi:placeApi;
    const response=await api.namespace.POST(new Request(u,{method:'POST',headers:{'Content-Type':'application/json',origin:u.origin},body:r.request().postData()}));return r.fulfill({status:response.status,json:await response.json()});
   }
   if(u.pathname==='/api/subway-route'){
    routeCalls.push(Object.fromEntries(u.searchParams));await wait(100);
    return r.fulfill({json:{ok:true,route:{originCode:'0154',origin:'종로5가',destination:u.searchParams.get('to'),totalSeconds:1000,totalMeters:4000,fareWon:1550,transferCount:1,itinerary:[{type:'ride',line:'1호선',from:'종로5가',to:'종로3가'},{type:'transfer',station:'종로3가',fromLine:'1호선',toLine:'3호선'}]}}});
   }
   return r.fulfill({status:u.pathname==='/api/stats/event'?204:200,...(u.pathname==='/api/stats/event'?{}:{json:{ok:true,groups:[],positions:[],count:0}})});
  });
  for(const lang of ['ko','en','ja','zh'])for(const destination of ['둔촌동역','신라호텔']){
   const answer={ko:'목적지까지 가는 안내입니다.',en:'Here is your destination guide.',ja:'目的地への案内です。',zh:'这是目的地指南。'}[lang];
   chatRaw=answer+'\n<route_query>'+destination+'</route_query>\n<menu_recommendation>route</menu_recommendation>';
   placeAnswer=answer+'\n<route_station>동대입구</route_station>\n<menu_recommendation>route</menu_recommendation>';
   await p.goto('http://localhost:3088/?station=0154&view=chat&lang='+lang);
   const input=p.locator('.v2-chat-pane input[aria-label="message"]');await input.fill(destination);await input.press('Enter');
   const button=p.locator('.sag-menu-recommendation');await button.waitFor();assert.ok((await button.innerText()).includes(destination));assert.equal(aiCalls>0,true);
   assert.ok(!(await p.locator('.sag-chat').innerText()).includes('route_query'));
   const beforeRoute=routeCalls.length,beforePlace=placeCalls,beforeAI=aiCalls;
   await button.evaluate(el=>{el.click();el.click();});await p.locator('.rl-route-card').waitFor();
   assert.equal(routeCalls.length,beforeRoute+1);assert.equal(placeCalls,beforePlace+(destination==='신라호텔'?1:0));assert.equal(aiCalls,beforeAI+(destination==='신라호텔'?1:0));
   assert.equal(await p.locator('#rl-destination').inputValue(),destination);assert.equal(routeCalls.at(-1).station,'0154');
   if(destination==='신라호텔')assert.equal(routeCalls.at(-1).to,'동대입구');
   await p.locator('.v2-back-button').click();await input.waitFor();assert.ok((await p.locator('.sag-chat').innerText()).includes(answer));assert.equal(new URL(p.url()).searchParams.get('view'),'chat');
   await button.click();await p.locator('.rl-route-card').waitFor();assert.equal(routeCalls.length,beforeRoute+2,'repeat click starts one fresh search');
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  // Missing destination keeps the generic menu action and never auto-searches.
  chatRaw='안내입니다.\n<menu_recommendation>route</menu_recommendation>';
  await p.goto('http://localhost:3088/?station=0154&view=chat');const input=p.locator('.v2-chat-pane input[aria-label="message"]');await input.fill('어떻게 가나요');await input.press('Enter');await p.locator('.sag-menu-recommendation').waitFor();const n=routeCalls.length,m=placeCalls;await p.locator('.sag-menu-recommendation').click();await p.locator('#rl-destination').waitFor();await wait(200);assert.equal(routeCalls.length,n);assert.equal(placeCalls,m);assert.equal(await p.locator('#rl-destination').inputValue(),'');
  assert.deepEqual(errors,[]);console.log('PASS real chat handler → mocked Gemini → named button → existing wayfinding → one station/one place lookup → official route; 4 languages, chat return, repeated handoff, missing-query fallback. No real paid provider calls.');
 }finally{await browser?.close();child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
