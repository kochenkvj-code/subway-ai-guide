import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import * as crypto from 'node:crypto';
const id='11111111-1111-4111-8111-111111111111',rid='22222222-2222-4222-8222-222222222222',token='a'.repeat(43),hash=crypto.createHash('sha256').update(token).digest('hex');
async function handler({allowed=true,claim={state:'claimed',sourceLang:'ko',targetLang:'en'},finish={messageId:rid},closed=false}={}){
 const calls=[];const room={id,staff_token_hash:hash,guest_token_hash:'b'.repeat(64),guest_invite_hash:'i'.repeat(64),staff_lang:'ko',guest_lang:'en',expires_at:new Date(Date.now()+600000).toISOString(),closed_at:closed?'now':null,message_count:0,realtime_topic:'private-capability'};
 const env={SUPABASE_URL:'https://database.test',SUPABASE_SECRET_KEY:'sb_secret_test',SUPABASE_PUBLISHABLE_KEY:'public-test',GCP_PROJECT_ID:'test',GCP_PROJECT_NUMBER:'1',GCP_SERVICE_ACCOUNT_EMAIL:'s',GCP_WORKLOAD_IDENTITY_POOL_ID:'p',GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID:'p'};
 const context=vm.createContext({Response,URL,URLSearchParams,AbortSignal,Buffer,process:{env},console,fetch:async(url,options={})=>{
  const path=new URL(url).pathname;calls.push({path,body:options.body&&JSON.parse(options.body)});
  if(path.includes('google'))return Response.json({candidates:[{content:{parts:[{text:'translated'}]}}]});
  if(path.endsWith('interpreter_claim'))return Response.json(claim);
  if(path.endsWith('interpreter_finish'))return Response.json(finish);
  if(path.endsWith('interpreter_fail')||path.endsWith('interpreter_close'))return Response.json(null);
  if(path.endsWith('interpreter_test_rooms'))return Response.json([room]);
  if(path.endsWith('interpreter_test_messages'))return Response.json([]);
  throw Error(path);
 }});
 const m=new vm.SourceTextModule(readFileSync('app/api/interpreter-test/route.js','utf8'),{context});
 await m.link(name=>{let exports=name==='node:crypto'?crypto:name.includes('oidc')?{getVercelOidcToken:async()=>''}:name.includes('google-auth')?{ExternalAccountClient:{fromJSON:()=>({getAccessToken:async()=>({token:'google-test'})})}}:name.includes('staff-access')?{allowRoomCreation:()=>allowed}:{getStationByCode:code=>code==='0154'?{}:null};return new vm.SyntheticModule(Object.keys(exports),function(){for(const [k,v]of Object.entries(exports))this.setExport(k,v);},{context});});await m.evaluate();return {api:m.namespace,calls};
}
function req(body,query=''){return new Request('https://site.test/api/interpreter-test'+query,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,Origin:'https://site.test','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
test('direct unauthenticated create is rejected before touching database',async()=>{const {api,calls}=await handler({allowed:false});assert.equal((await api.POST(req({action:'create',stationCode:'0154'}))).status,403);assert.equal(calls.length,0);});
test('completed retry returns without translating or inserting again',async()=>{const {api,calls}=await handler({claim:{state:'completed',messageId:rid}});assert.equal((await api.POST(req({action:'send',room:id,text:'hi',requestId:rid}))).status,200);assert.equal(calls.filter(x=>x.path.includes('google')||x.path.endsWith('interpreter_finish')).length,0);});
test('pending duplicate is rejected without another translation',async()=>{const {api,calls}=await handler({claim:{error:'message-pending'}});assert.equal((await api.POST(req({action:'send',room:id,text:'hi',requestId:rid}))).status,409);assert.equal(calls.length,2);});
test('translation language uses DB claim snapshot and finish shares same attempt',async()=>{const {api,calls}=await handler();const r=await api.POST(req({action:'send',room:id,text:'hi',requestId:rid}));assert.equal(r.status,200);const c=calls.find(x=>x.path.endsWith('interpreter_claim')).body,f=calls.find(x=>x.path.endsWith('interpreter_finish')).body;assert.equal(c.p_attempt,f.p_attempt);assert.equal(f.p_request,rid);assert.equal(f.p_translated,'translated');assert.equal(calls.filter(x=>x.path.includes('google')).length,1);});
test('close uses one DB transaction RPC, not separate delete and update',async()=>{const {api,calls}=await handler();assert.equal((await api.POST(req({action:'close',room:id}))).status,200);assert.deepEqual(calls.map(x=>x.path),['/rest/v1/interpreter_test_rooms','/rest/v1/rpc/interpreter_close']);});
test('closed room blocks content and realtime subscription metadata',async()=>{const {api}=await handler({closed:true});assert.equal((await api.GET(req(null,'?room='+id+'&realtime=1'))).status,410);});
test('normal chat reads do not expose the realtime capability',async()=>{const {api}=await handler();const body=await (await api.GET(req(null,'?room='+id))).json();assert.equal(JSON.stringify(body).includes('private-capability'),false);const rt=await(await api.GET(req(null,'?room='+id+'&realtime=1'))).json();assert.equal(rt.topic,'private-capability');});
