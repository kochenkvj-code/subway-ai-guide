import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs/promises';
import {loadAppModule} from './helpers/load-app-module.mjs';
const adapter=await loadAppModule('app/lib/operation-timetable-model.js'),legacy=await loadAppModule('app/lib/timetable-lab-model.js');
const {normalizeOperationStationCode,operationTimetableColumns,compileOperationTimetable}=adapter;
const plain=v=>JSON.parse(JSON.stringify(v));
const row=(overrides={})=>({'고유번호':'1','호선':'1','역사코드':'154','역사명':'종로5가','주중주말':'DAY','방향':'UP','급행여부':'0','열차코드':'S102','열차도착시간':'15:02:30','열차출발시간':'15:03:00','출발역':'인천','도착역':'의정부',...overrides});
const station=code=>legacy.timetableStation(code);
test('station identity is normalized without losing line-specific Kkachisan identities',()=>{assert.equal(normalizeOperationStationCode(154),'0154');assert.equal(normalizeOperationStationCode('0200'),'0200');assert.equal(normalizeOperationStationCode('1x'),null);assert.equal(station('0200').line,'2');assert.equal(station('2519').line,'5');});
test('weekday metadata exists even when no timetable rows can be fetched',()=>{assert.deepEqual(plain(operationTimetableColumns(station('0154'))).map(c=>c.next),['종로3가','동대문']);assert.equal(operationTimetableColumns(station('0211')).length,3);assert.equal(operationTimetableColumns(station('0234')).length,3);assert.equal(operationTimetableColumns(station('0200')).length,1);assert.equal(operationTimetableColumns(station('2612')).length,1);});
test('old provider validity fields do not discard current operation dataset records',()=>{const d=compileOperationTimetable([row({vldEndDt:'2020-01-01'})],station('0154'));assert.equal(d.rows.length,1);assert.equal(d.rows[0].destination,'의정부');});
test('branch departures map to correct next stations and arrival-only rows remain excluded',()=>{for(const [code,dir,dest,next]of [['0200','DOWN','신도림','신정네거리'],['0234','UP','까치산','도림천'],['0211','DOWN','신설동','용답'],['0247','DOWN','신도림','신도림']]){const d=compileOperationTimetable([row({'방향':dir,'도착역':dest,'열차도착시간':''}),row({'고유번호':'2','열차출발시간':''})],station(code));assert.equal(d.rows.length,1);assert.equal(d.columns.find(c=>c.id===d.rows[0].column).next,next);assert.equal(d.excluded.arrivalOnly,1);assert.equal(d.excluded.unclassified,0);}});
test('Eungam loop departures with/without arrival remain separate, including identical train numbers',()=>{const d=compileOperationTimetable([row({'방향':'DOWN','출발역':'응암','도착역':'신내','열차도착시간':''}),row({'고유번호':'2','방향':'DOWN','출발역':'응암','도착역':'신내'})],station('2611'));assert.equal(d.rows.length,2);assert.deepEqual(new Set(d.rows.map(r=>r.column)),new Set(['역촌|','새절|']));});
test('Gangdong branch destinations choose distinct downstream neighbors',()=>{const d=compileOperationTimetable([row({'방향':'DOWN','도착역':'하남검단산'}),row({'고유번호':'2','방향':'DOWN','도착역':'마천'})],station('2549'));assert.deepEqual(new Set(d.rows.map(r=>r.column)),new Set(['길동|','둔촌동|']));});
test('extended hours retain service-day order and express flags; no departure fallback to arrival',()=>{const d=compileOperationTimetable([row({'열차출발시간':'25:02:00'}),row({'고유번호':'2','열차출발시간':'00:10:30','급행여부':'1'}),row({'고유번호':'3','열차출발시간':''})],station('0154'));assert.deepEqual(plain(d.rows).map(r=>r.minute),[1450,1502]);assert.equal(d.rows[0].express,true);assert.equal(d.excluded.arrivalOnly,1);assert.ok(d.hours.includes(25));});
test('only complete operational duplicates collapse; origin/arrival changes and unclassified rows remain visible',()=>{const base=row(),d=compileOperationTimetable([base,{...base,'고유번호':'2'},row({'고유번호':'3','출발역':'다른역'}),row({'고유번호':'4','방향':'UNKNOWN'})],station('0154'));assert.equal(d.excluded.duplicates,1);assert.equal(d.rows.length,3);assert.equal(d.excluded.unclassified,1);assert.ok(d.columns.some(c=>c.unknown));});
// Shared-cache fixture models successful writes and stale-on-refresh-error only.
async function provider(fetcher,shared=new Map(),clock={now:Date.now()},cacheImplementation=null){
 const calls=[];class Clock extends Date{constructor(...args){super(...(args.length?args:[clock.now]));}static now(){return clock.now;}}
 const context=vm.createContext({URL,URLSearchParams,AbortSignal,Date:Clock,process:{env:{SEOUL_METRO_OPERATION_TIMETABLE_API_KEY:'fixture-only'}},fetch:async(...args)=>{calls.push(args);return fetcher(...args);}});
 const mod=new vm.SourceTextModule(await fs.readFile('app/lib/operation-timetable-provider.js','utf8'),{context});
 await mod.link(name=>{const values=name==='next/cache'?{unstable_cache:cacheImplementation||((fn,keys,options)=>async(...args)=>{const key=JSON.stringify([keys,args]),old=shared.get(key);if(old&&clock.now-old.at<options.revalidate*1000)return old.data;try{const data=await fn(...args);shared.set(key,{data,at:clock.now});return data;}catch(error){if(old)return old.data;throw error;}})}:{normalizeOperationStationCode:adapter.normalizeOperationStationCode,operationDays:adapter.operationDays};return new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context});});
 await mod.evaluate();return {load:day=>mod.namespace.loadOperationTimetable(station('0154'),day),calls,tick:ms=>clock.now+=ms,shared,clock};
}

const page=(url,rows,count=rows.length)=>Response.json({page:Number(url.searchParams.get('page')),perPage:1000,matchCount:count,currentCount:rows.length,data:rows});
test('provider uses verified endpoint and independent filtered queries, caching one station/day',async()=>{const f=await provider(async url=>page(url,[row({'주중주말':url.searchParams.get('cond[주중주말::EQ]')})]));for(const day of ['평일','주말','공휴일']){const d=await f.load(day);assert.equal(d.total,1);const u=f.calls.at(-1)[0];assert.equal(u.searchParams.get('cond[역사코드::EQ]'),'0154');assert.equal(u.searchParams.get('cond[호선::EQ]'),'1');assert.match(u.pathname,/895a541f/);}assert.equal(f.calls.length,3);await f.load('평일');assert.equal(f.calls.length,3);});
test('provider consumes all pages and concurrent requests share one load',async()=>{const f=await provider(async url=>{const n=Number(url.searchParams.get('page'));return page(url,Array.from({length:n===1?1000:1},(_,i)=>row({'고유번호':String((n-1)*1000+i+1)})),1001);});const [a,b]=await Promise.all([f.load('평일'),f.load('평일')]);assert.equal(a.rows.length,1001);assert.equal(b.rows.length,1001);assert.equal(f.calls.length,2);});
test('wrong station/day, duplicate pages and incomplete pages reject without accepting partial data',async()=>{for(const fetcher of [async url=>page(url,[row({'역사코드':'155'})]),async url=>page(url,[row({'주중주말':'SAT'})]),async url=>page(url,[row()],1001),async url=>page(url,Array.from({length:Number(url.searchParams.get('page'))===1?1000:1},(_,i)=>row({'고유번호':String(i)})),1001)]){const f=await provider(fetcher);await assert.rejects(f.load('평일'));}});
test('refresh failure retains only previous fully validated data and stale state is explicit',async()=>{let fail=false;const f=await provider(async url=>{if(fail)throw Error('fixture network');return page(url,[row()]);});const before=await f.load('평일');f.tick(300001);fail=true;const after=await f.load('평일');assert.equal(after.cacheState,'stale');assert.equal(after.rows.length,1);assert.equal(after.fetchedAt,before.fetchedAt);});

test('separate instance reuses shared validated source; key includes revision, station, line and day',async()=>{
 const first=await provider(async url=>page(url,[row()]));const a=await first.load('평일');
 const second=await provider(async()=>{throw Error('must not fetch');},first.shared,first.clock);assert.equal((await second.load('평일')).fetchedAt,a.fetchedAt);assert.equal(second.calls.length,0);
 const key=[...first.shared.keys()][0];for(const value of ['895a541f','0154','1','DAY'])assert.ok(key.includes(value));
 const saved=[...first.shared.values()][0].data;assert.equal('cacheState' in saved,false);assert.equal('businessDate' in saved,false);
});
test('shared refresh failure does not rewrite success, reset freshness, or extend 24-hour fallback',async()=>{
 let fail=false;const first=await provider(async url=>{if(fail)throw Error('offline');return page(url,[row()]);});const a=await first.load('평일');first.tick(300001);fail=true;
 const second=await provider(async()=>{throw Error('offline');},first.shared,first.clock);const b=await second.load('평일');assert.equal(b.cacheState,'stale');assert.equal(b.fetchedAt,a.fetchedAt);assert.equal([...first.shared.values()][0].at,Date.parse(a.fetchedAt));
 second.tick(300001);assert.equal((await second.load('평일')).cacheState,'stale');assert.equal(second.calls.length,2,'stale read must not start new local TTL');second.tick(86400000);await assert.rejects(second.load('평일'));
});
test('partial or wrong source never enters shared cache; complete retry can recover',async()=>{let bad=true;const f=await provider(async url=>page(url,bad?[row({'역사코드':'155'})]:[row()]));await assert.rejects(f.load('평일'));assert.equal(f.shared.size,0);bad=false;assert.equal((await f.load('평일')).total,1);assert.equal(f.shared.size,1);});

test('installed Next.js cache reuses a source across instances and preserves stale data on background refresh failure',async()=>{
 const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);
 globalThis.AsyncLocalStorage=(await import('node:async_hooks')).AsyncLocalStorage;
 const {unstable_cache}=require('next/cache'),{workAsyncStorage}=require('next/dist/server/app-render/work-async-storage.external');
 const entries=new Map(),clock={now:Date.now()};let writes=0;
 const incrementalCache={generateCacheKey:async key=>key,get:async key=>{const entry=entries.get(key);return entry?{value:entry.value,isStale:clock.now-entry.at>=300000}:null;},set:async(key,value)=>{writes++;entries.set(key,{value,at:clock.now});}};
 async function request(load){const store={incrementalCache,route:'/api/v2/operation-timetable',isStaticGeneration:false};const result=await workAsyncStorage.run(store,load);await Promise.all(Object.values(store.pendingRevalidates||{}));return result;}
 const first=await provider(async url=>page(url,[row()]),new Map(),clock,unstable_cache);const a=await request(()=>first.load('평일'));assert.equal(writes,1);
 const second=await provider(async()=>{throw Error('UPSTREAM_NETWORK');},new Map(),clock,unstable_cache);assert.equal((await request(()=>second.load('평일'))).fetchedAt,a.fetchedAt);assert.equal(second.calls.length,0);
 clock.now+=300001;const log=console.error;console.error=()=>{};
 try{const b=await request(()=>second.load('평일'));assert.equal(b.cacheState,'stale');assert.equal(b.fetchedAt,a.fetchedAt);assert.equal(writes,1);assert.equal(second.calls.length,1);}finally{console.error=log;}
});
