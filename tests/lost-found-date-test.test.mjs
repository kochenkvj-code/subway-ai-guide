import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';

const fixed=Date.parse('2026-11-12T04:00:00Z');
class Clock extends Date{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}}
const record=(id,place='아차산역',date='20261111',status='')=>({atcId:id,fdSn:'1',fdPrdtNm:'습득 지갑',depPlace:place,fdYmd:date,csteSteNm:status,prdtClNm:'지갑'});
const xml=(records,total=records.length,num=100)=>'<response><header><resultCode>00</resultCode></header><body><items>'+records.map(row=>'<item>'+Object.entries(row).map(([key,value])=>'<'+key+'>'+value+'</'+key+'>').join('')+'</item>').join('')+'</items><totalCount>'+total+'</totalCount><numOfRows>'+num+'</numOfRows></body></response>';
async function service(fetch,env={LOST112_PORTAL_API_KEY:'test-key'}){
 const ctx=vm.createContext({Date:Clock,URL,Response,AbortSignal,Map,Set,Promise,JSON,Number,String,RegExp,process:{env},fetch});
 const loaded=new Map();
 async function load(file){
  file=path.resolve(file);
  if(loaded.has(file))return loaded.get(file);
  const raw=await fs.readFile(file,'utf8');
  const module=file.endsWith('.json')
   ?new vm.SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(raw));},{context:ctx,identifier:file})
   :new vm.SourceTextModule(raw,{context:ctx,identifier:file});
  loaded.set(file,module);
  return module;
 }
 const api=await load('app/api/v2/lost-found-date-test/route.js');
 await api.link((name,importer)=>load(path.resolve(path.dirname(importer.identifier),name.endsWith('.json')?name:name+'.js')));
 await api.evaluate();
 return query=>api.namespace.GET({url:'http://localhost/api/v2/lost-found-date-test?'+new URLSearchParams(query)});
}
test('date-first test uses region and exact 30-day dates, never agency-name search',async()=>{
 const requests=[];
 const get=await service(async url=>{requests.push(url);return new Response(xml([
  record('A'),record('B','아차산파출소'),record('C','아차산역','20261111','반환완료'),record('D','종로5가역')
 ]));});
 const res=await get({station:'2546',days:'30',page:'1'});
 const body=await res.json();
 assert.equal(res.status,200);
 assert.deepEqual(body.items.map(x=>x.id),['A']);
 assert.equal(body.total,4);assert.equal(body.scanned,4);assert.equal(body.matched,2);assert.equal(body.closed,1);
 assert.equal(body.paginationUncertain,false);
 assert.equal(body.start,'2026-10-14');assert.equal(body.end,'2026-11-12');
 const url=requests[0];
 assert.ok(url.pathname.endsWith('getPtLosfundInfoAccToClAreaPd'));
 assert.equal(url.searchParams.get('N_FD_LCT_CD'),'LCA000');
 assert.equal(url.searchParams.get('START_YMD'),'20261014');
 assert.equal(url.searchParams.get('END_YMD'),'20261112');
 assert.equal(url.searchParams.get('numOfRows'),'100');
 assert.equal(url.searchParams.get('pageNo'),'1');
 assert.equal(url.searchParams.has('DEP_PLACE'),false);
 assert.equal(url.searchParams.has('PRDT_NM'),false);
});
test('scan reports page cap instead of pretending that all records were read',async()=>{
 const get=await service(async()=>new Response(xml([record('A')],30000)));
 const body=await (await get({station:'2546',days:'7',page:'1'})).json();
 assert.equal(body.start,'2026-11-06');
 assert.equal(body.totalPages,300);
 assert.equal(body.maxPages,250);
 assert.equal(body.capped,true);
 assert.equal(body.paginationUncertain,true);
 assert.equal((await get({station:'2546',page:'251'})).status,400);
 assert.equal((await get({station:'xxxx'})).status,400);
 assert.equal((await get({days:'90'})).status,400);
});
test('missing upstream key and upstream failure fail closed',async()=>{
 const missing=await service(async()=>new Response(xml([record('A')])),{});
 const answer=await (await missing({})).json();
 assert.equal(answer.error,'API_KEY_MISSING');
 const failure=await service(async()=>new Response('err',{status:503}));
 const failed=await (await failure({})).json();
 assert.equal(failed.error,'UPSTREAM_FAILED');
});
test('test screen iterates pages automatically without changing the existing V2 finder',async()=>{
 const page=await fs.readFile('app/v2/lost-found-date-test/page.jsx','utf8');
 assert.match(page,/for\(let base=2;base<=last;base\+=3\)/);
 assert.match(page,/await Promise\.all\(pages\.map\(retrieve\)\)/);
 assert.match(page,/setStatus\(first\.totalPages>first\.maxPages\?'partial':'done'\)/);
 assert.match(page,/useState\('2546'\)/);
 const current=await fs.readFile('app/v2/lost-found-demo/CompactLostFound.jsx','utf8');
 assert.match(current,/\/api\/v2\/lost-found\?/);
});
