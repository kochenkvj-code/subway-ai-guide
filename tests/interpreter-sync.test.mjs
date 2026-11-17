import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {startInterpreterSync}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync('app/lib/interpreter-sync.js')).toString('base64'));
function fixture(connect){
 let clock=0,seq=0,loads=0;const timers=new Map();
 const controller=startInterpreterSync({load:async()=>{loads++;},connect,setTimer:(fn,ms)=>{const id=++seq;timers.set(id,{fn,at:clock+ms});return id;},clearTimer:id=>timers.delete(id)});
 const flush=()=>new Promise(r=>setImmediate(r));
 return {controller,get loads(){return loads;},async advance(ms){await flush();const end=clock+ms;while(true){const item=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!item||item[1].at>end)break;clock=item[1].at;timers.delete(item[0]);await item[1].fn();await flush();}clock=end;await flush();}};
}
test('healthy realtime has no idle polling; changes fetch and stop disposes',async()=>{
 let cb,closed=0;const f=fixture(async c=>{cb=c;c.status(true);return {close(){closed++;}};});
 await f.advance(0);const initial=f.loads;await f.advance(300000);assert.equal(f.loads,initial);cb.changed();await f.advance(0);assert.equal(f.loads,initial+1);f.controller.stop();assert.equal(closed,1);
});
test('failure polls every 8 seconds; recovered subscription stops polling',async()=>{
 let cb;let fail=true;const f=fixture(async c=>{cb=c;if(fail)throw Error('offline');c.status(true);return {close(){}};});
 await f.advance(0);const first=f.loads;await f.advance(8000);assert.equal(f.loads,first+1);fail=false;await f.advance(7000);const recovered=f.loads;await f.advance(60000);assert.equal(f.loads,recovered);f.controller.stop();
});
test('background resume always reconciles messages',async()=>{
 const f=fixture(async c=>{c.status(true);return {close(){}};});await f.advance(0);const first=f.loads;f.controller.resume();await f.advance(0);assert.equal(f.loads,first+1);f.controller.stop();
});
test('repeated websocket errors cannot postpone the fallback poll indefinitely',async()=>{
 let callbacks;const f=fixture(async c=>{callbacks=c;c.status(true);return {close(){}};});await f.advance(0);const start=f.loads;
 callbacks.status(false);for(let i=0;i<8;i++){await f.advance(1000);callbacks.status(false);}
 assert.ok(f.loads>start);f.controller.stop();
});
