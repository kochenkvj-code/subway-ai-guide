import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const source=await fs.readFile('app/lib/record-stat.js','utf8');
async function fixture(statuses,excluded=false){
 const calls=[],timers=[];let sequence=0;
 const context=vm.createContext({window:{crypto:{randomUUID:()=>`11111111-1111-4111-8111-${String(++sequence).padStart(12,'0')}`},sessionStorage:{getItem:()=>null,setItem(){}},addEventListener(){}},Date,setTimeout:f=>timers.push(f),fetch:async(url,options)=>{calls.push(JSON.parse(options.body));const status=statuses.shift();if(status==='offline')throw Error();return {ok:status===204,status};}});
 const pref=new vm.SyntheticModule(['isAnalyticsExcluded'],function(){this.setExport('isAnalyticsExcluded',()=>excluded)},{context});const module=new vm.SourceTextModule(source,{context});await module.link(()=>pref);await module.evaluate();
 return {calls,timers,record:module.namespace.recordStat,settle:()=>new Promise(r=>setImmediate(r))};
}
test('503, offline and 429 retry the identical ID, content and timestamp; success stops',async()=>{
 const f=await fixture([503,'offline',429,204]);f.record('ai_question','request','ja',null,'質問');await f.settle();
 while(f.timers.length){f.timers.shift()();await f.settle();}
 assert.equal(f.calls.length,4);assert.equal(new Set(f.calls.map(x=>x.event_id)).size,1);assert.ok(f.calls.every(x=>JSON.stringify(x)===JSON.stringify(f.calls[0])));assert.equal(f.calls[0].question,'質問');
});
test('permanent failures stop, opt-out sends nothing, question bounded and only AI stores text',async()=>{
 const f=await fixture([400,204]);f.record('ai_question','request','ko',null,'가'.repeat(600));await f.settle();assert.equal(f.timers.length,0);assert.equal(f.calls[0].question.length,500);
 f.record('gate_action','e44','en',null,'ignore');await f.settle();assert.equal(f.calls[1].question,null);assert.notEqual(f.calls[0].event_id,f.calls[1].event_id);
 const off=await fixture([],true);off.record('ai_question','request','ko',null,'secret');assert.equal(off.calls.length,0);
});
