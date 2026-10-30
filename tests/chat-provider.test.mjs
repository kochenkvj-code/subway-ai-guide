import vm from 'node:vm';
import test from 'node:test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {timingSafeEqual} from 'node:crypto';
async function api(file){
 const calls=[];
 const context=vm.createContext({Response,Request,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,Buffer,console,Date,process:{env:{GCP_PROJECT_ID:'test-project',GCP_PROJECT_NUMBER:'1',GCP_SERVICE_ACCOUNT_EMAIL:'test@example.com',GCP_WORKLOAD_IDENTITY_POOL_ID:'pool',GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID:'provider'}},fetch:async(url,options)=>{calls.push(JSON.parse(options.body));return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'stub answer'}]}}]}),{status:200})}});
 const main=new vm.SourceTextModule(await fs.readFile(file,'utf8'),{context});
 await main.link(async name=>{
  if(name.includes('chat-history')){const m=new vm.SourceTextModule(await fs.readFile('app/lib/chat-history.js','utf8'),{context});await m.link(()=>{});return m;}
  const exports=name==='node:crypto'?{timingSafeEqual}:name==='@vercel/oidc'?{getVercelOidcToken:async()=> 'test-oidc'}:{ExternalAccountClient:{fromJSON:()=>({getAccessToken:async()=>({token:'test-access'})})}};
  return new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value)},{context});
 });
 await main.evaluate();
 return {calls,run:async body=>main.namespace.POST(new Request('http://localhost/api/google-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}))};
}
test('provider request preserves baseline unless fresh bounded context exists',async()=>{
const current=await api('app/api/google-search/route.js'),baseline=await api('docs/rollback/google-search-before-language-context.js.txt');
const question='경복궁은 어떻게 가나요?';
assert.equal((await baseline.run({question,lang:'ja'})).status,200);
assert.equal((await current.run({question,lang:'ja'})).status,200);
assert.deepEqual(current.calls.at(-1),baseline.calls.at(-1),'single-turn prompt/model/settings changed');
const history=[{role:'user',text:'화장실은 어디야?'},{role:'assistant',text:'시설 안내도에서 확인해 주세요.'}];
assert.equal((await current.run({question:'그 근처에 엘리베이터는?',lang:'ja',history,historyCompletedAt:Date.now()})).status,200);
const request=current.calls.at(-1);assert.equal(request.contents.length,3);assert.equal(request.contents[0].role,'user');assert.equal(request.contents[1].role,'model');assert(request.systemInstruction.parts[0].text.includes('clear new topic'));assert(request.systemInstruction.parts[0].text.includes('日本語'));assert(!JSON.stringify(request).includes('test-access'));
await current.run({question,lang:'ja',history,historyCompletedAt:Date.now()-300001});assert.deepEqual(current.calls.at(-1),baseline.calls.at(-1),'expired context did not restore exact single-turn request');
const before=current.calls.length;assert.equal((await current.run({question,lang:'ja',history:[...history,...history],historyCompletedAt:Date.now()})).status,400);assert.equal(current.calls.length,before);
console.log('PASS actual route handler/provider boundary: exact baseline payload without context, one-pair multi-turn roles, current language, topic rule, server expiry and invalid-history rejection');

});
