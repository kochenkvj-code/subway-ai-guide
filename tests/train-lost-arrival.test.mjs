import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
async function handler(fetch){
 const context=vm.createContext({Response,URL,AbortSignal,Date,process:{env:{SEOUL_SUBWAY_ARRIVAL_API_KEY:'fixture'}},fetch});const cache=new Map();
 async function load(file){if(cache.has(file))return cache.get(file);const source=await fs.readFile(file,'utf8');const m=file.endsWith('.json')?new vm.SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(source));},{context}):new vm.SourceTextModule(source,{context});cache.set(file,m);await m.link(name=>load(path.resolve(path.dirname(file),name.endsWith('.json')?name:name+'.js')));return m;}
 const m=await load(path.resolve('app/api/v2/train-lost/arrival/route.js'));await m.evaluate();return m.namespace.GET;
}
test('arrival evidence accepts verified current/old station aliases and rejects another line',async()=>{
 for(const [station,queryName,reported]of [['불암산','불암산','당고개'],['당고개','불암산','불암산'],['총신대입구','총신대입구(이수)','이수']]){
  const get=await handler(async url=>{assert.equal(decodeURIComponent(new URL(url).pathname.split('/').pop()),queryName);const row={subwayId:'1004',statnNm:reported,btrainNo:'0123',updnLine:'하행',arvlCd:'99',recptnDt:new Date(Date.now()+9*3600000).toISOString().slice(0,19).replace('T',' ')};return Response.json({realtimeArrivalList:[row,{...row,subwayId:'1007'},{...row,statnNm:'종로5가'}]});});
  const r=await get({url:'https://app.test/api/v2/train-lost/arrival?line=4&station='+encodeURIComponent(station)});assert.equal(r.status,200);const d=await r.json();assert.equal(d.evidence.length,1);assert.equal(d.evidence[0].station,station);assert.equal(d.evidence[0].trainNo,'0123');
 }
});
