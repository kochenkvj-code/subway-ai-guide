import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const source=await fs.readFile('app/lib/record-stat.js','utf8');
const KEY='subway_ai_guide_pending_events_v1',SESSION='subway_ai_guide_visit_session';
let sequence=0;
async function fixture(statuses=[],{excluded=false,storage=new Map(),blocked=false,start=1800000000000,defer=false}={}){
 const calls=[],timers=new Map(),listeners=new Map();let now=start,timerId=0,active=0,peak=0;const releases=[];
 class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const listen=(name,fn)=>listeners.set(name,[...(listeners.get(name)||[]),fn]);
 const context=vm.createContext({window:{crypto:{randomUUID:()=>`11111111-1111-4111-8111-${String(++sequence).padStart(12,'0')}`},sessionStorage:{getItem:k=>{if(blocked)throw Error();return storage.get(k)||null;},setItem(k,v){if(blocked)throw Error();storage.set(k,v);},removeItem:k=>storage.delete(k)},addEventListener:listen},document:{addEventListener:listen},Date:Clock,AbortSignal,setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,due:now+delay});return id;},clearTimeout:id=>timers.delete(id),fetch:async(url,options)=>{calls.push(JSON.parse(options.body));active++;peak=Math.max(peak,active);if(defer)await new Promise(r=>releases.push(r));active--;const status=statuses.shift()??204;if(status==='offline')throw Error();return {ok:status>=200&&status<300,status};}});
 const pref=new vm.SyntheticModule(['isAnalyticsExcluded'],function(){this.setExport('isAnalyticsExcluded',()=>excluded)},{context});const module=new vm.SourceTextModule(source,{context});await module.link(()=>pref);await module.evaluate();
 const settle=()=>new Promise(r=>setImmediate(r));
 return {calls,timers,storage,releases,record:module.namespace.recordStat,settle,peak:()=>peak,exclude:v=>excluded=v,fire:async name=>{for(const f of listeners.get(name)||[])f();await settle();},advance:async ms=>{now+=ms;const due=[...timers].filter(([,v])=>v.due<=now);for(const [id,{fn}]of due)if(timers.delete(id))fn();await settle();}};
}
test('uncertain 503/network/429/403 retain identical ID and click time until DB acknowledgement',async()=>{
 const f=await fixture([503,'offline',429,403,204]);f.record('ai_question','request','ja',null,'質問');await f.settle();
 for(let i=0;i<4;i++)await f.advance(60000);
 assert.equal(f.calls.length,5);assert.equal(new Set(f.calls.map(x=>JSON.stringify(x))).size,1);assert.equal(f.storage.has(KEY),false);assert.equal(f.timers.size,0);
});
test('reload restores pending events with original session, ID, text and timestamp',async()=>{
 const first=await fixture(['offline']);first.record('gate_action','e44','en','gate_e44');await first.settle();const original=first.calls[0];
 const reloaded=await fixture([204,204],{storage:first.storage,start:1800000600000});reloaded.record('page_view','visit','en');await reloaded.settle();assert.deepEqual(reloaded.calls[0],original);assert.equal(reloaded.calls[1].session_id,original.session_id);assert.equal(reloaded.storage.has(KEY),false);
});
test('reconnect, page return and page hide retry without waiting for the timer',async()=>{
 const f=await fixture([503,503,503,204]);f.record('gate_action','e05','ko');await f.settle();for(const event of ['online','pageshow','pagehide'])await f.fire(event);assert.equal(f.calls.length,4);assert.equal(f.storage.has(KEY),false);
});
test('unacknowledged 200 is retained; permanent validation failures stop; AI text is bounded',async()=>{
 const f=await fixture([200,400,204]);f.record('ai_question','request','ko',null,'가'.repeat(600));await f.settle();assert.ok(f.storage.has(KEY));await f.fire('online');assert.equal(f.storage.has(KEY),false);assert.equal(f.timers.size,0);assert.equal(f.calls[0].question.length,500);
 f.record('gate_action','e44','en',null,'ignore');await f.settle();assert.equal(f.calls.at(-1).question,null);
});
test('thirty-minute TTL removes records in memory and on reload, and opt-out clears stored questions',async()=>{
 const f=await fixture(Array(30).fill(503));f.record('ai_question','request','ko',null,'private');await f.settle();await f.advance(30*60*1000);assert.equal(f.calls.length,1);assert.equal(f.storage.has(KEY),false);
 const off=await fixture([503]);off.record('ai_question','request','ko',null,'private');await off.settle();off.exclude(true);await off.fire('analytics-preference-change');assert.equal(off.storage.has(KEY),false);assert.equal(off.timers.size,0);off.record('page_view','visit','ko');assert.equal(off.calls.length,1);
 const old=await fixture([503]);old.record('gate_action','e01','en');await old.settle();const newer=await fixture([],{storage:old.storage,start:1800001800001});newer.record('page_view','visit','ko');await newer.settle();assert.equal(newer.calls.length,1);assert.equal(newer.calls[0].event_type,'page_view');
});
test('corrupt, cross-session and expired saved entries are discarded; blocked storage stays usable',async()=>{
 const corrupt=await fixture([],{storage:new Map([[KEY,'{bad']])});corrupt.record('page_view','visit','ko');await corrupt.settle();assert.equal(corrupt.calls.length,1);
 const original=await fixture([503]);original.record('gate_action','e01','en');await original.settle();original.storage.delete(SESSION);const fresh=await fixture([],{storage:original.storage});fresh.record('page_view','visit','ko');await fresh.settle();assert.equal(fresh.calls.length,1);
 const blocked=await fixture([204],{blocked:true});assert.doesNotThrow(()=>blocked.record('page_view','visit','ko'));await blocked.settle();assert.equal(blocked.calls.length,1);
});
test('queue is capped at 100 and has at most four in-flight requests',async()=>{
 const f=await fixture([],{defer:true});for(let i=0;i<110;i++)f.record('gate_action','e44','en');assert.equal(f.calls.length,4);assert.equal(f.peak(),4);assert.equal(JSON.parse(f.storage.get(KEY)).length,100);
 while(f.releases.length){f.releases.splice(0).forEach(r=>r());await f.settle();}assert.equal(f.calls.length,100);assert.equal(f.storage.has(KEY),false);
});
