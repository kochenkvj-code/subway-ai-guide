import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const fixed=Date.parse('2026-11-01T03:00:00Z');
class Clock extends Date {constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}}
async function load(fetch,env={LOST112_PORTAL_API_KEY:'test-only',LOST112_POLICE_API_KEY:'test-only'}){
 const context=vm.createContext({Date:Clock,URL,Response,AbortSignal,Map,Set,Promise,JSON,Number,String,process:{env},fetch});const cache=new Map();
 async function module(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const text=await fs.readFile(file,'utf8');const m=file.endsWith('.json')?new vm.SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(text));},{context}):new vm.SourceTextModule(text,{context,identifier:file});cache.set(file,m);await m.link(ref=>module(path.resolve(path.dirname(file),ref.endsWith('.json')?ref:ref+'.js')));return m;}
 const api=await module('app/api/v2/lost-found/route.js');await api.evaluate();return {get:query=>api.namespace.GET({url:'http://localhost/api/v2/lost-found?'+new URLSearchParams(query)}),filter:cache.get(path.resolve('app/lib/lost-found-filter.js')).namespace};
}
const xml=(rows,total=rows.length)=>'<response><header><resultCode>00</resultCode></header><body><items>'+rows.map(x=>'<item>'+Object.entries(x).map(([k,v])=>'<'+k+'>'+v+'</'+k+'>').join('')+'</item>').join('')+'</items><totalCount>'+total+'</totalCount></body></response>';
const row=(id,place='종로5가역',date='2026-10-30',status='')=>({atcId:id,fdSn:'1',fdPrdtNm:'검은 지갑',depPlace:place,fdYmd:date,csteSteNm:status});
test('station rejects police/substation, stale, invalid dates and closed records; accepts explicit custody aliases',async()=>{
 const urls=[];const f=await load(async url=>{urls.push(url);return new Response(xml([row('STATION'),row('POLICE','종로5가파출소'),row('OTHER','종로3가역'),row('OLD','종로5가역','2019-05-01'),row('INVALID','종로5가역','2026-02-30'),row('DONE','종로5가역','2026-10-30','반환완료'),row('ALIAS','서울교통공사 1호선 종로5가역 고객안전실')]))});
 const body=await (await f.get({scope:'station'})).json();assert.deepEqual(body.items.map(x=>x.id),['STATION','ALIAS']);assert.equal(body.start,'2026-10-03');assert.equal(body.end,'2026-11-01');assert.ok(urls.every(x=>x.searchParams.get('DEP_PLACE')==='종로5가역'));
 assert.equal((await f.get({scope:'station',start:'2019-01-01',end:'2019-02-01'})).status,400);
});
test('all and other-place searches always use the Seoul area/date endpoint, even with item keywords',async()=>{
 const urls=[];const f=await load(async url=>{urls.push(url);return new Response(xml([row('A','종로5가파출소'),row('B','다른 기관')]))});
 const body=await (await f.get({scope:'other',place:'종로5가파출소',item:'지갑'})).json();assert.deepEqual(body.items.map(x=>x.id),['A']);assert.ok(urls.every(x=>x.searchParams.get('N_FD_LCT_CD')==='LCA000'&&x.searchParams.get('START_YMD')==='20261003'&&!x.searchParams.has('DEP_PLACE')&&!x.searchParams.has('PRDT_NM')));
 await f.get({scope:'all',item:'지갑'});assert.ok(urls.every(x=>x.pathname.includes('ClAreaPd')));
});
test('scans through empty filtered pages; cursors do not skip failed providers',async()=>{
 const f=await load(async url=>{const police=url.pathname.includes('/LosfundInfo');const page=Number(url.searchParams.get('pageNo'));if(police)return new Response('',{status:503});return new Response(xml(page===2?[row('MATCH')]:[row('OLD','종로5가駅','2019-01-01')],300));});
 const body=await (await f.get({scope:'all',item:'지갑'})).json();assert.equal(body.items.length,1);assert.equal(body.nextPages.portal,4);assert.equal(body.nextPages.police,1);assert.equal(body.partial,true);assert.equal(body.hasMore,true);
});
test('page twenty is bounded, malformed cursors rejected and no misleading complete flag after cap',async()=>{
 const pages=[];const f=await load(async url=>{pages.push(Number(url.searchParams.get('pageNo')));return new Response(xml([row('X')],10000));});
 const body=await (await f.get({scope:'station',page:'20'})).json();assert.ok(pages.every(x=>x===20));assert.equal(body.hasMore,false);assert.equal(body.limited,true);assert.equal(body.exhaustive,false);
 assert.equal((await f.get({cursors:'{"portal":22}'})).status,400);assert.equal((await f.get({page:'21'})).status,400);
});
test('partial missing key does not create an endless next-page loop',async()=>{
 const f=await load(async()=>new Response(xml([row('X')],1)),{LOST112_PORTAL_API_KEY:'test-only'});const body=await (await f.get({scope:'all'})).json();assert.equal(body.hasMore,false);assert.equal(body.partial,true);assert.equal(body.exhaustive,false);
});

test('first scan stops after one source page and keeps the next cursor for explicit loading',async()=>{
 const pages=[];const f=await load(async url=>{pages.push(Number(url.searchParams.get('pageNo')));return new Response(xml([row('A')],1000));});
 const body=await (await f.get({scope:'station',source:'portal',scan:'first'})).json();assert.deepEqual(pages,[1]);assert.equal(body.nextPages.portal,2);assert.equal(body.hasMore,true);assert.equal(body.items.length,1);
});

test('station custody always uses only portal, even if a caller asks for both or police',async()=>{
 const urls=[];const f=await load(async url=>{urls.push(url);return new Response(xml([row('STATION')]));});
 for(const source of ['both','police','portal']){const body=await (await f.get({scope:'station',source})).json();assert.equal(body.items.length,1);assert.deepEqual(Object.keys(body.nextPages),['portal']);}
 assert.equal(urls.length,3);assert.ok(urls.every(x=>x.pathname.includes('LosPtfund')));
});
test('entry station codes resolve server-side to station custody, with explicit other lines excluded',async()=>{
 const urls=[];const f=await load(async url=>{urls.push(url);return new Response(xml([
  row('SIX','서울교통공사 6호선 동묘앞역 고객안전실'),row('ONE','1호선 동묘앞역'),row('SHARED','동묘앞역'),row('POLICE','동묘앞파출소'),row('NEIGHBORHOOD','동묘앞'),row('JONGNO'),{...row('CODED','동묘앞역'),orgId:'V0000325'}
 ]));});
 const body=await (await f.get({station:'2637',scope:'station',source:'both',scan:'first'})).json();
 assert.deepEqual(body.items.map(x=>x.id),['SIX','CODED']);assert.equal(body.stationCode,'2637');assert.equal(body.stationLine,'6');assert.equal(urls.length,1);assert.equal(urls[0].searchParams.get('DEP_PLACE'),'동묘앞역(6호선)');assert.ok(urls[0].pathname.includes('/LosPtfund'));
 const one=await (await f.get({station:'0159',scope:'station',scan:'first'})).json();assert.deepEqual(one.items.map(x=>x.id),['ONE']);assert.equal(urls.at(-1).searchParams.get('DEP_PLACE'),'동묘앞역(1호선)');
});
test('Jonggak never searches Jongno 5-ga, and an explicit station scope ignores a conflicting place field',async()=>{
 const urls=[];const f=await load(async url=>{urls.push(url);return new Response(xml([row('RIGHT','종각역'),row('OLD_STATION'),row('POLICE','종각파출소')]));});
 const body=await (await f.get({station:'0152',scope:'station',place:'종로5가역',scan:'first'})).json();assert.deepEqual(body.items.map(x=>x.id),['RIGHT']);assert.equal(urls[0].searchParams.get('DEP_PLACE'),'종각역');assert.equal(body.stationCode,'0152');
});
test('invalid station codes never fall back; obsolete IDs rejected and Seoul area queries stay supported',async()=>{
 let calls=0;const f=await load(async()=>{calls++;return new Response(xml([row('LEGACY')]));});
 for(const station of ['','152','9999','0200','jongno5ga-1'])assert.equal((await f.get({station,scope:'station'})).status,400);assert.equal(calls,0);
 const city=await (await f.get({station:'0152',scope:'all'})).json();assert.equal(city.region,'서울특별시');assert.equal(city.scope,'all');assert.equal(city.stationCode,'0152');assert.equal(city.items.length,1);
});
test('verified Dongmyo agency identities remain independent and ambiguous bare transfer names are rejected',async()=>{
 const f=await load(async()=>new Response(xml([])));
 const one=f.filter.resolveLostSearch(new URLSearchParams({station:'0159',scope:'station'})).station;
 const six=f.filter.resolveLostSearch(new URLSearchParams({station:'2637',scope:'station'})).station;
 assert.equal(one.providerOrganizationId,'V0001918');assert.equal(six.providerOrganizationId,'V0000325');
 assert.equal(f.filter.stationCustody('동묘앞역(1호선)',one),true);assert.equal(f.filter.stationCustody('동묘앞역(1호선)',six),false);
 assert.equal(f.filter.stationCustody('동묘앞역(6호선)',six),true);assert.equal(f.filter.stationCustody('동묘앞역(6호선)',one),false);
 assert.equal(f.filter.stationCustody('동묘앞역',one),false);assert.equal(f.filter.stationCustody('동묘앞역',six),false);
 assert.equal(f.filter.stationCustody('동묘앞역(6호선)',six,'V0001918'),false);
});
