import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
async function route(fetch,env={TOUR_API_KEY:'ko-fixture',TOUR_API_KEY_EN:'en-fixture',TOUR_API_KEY_JA:'ja-fixture',TOUR_API_KEY_ZH:'zh-fixture'}){
 const context=vm.createContext({Response,URL,URLSearchParams,AbortSignal,AbortController,process:{env},fetch});
 const module=new vm.SourceTextModule(await fs.readFile('app/api/tour-test/route.js','utf8'),{context});
 await module.link(async name=>{const file=name==='../../lib/tour-services'?'app/lib/tour-services.js':name==='../../lib/tour-pages'?'app/lib/tour-pages.js':null;assert.ok(file,name);const config=new vm.SourceTextModule(await fs.readFile(file,'utf8'),{context});await config.link(()=>{});return config;});await module.evaluate();return module.namespace.GET;
}
const payload=type=>({response:{header:{resultCode:'0000'},body:{totalCount:1,items:{item:[{contentid:'202',contenttypeid:type,title:'Localized place',firstimage:'https://example.com/photo.jpg',overview:'Description'}]}}}});
const request=params=>new Request('https://test.local/api/tour-test?'+new URLSearchParams(params));
test('all four languages select their own service and key; seven categories are translated and normalized',async()=>{
 let expected;const get=await route(async value=>{const url=new URL(value);assert.ok(url.pathname.includes('/'+expected.service+'/locationBasedList2'));assert.equal(url.searchParams.get('serviceKey'),expected.key);assert.equal(url.searchParams.get('contentTypeId'),expected.foreign);assert.equal(url.searchParams.get('mapX'),'129.0756');return Response.json(payload(expected.foreign));});
 const services={ko:['KorService2','ko-fixture'],en:['EngService2','en-fixture'],ja:['JpnService2','ja-fixture'],zh:['ChsService2','zh-fixture']};
 const categories=[['12','76'],['14','78'],['15','85'],['28','75'],['32','80'],['38','79'],['39','82']];
 for(const [lang,[service,key]] of Object.entries(services))for(const [type,foreign] of categories){expected={service,key,foreign:lang==='ko'?type:foreign};const r=await get(request({lang,type,mode:'nearby',longitude:'129.0756',latitude:'35.1796'}));assert.equal(r.status,200);const d=await r.json();assert.equal(d.language,lang);assert.equal(d.items[0].type,type);}
});
test('detail and photo calls keep the selected language and content ID',async()=>{
 let captured;const get=await route(async value=>{captured=new URL(value);return Response.json(payload('78'));});
 for(const [lang,service] of [['en','EngService2'],['ja','JpnService2'],['zh','ChsService2']])for(const mode of ['detail','images']){const r=await get(request({lang,mode,id:'202'}));assert.equal(r.status,200);assert.ok(captured.pathname.includes('/'+service+'/'));assert.equal(captured.searchParams.get('contentId'),'202');assert.equal((await r.json()).language,lang);}
});
test('a missing foreign key never falls back to Korean; invalid languages are rejected',async()=>{
 let calls=0;const get=await route(async()=>{calls++;return Response.json(payload('12'));},{TOUR_API_KEY:'ko-fixture'});
 let r=await get(request({lang:'en',mode:'detail',id:'202'}));assert.equal(r.status,503);let d=await r.json();assert.equal(d.code,'TOUR_NOT_CONFIGURED');assert.match(d.error,/TOUR_API_KEY_EN/);assert.equal(calls,0);
 r=await get(request({lang:'zh-TW',mode:'detail',id:'202'}));assert.equal(r.status,400);assert.equal(calls,0);
 r=await get(request({lang:'ja',mode:'nearby',type:'25'}));assert.equal(r.status,422);assert.equal(calls,0);
});
test('existing requests without a language still use the Korean service',async()=>{
 const get=await route(async value=>{assert.ok(new URL(value).pathname.includes('/KorService2/'));return Response.json(payload('12'));});
 const r=await get(request({mode:'nearby',longitude:'127',latitude:'37'}));assert.equal(r.status,200);assert.equal((await r.json()).language,'ko');
});

test('nearby all retrieves every page before returning, deduplicates and keeps legacy single-page requests',async()=>{
 const calls=[];let active=0,maxActive=0;
 const get=await route(async value=>{const u=new URL(value),page=Number(u.searchParams.get('pageNo')),size=Number(u.searchParams.get('numOfRows'));calls.push(page);active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,5));active--;const total=465;const data=payload('12');data.response.body={totalCount:total,numOfRows:size,items:{item:Array.from({length:Math.min(size,total-(page-1)*size)},(_,i)=>({contentid:String((page-1)*size+i+1),contenttypeid:'12',title:'Place'}))}};return Response.json(data);});
 const response=await get(request({mode:'nearby',lang:'ko',longitude:'127',latitude:'37',all:'1'}));const data=await response.json();assert.equal(response.status,200);assert.equal(data.items.length,465);assert.equal(data.complete,true);assert.deepEqual(calls,[1,2,3,4,5]);assert.ok(maxActive<=4);
 calls.length=0;const old=await (await get(request({mode:'nearby',longitude:'127',latitude:'37'}))).json();assert.equal(old.items.length,20);assert.deepEqual(calls,[1]);
});
test('failed later pages never masquerade as a complete list',async()=>{
 const get=await route(async value=>{const u=new URL(value);if(u.searchParams.get('pageNo')!=='1')return new Response('',{status:503});const d=payload('12');d.response.body.totalCount=101;d.response.body.numOfRows=100;d.response.body.items.item=Array.from({length:100},(_,i)=>({contentid:String(i+1)}));return Response.json(d);});
 const res=await get(request({mode:'nearby',longitude:'127',latitude:'37',all:'1'}));assert.equal(res.status,502);const data=await res.json();assert.equal(data.complete,undefined);assert.equal(data.items,undefined);
});
