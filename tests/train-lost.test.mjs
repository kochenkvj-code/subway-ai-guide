import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SourceTextModule,SyntheticModule} from 'node:vm';

// Next.js supports JSON imports via Turbopack. Node's native ESM loader
// requires a JSON import attribute, so use a tiny isolated VM module with
// explicit fixtures instead of changing the production bundling semantics.
const file=new URL('../app/lib/train-lost.js',import.meta.url);
const graph=JSON.parse(await readFile(new URL('../app/data/trainLostGraph.json',import.meta.url),'utf8'));
const directions=JSON.parse(await readFile(new URL('../app/data/trainLostDirection.json',import.meta.url),'utf8'));
const source=await readFile(file,'utf8');
const moduleUnderTest=new SourceTextModule(source,{identifier:file.href});
await moduleUnderTest.link(specifier=>{
  const fixture=specifier.endsWith('trainLostGraph.json')?graph:
    specifier.endsWith('trainLostDirection.json')?directions:null;
  if(!fixture)throw Error('Unexpected dependency: '+specifier);
  return new SyntheticModule(['default'],function(){this.setExport('default',fixture);});
});
await moduleUnderTest.evaluate();
const {findLiveCandidates,reachableTrainStations,expectedLiveDirection}=moduleUnderTest.namespace;

const now=Date.parse('2026-10-31T18:20:00+09:00');
const date='2026-10-31',time='18:10',line='1',station='종로5가',next='동대문';
const direction=expectedLiveDirection(line,station,next);
const make=(trainNo,place,options={})=>({
  line,trainNo,station:place,direction,receivedAt:new Date(now).toISOString(),
  express:false,status:'1',...options
});
const search=(positions,options={})=>findLiveCandidates(positions,{
  now,date,time,line,station,next,...options
});
test('ten minutes means about five stations for local trains',()=>{
  const r=search([make('A','청량리'),make('B','동묘앞'),make('C','월계')]);
  assert.equal(r.candidates[0].number,'A');
  assert.equal(r.candidates[0].stopsFromAlight,5);
  assert.ok(Math.abs(r.candidates[0].timeErrorMinutes)<.1);
  assert.equal(r.candidates.some(x=>x.number==='C'),false);
});
test('a wrong-direction train is never a candidate',()=>{
  const opposite=direction==='0'?'1':'0';
  const r=search([make('BAD','청량리',{direction:opposite}),make('OK','청량리')]);
  assert.deepEqual(r.candidates.map(x=>x.number),['OK']);
});
test('stale rows, pre-alighting rows, and duplicate train numbers',()=>{
  const age=m=>new Date(now-m*60000).toISOString();
  const r=search([
    make('STALE','청량리',{receivedAt:age(3)}),
    make('PRE','청량리',{receivedAt:new Date(now-11*60000).toISOString()}),
    make('DUP','동묘앞',{receivedAt:age(1.3)}),
    make('DUP','청량리')
  ]);
  assert.deepEqual(r.candidates.map(x=>x.number),['DUP']);
  assert.equal(r.candidates[0].station,'청량리');
});
test('receipt timestamp is used instead of comparing old snapshot to current clock',()=>{
  const r=search([make('AT_RECEIPT','제기동',{
    receivedAt:new Date(now-2*60000).toISOString()
  })]);
  assert.equal(r.candidates[0].number,'AT_RECEIPT');
  assert.equal(r.candidates[0].stopsFromAlight,4);
  assert.equal(r.candidates[0].timeErrorMinutes,0);
});
test('arrival corroboration requires same train, direction, future station and fresh timestamp',()=>{
  const base=make('TRAIN','청량리');
  const correct={trainNo:'TRAIN',line:'1',station:'회기',directionCode:direction,
    receivedAt:'2026-10-31 18:20:00',arrivalCode:'99'};
  assert.equal(search([base],{arrivalEvidence:[correct]}).candidates[0].corroborated,true);
  assert.equal(search([base],{arrivalEvidence:[{...correct,trainNo:'OTHER'}]}).candidates[0].corroborated,false);
  assert.equal(search([base],{arrivalEvidence:[{...correct,directionCode:direction==='0'?'1':'0'}]}).candidates[0].corroborated,false);
});
test('directionally valid branches are possible but explicitly uncertain',()=>{
  const dir=expectedLiveDirection('5','천호','강동');
  const reach=reachableTrainStations('5','천호','강동');
  assert.equal(reach.ambiguous,true);
  assert.equal(reach.distances.get('길동').distance,2);
  assert.equal(reach.distances.get('둔촌동').distance,2);
  assert.equal(reach.distances.get('길동').branched,true);
  const r=findLiveCandidates([make('FORK','길동',{line:'5',direction:dir})],{
    date:'2026-10-31',time:'18:16',line:'5',station:'천호',next:'강동',now
  });
  assert.equal(r.candidates[0].branched,true);
  assert.equal(r.candidates[0].confidence,'branch-uncertain');
});
test('future alighting, old requests and unsupported directions do not fabricate train numbers',()=>{
  assert.equal(search([make('A','청량리')],{time:'17:00'}).candidates.length,0);
  assert.equal(search([make('A','청량리')],{time:'18:25'}).candidates.length,0);
  assert.equal(search([make('A','청량리')],{next:'nonexistent'}).candidates.length,0);
});
test('express trains have a separate explicitly approximate travel-time model',()=>{
  const r=search([make('FAST','회기',{express:true}),make('LOCAL','청량리')]);
  assert.ok(r.candidates.find(c=>c.number==='FAST')?.minutesPerStop===1.5);
  assert.equal(r.candidates.find(c=>c.number==='LOCAL')?.minutesPerStop,2);
});
