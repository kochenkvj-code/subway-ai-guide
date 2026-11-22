import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import {createHash,timingSafeEqual} from 'node:crypto';
const fixtureToken='a'.repeat(64),fixtureKey='fixture-api-secret';
async function load({admin=false,key=fixtureKey,fetcher=async()=>Response.json({data:[]})}={}){
 let now=Date.now();const calls=[];
 let source=await fs.readFile('app/api/timetable-diagnostic/route.js','utf8');
 source=source.replace(/const probeHash='[a-f0-9]+';/,"const probeHash='"+createHash('sha256').update(fixtureToken).digest('hex')+"';").replace(/const probeExpires=\d+;/,'const probeExpires='+String(now+10000)+';');
 class Clock extends Date{static now(){return now;}}
 const ctx=vm.createContext({Response,URL,URLSearchParams,Buffer,Date:Clock,AbortSignal,process:{env:{SEOUL_METRO_OPERATION_TIMETABLE_API_KEY:key}},fetch:async(...args)=>{calls.push(args);return fetcher(...args);}});
 const mod=new vm.SourceTextModule(source,{context:ctx});await mod.link(name=>new vm.SyntheticModule(name==='node:crypto'?['createHash','timingSafeEqual']:['staffAuthorized'],function(){if(name==='node:crypto'){this.setExport('createHash',createHash);this.setExport('timingSafeEqual',timingSafeEqual);}else this.setExport('staffAuthorized',()=>admin);},{context:ctx}));await mod.evaluate();
 return {calls,tick:ms=>now+=ms,get:q=>mod.namespace.GET({url:'https://test/api/timetable-diagnostic?'+q,headers:new Headers()})};
}
test('anonymous/invalid/expired diagnostic credentials never call upstream',async()=>{const f=await load();assert.equal((await f.get('')).status,403);assert.equal((await f.get('probe=wrong')).status,403);f.tick(11000);assert.equal((await f.get('probe='+fixtureToken)).status,403);assert.equal(f.calls.length,0);});
test('valid scoped probe works only on this handler without administrator credentials',async()=>{const f=await load();assert.equal((await f.get('probe='+fixtureToken)).status,200);assert.equal(f.calls.length,1);});
test('admin access, three independent day filters, pagination and safe normalized rows',async()=>{const f=await load({admin:true,fetcher:async url=>{const q=url.searchParams;return Response.json({page:Number(q.get('page')),perPage:2,totalCount:423107,matchCount:5,currentCount:1,data:[{'고유번호':'10','역사코드':'0154','주중주말':q.get('cond[주중주말::EQ]'),'열차출발시간':'25:10:30',secret:fixtureKey}]});}});
 for(const day of ['DAY','SAT','END']){f.tick(2000);const r=await f.get('day='+day+'&page=2&perPage=2'),d=await r.json();assert.equal(r.status,200);assert.equal(d.matches.station,1);assert.equal(d.matches.day,1);assert.equal(d.rows[0]['열차출발시간'],'25:10:30');assert.equal(JSON.stringify(d).includes(fixtureKey),false);const u=f.calls.at(-1)[0];assert.equal(u.hostname,'api.odcloud.kr');assert.equal(u.searchParams.get('page'),'2');assert.equal(u.searchParams.get('cond[역사코드::EQ]'),'0154');assert.equal(u.searchParams.get('cond[주중주말::EQ]'),day);assert.equal(u.searchParams.has('wkndSe'),false);assert.equal(r.headers.get('cache-control'),'private, no-store');}
});
test('request limits reject invalid queries without making requests',async()=>{const f=await load({admin:true});for(const q of ['day=상시','page=0','page=21','perPage=1001','mode=proxy','revision=https://evil.test'])assert.equal((await f.get(q)).status,400);assert.equal(f.calls.length,0);});
test('missing key is reported and probe calls are throttled',async()=>{const f=await load({admin:true,key:''});assert.equal((await f.get('')).status,503);assert.equal(f.calls.length,0);const g=await load({admin:true});assert.equal((await g.get('')).status,200);assert.equal((await g.get('')).status,429);assert.equal(g.calls.length,1);});
test('upstream error bodies and URL-bearing exceptions never expose API keys',async()=>{for(const fetcher of [async()=>new Response(fixtureKey,{status:401}),async()=>{throw Error('failed https://upstream?key='+fixtureKey);},async()=>new Response(fixtureKey)]){const f=await load({admin:true,fetcher}),r=await f.get('');assert.equal(r.status,502);assert.equal((await r.text()).includes(fixtureKey),false);}});
test('unfiltered and impossible controls, duplicate count, metadata and zero rows',async()=>{const row={'高':'discard','고유번호':'7','역사코드':'0154','주중주말':'SAT'};const f=await load({admin:true,fetcher:async()=>Response.json({totalCount:423107,data:[row,row]})});const d=await(await f.get('mode=none')).json();assert.equal(f.calls[0][0].searchParams.has('cond[역사코드::EQ]'),false);assert.equal(d.duplicatesInPage,1);assert.equal(d.provider.totalCount,423107);f.tick(2000);await f.get('mode=impossible');assert.equal(f.calls[1][0].searchParams.get('cond[역사코드::EQ]'),'9999');});
test('schema probe uses fixed official host and sends no API credential',async()=>{const f=await load({admin:true,fetcher:async()=>Response.json({paths:{'/api/15098251/v1/uddi:test':{}},info:{title:'schema'}})});const r=await f.get('mode=schema');assert.equal(r.status,200);assert.equal(f.calls[0][0].hostname,'infuser.odcloud.kr');assert.equal(f.calls[0][0].searchParams.has('serviceKey'),false);});

test('encoded portal key is decoded once before URLSearchParams encoding',async()=>{const f=await load({admin:true,key:'fixture%2Bkey%3D'});assert.equal((await f.get('')).status,200);assert.equal(f.calls[0][0].searchParams.get('serviceKey'),'fixture+key=');});
