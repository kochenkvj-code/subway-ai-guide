import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {buildNativeV2Prompt} from '../app/lib/v2-chat-policy-native.js';
import {buildCompactV2Prompt} from '../app/lib/v2-chat-policy-compact.js';
import {buildAccessibleV2Prompt} from '../app/lib/v2-chat-policy-accessible.js';

const station={stationCode:'0154',line:'1',names:{ko:'종로5가'}};
test('new A uses Gemini knowledge directly without facility search/evidence mandates',()=>{
 const one={stationCode:'0159',line:'1',names:{ko:'동묘앞'}};
 const six={stationCode:'2637',line:'6',names:{ko:'동묘앞'}};
 const q='동묘앞역 1호선 에스컬레이터는 몇 번 출구에 있나요?';
 const a1=buildNativeV2Prompt(q,'ko',one,'한국어 전용',{strictLanguage:true});
 const a6=buildNativeV2Prompt(q,'ko',six,'한국어 전용',{strictLanguage:true});
 const b=buildCompactV2Prompt(q,'ko',one,'한국어 전용',{strictLanguage:true});
 assert.ok(a1.includes('1호선 동묘앞역'));
 assert.ok(a6.includes('6호선 동묘앞역'));
 assert.ok(a1.includes(q));
 assert.ok(a1.includes('Use your own knowledge and reasoning'));
 assert.ok(a1.includes('Google Search is available as an OPTIONAL aid'));
 assert.ok(a1.includes('Lead with the most useful specific information'));
 assert.ok(a1.includes('never invent an exit number'));
 assert.ok(a1.includes('한국어 전용'));
 assert.ok(a1.includes('<route_query>destination search term</route_query>'));
 assert.ok(a1.includes('<menu_recommendation>ID</menu_recommendation>'));
 for(const restrictive of ['Do not rely on memory alone','If reliable evidence is missing','Use Google Search grounding','LINE-SPECIFIC STATION IDENTITY (mandatory)','SEARCH COVERAGE, within this single grounded response'])
  assert.ok(!a1.includes(restrictive),restrictive);
 assert.ok(a1.length<b.length*0.65);
});
test('B preserves the former general transport policy without new route nudges',()=>{
 const b=buildCompactV2Prompt('둔촌역','ko',station,'언어규칙',{strictLanguage:true});
 assert.ok(b.includes('For questions unrelated to local amenities, remain helpful about the station and public transportation'));
 assert.ok(b.includes('The traveler asks: "둔촌역"'));
 assert.ok(b.includes('LINE-SPECIFIC STATION IDENTITY'));
 assert.ok(b.includes('SEARCH COVERAGE'));
 assert.ok(!b.includes('When a passenger mentions'));
 assert.ok(b.includes('If a different subject station/line is explicit'));
 assert.ok(b.includes('종오지하쇼핑센터'));
 assert.ok(b.includes('<route_query>'));
 assert.ok(b.includes('<menu_recommendation>'));
 const other=buildCompactV2Prompt('화장실','ko',{stationCode:'0156',line:'1',names:{ko:'신설동'}},'언어규칙',{strictLanguage:true});
 assert.ok(other.includes('신설동'));
 assert.ok(!other.includes('종오지하쇼핑센터'));
});
async function fixture(raw='안내입니다.\n<route_query>신라호텔</route_query>\n<menu_recommendation>route</menu_recommendation>'){
 const calls=[];
 const env={GCP_PROJECT_ID:'fixture',GCP_PROJECT_NUMBER:'1',GCP_SERVICE_ACCOUNT_EMAIL:'test@example.com',GCP_WORKLOAD_IDENTITY_POOL_ID:'pool',GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID:'provider'};
 const context=vm.createContext({Response,Request,URL,URLSearchParams,Buffer,AbortSignal,console,Date,process:{env},fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:raw}]},groundingMetadata:{webSearchQueries:['test query'],groundingChunks:[{web:{title:'official',uri:'https://example.com'}}],groundingSupports:[{segment:{endIndex:5}}]}}],usageMetadata:{promptTokenCount:456,candidatesTokenCount:78,thoughtsTokenCount:13,totalTokenCount:547}});}});
 const cache=new Map();
 async function load(file){
   if(cache.has(file))return cache.get(file);
   const source=await fs.readFile(file,'utf8');
   const m=file.endsWith('.json')?new vm.SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(source));},{context,identifier:file}):new vm.SourceTextModule(source,{context,identifier:file});
   cache.set(file,m);
   return m;
 }
 const m=await load(path.resolve('app/api/search-lab/chat-ab/route.js'));
 await m.link(async (name,parent)=>{
   if(name.startsWith('.'))return load(path.resolve(path.dirname(parent.identifier),/\.(json|js)$/.test(name)?name:name+'.js'));
   const exports=name==='@vercel/oidc'?{getVercelOidcToken:async()=> 'fixture'}:{ExternalAccountClient:{fromJSON:()=>({getAccessToken:async()=>({token:'fixture'})})}};
   return new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v);},{context});
 });
 await m.evaluate();
 return {calls,env,run:(variant,opts={})=>m.namespace.POST(new Request('https://app.test/api/search-lab/chat-ab',{method:'POST',body:JSON.stringify({question:'신라호텔',stationCode:'0154',lang:'ja',history:[],historyCompletedAt:null,variant,...opts.body})}))};
}
test('B retains original V2 facility ownership policy without changing general destination guidance',()=>{
 const b1=buildCompactV2Prompt('수유실 어디에 있나요?','ko',{stationCode:'0159',line:'1',names:{ko:'동묘앞'}},'언어규칙',{strictLanguage:true});
 const b6=buildCompactV2Prompt('수유실 어디에 있나요?','ko',{stationCode:'2637',line:'6',names:{ko:'동묘앞'}},'언어규칙',{strictLanguage:true});
 for(const b of [b1,b6]){
   assert.ok(b.includes('LINE-SPECIFIC STATION IDENTITY (mandatory):'));
   assert.ok(b.includes('Stations sharing a name on different lines are separate station entities'));
   assert.ok(b.includes('Verify which line each source describes'));
   assert.ok(b.includes("A verified facility at another line's station may still be a useful alternative"));
   assert.ok(b.includes('explicitly name that LINE + STATION'));
   assert.ok(b.includes('SEARCH COVERAGE, within this single grounded response'));
   assert.ok(b.includes('A facility question alone does NOT justify the facility button'));
   assert.ok(b.includes('Also omit a station-bound recommendation when your answer directs the passenger to a facility on another line'));
   assert.ok(b.includes('For questions unrelated to local amenities, remain helpful about the station and public transportation'));
   assert.ok(!b.includes('When a passenger mentions a station, hotel'));
 }
 assert.ok(b1.includes('1호선 동묘앞 수유실'));
 assert.ok(b6.includes('6호선 동묘앞 수유실'));
 assert.notEqual(b1,b6);
 const hotel=buildCompactV2Prompt('신라호텔','ko',{stationCode:'0154',line:'1',names:{ko:'종로5가'}},'언어규칙',{strictLanguage:true});
 assert.ok(hotel.includes('The traveler asks: "신라호텔"'));
 assert.ok(hotel.includes('not a restriction on unrelated destination questions'));
});
test('C answers reachable facilities without station-interior eligibility tests',()=>{
 const one={stationCode:'0159',line:'1',names:{ko:'동묘앞'}};
 const six={stationCode:'2637',line:'6',names:{ko:'동묘앞'}};
 const c1=buildAccessibleV2Prompt('수유실 어디에 있나요?','ko',one,'언어 정책',{strictLanguage:true});
 const c6=buildAccessibleV2Prompt('수유실 어디에 있나요?','ko',six,'언어 정책',{strictLanguage:true});
 for(const prompt of [c1,c6]){
  assert.ok(prompt.includes('useful, reachable option'));
  assert.ok(prompt.includes('Identify the line and station'));
  assert.ok(prompt.includes('connected interchange line, or nearby'));
  assert.ok(prompt.includes('Do not lead with claims that it is absent from the entry station'));
  assert.ok(prompt.includes('lack of verification from verified absence'));
  assert.ok(prompt.includes('<route_query>destination search term</route_query>'));
  assert.ok(prompt.includes('<menu_recommendation>ID</menu_recommendation>'));
  assert.ok(!prompt.includes('LINE-SPECIFIC STATION IDENTITY (mandatory)'));
  assert.ok(!prompt.includes('SEARCH COVERAGE, within this single grounded response'));
  assert.ok(!prompt.includes('ENTRY-STATION SEARCH LEADS'));
 }
 assert.ok(c1.includes('1호선 동묘앞역'));
 assert.ok(c6.includes('6호선 동묘앞역'));
 assert.notEqual(c1,c6);
 const hotel=buildAccessibleV2Prompt('신라호텔','en',{stationCode:'0154',line:'1',names:{ko:'종로5가'}},'ENGLISH',{strictLanguage:true});
 assert.ok(hotel.includes('The traveler asks: "신라호텔"'));
 assert.ok(hotel.includes('ENGLISH'));
});
test('A/B/C use identical model, search, language, history and parser',async()=>{
 const f=await fixture();
 const responses=[];
 for(const variant of ['A','B','C'])responses.push(await(await f.run(variant)).json());
 assert.ok(responses.every(r=>r.ok));
 assert.equal(f.calls.length,3);
 const [a,b,c]=f.calls.map(x=>x.body);
 for(const other of [b,c]){
  assert.deepEqual(other.systemInstruction,a.systemInstruction);
  assert.deepEqual(other.tools,a.tools);
  assert.deepEqual(other.generationConfig,a.generationConfig);
  assert.equal(other.contents.length,a.contents.length);
 }
 assert.deepEqual(a.generationConfig,{maxOutputTokens:1200,thinkingConfig:{thinkingLevel:'LOW'}});
 assert.equal(new Set(f.calls.map(x=>x.url)).size,1);
 assert.equal(new Set(f.calls.map(x=>x.body.contents.at(-1).parts[0].text)).size,3);
 for(const [i,variant] of ['A','B','C'].entries()){
  assert.equal(responses[i].variant,variant);
  assert.equal(responses[i].recommendedMenu,'route');
  assert.equal(responses[i].routeQuery,'신라호텔');
  assert.equal(responses[i].usage.totalTokenCount,547);
  assert.equal(responses[i].sources[0].url,'https://example.com');
  assert.equal(responses[i].finishReason,'STOP');
 }
 assert.equal(responses[0].promptKind,'gemini-native-a');
 assert.equal(responses[1].promptKind,'current-production-b');
 assert.equal(responses[2].promptKind,'accessible-nearby-c');
 assert.ok(c.contents.at(-1).parts[0].text.includes('useful, reachable option'));
});
test('A/B use identical provider options, search, system rules and parser',async()=>{
 const f=await fixture();
 const a=await(await f.run('A')).json(),b=await(await f.run('B')).json();
 assert.equal(a.ok,true);assert.equal(b.ok,true);
 assert.deepEqual({answer:a.answer,recommendedMenu:a.recommendedMenu,routeQuery:a.routeQuery},{answer:b.answer,recommendedMenu:b.recommendedMenu,routeQuery:b.routeQuery});
 assert.equal(a.raw.includes('<route_query>'),true);
 assert.equal(a.usage.totalTokenCount,547);
 assert.equal(a.finishReason,'STOP');
 assert.equal(a.sources[0].url,'https://example.com');
 assert.equal(a.googleSearchQueries[0],'test query');
 assert.ok(typeof a.responseMs==='number');
 assert.equal(f.calls.length,2);
 const x=f.calls[0].body,y=f.calls[1].body;
 assert.equal(f.calls[0].url,f.calls[1].url);
 assert.deepEqual(x.systemInstruction,y.systemInstruction);
 assert.deepEqual(x.tools,y.tools);
 assert.deepEqual(x.generationConfig,y.generationConfig);
 assert.deepEqual(x.generationConfig,{maxOutputTokens:1200,thinkingConfig:{thinkingLevel:'LOW'}});
 assert.equal(x.contents.length,y.contents.length);
 assert.notEqual(x.contents.at(-1).parts[0].text,y.contents.at(-1).parts[0].text);
 assert.ok(x.contents.at(-1).parts[0].text.includes('Use your own knowledge and reasoning'));
 assert.ok(y.contents.at(-1).parts[0].text.includes('For questions unrelated to local amenities'));
 assert.ok(x.contents.at(-1).parts[0].text.includes('ROUTE SEARCH HANDOFF'));
 assert.ok(y.contents.at(-1).parts[0].text.includes('ROUTE SEARCH HANDOFF'));
});
test('lab API allows keyless valid requests and rejects invalid inputs before paid provider calls',async()=>{
 const f=await fixture();
 assert.equal((await f.run('not-a-variant')).status,400);
 assert.equal((await f.run('A',{body:{stationCode:'9999'}})).status,400);
 assert.equal((await f.run('A',{body:{history:[{role:'model',text:'bad'}]}})).status,400);
 assert.equal(f.calls.length,0);
 const response=await f.run('A');
 assert.equal(response.status,200);
 assert.equal(f.calls.length,1);
});
