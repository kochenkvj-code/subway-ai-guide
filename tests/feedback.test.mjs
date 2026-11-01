import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {validateFeedback,DEFAULT_FEEDBACK_STATION} from '../app/lib/feedback-config.js';
const base={station:DEFAULT_FEEDBACK_STATION.id,type:'idea',location:'exit',detail:'3번',content:'더 편리한 역',language:'ko',request_id:'11111111-1111-4111-8111-111111111111'};
test('feedback validation rejects empty type, oversized text, unknown station and inconsistent location',()=>{
 assert.equal(validateFeedback(base).station_id,base.station);
 for(const change of [{type:''},{content:' '},{content:'a'.repeat(501)},{station:'other-station'},{detail:'a'.repeat(61)},{location:'invalid'},{location:'',detail:'stale'},{language:'xx'},{request_id:'invalid'}])assert.equal(validateFeedback({...base,...change}),null);
});
test('station tokens are isolated, expire, reject tampering and rotate with PIN configuration',async()=>{
 const context=vm.createContext({process:{env:{STATS_ADMIN_PASSWORD:'test-secret',FEEDBACK_STATION_PINS:JSON.stringify({a:'1234',b:'5678'})}},Date,Buffer});
 const crypto=await import('node:crypto');const stats={supabase:()=>{},authorized:()=>false};
 const deps={'node:crypto':crypto,'./stats-server':stats};const mod=new vm.SourceTextModule(await fs.readFile('app/lib/feedback-server.js','utf8'),{context});
 await mod.link(name=>{const obj=deps[name];return new vm.SyntheticModule(Object.keys(obj),function(){for(const [k,v]of Object.entries(obj))this.setExport(k,v)},{context});});await mod.evaluate();const api=mod.namespace;
 const req=token=>({headers:{get:()=> 'Bearer '+token}});
 assert.equal(api.verifyPin('a','1234'),true);assert.equal(api.verifyPin('a','5678'),false);assert.equal(api.verifyPin('missing','1234'),false);
 const token=api.issueFeedbackToken('a');assert.equal(api.feedbackAccess(req(token),'a').allowed,true);assert.equal(api.feedbackAccess(req(token),'b').allowed,false);assert.equal(api.feedbackAccess(req(token+'x'),'a').allowed,false);
 context.process.env.FEEDBACK_STATION_PINS=JSON.stringify({a:'9999'});assert.equal(api.feedbackAccess(req(token),'a').allowed,false);
 context.process.env.FEEDBACK_STATION_PINS=JSON.stringify({a:'1234'});const [id,,sig]=token.split('.');assert.equal(api.feedbackAccess(req([id,'1000000000000',sig].join('.')),'a').allowed,false);
});
