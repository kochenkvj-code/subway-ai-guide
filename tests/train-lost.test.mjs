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
const {findLiveCandidates,reachableTrainStations,expectedLiveDirection,stationNeighbors,supportsStation,trainStationKey,followStops,directionalPathToStation}=moduleUnderTest.namespace;

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
test('current line-4 names resolve the same topology and directions without changing line-7 Isu',()=>{
 assert.deepEqual(stationNeighbors('4','불암산'),stationNeighbors('4','당고개'));
 assert.deepEqual(stationNeighbors('4','총신대입구'),stationNeighbors('4','이수'));
 assert.equal(expectedLiveDirection('4','총신대입구','사당'),expectedLiveDirection('4','이수','사당'));
 assert.equal(trainStationKey('7','이수'),'이수');assert.equal(supportsStation('7','총신대입구'),false);
});
test('all selectable master stations have topology, while external line-8 stations are routing-only',async()=>{
 const master=JSON.parse(await readFile(new URL('../app/data/seoulMetroStationMaster.json',import.meta.url),'utf8'));
 const missing=master.stations.filter(s=>!supportsStation(s.line,s.names.ko));
 assert.deepEqual(missing.map(s=>s.stationCode),[]);
 assert.deepEqual(stationNeighbors('8','암사역사공원'),['장자호수공원','암사']);
 assert.equal(master.stations.filter(s=>s.line==='8').length,19);
 const externallyOperated=['장자호수공원','구리','동구릉','다산','별내'];
 for(const name of externallyOperated){
  assert.equal(supportsStation('8',name),true);
  assert.equal(master.stations.some(s=>s.line==='8'&&s.names.ko===name),false);
 }
});
test('line 8 extends toward Byeollae from both Seoul Metro boundary stations',()=>{
 assert.deepEqual(stationNeighbors('8','암사'),['암사역사공원','천호']);
 assert.equal(expectedLiveDirection('8','암사','암사역사공원'),'0');
 assert.equal(expectedLiveDirection('8','암사','천호'),'1');
 assert.equal(expectedLiveDirection('8','암사역사공원','장자호수공원'),'0');
 assert.equal(expectedLiveDirection('8','암사역사공원','암사'),'1');
 assert.equal(expectedLiveDirection('8','별내','다산'),'1');
 assert.deepEqual(followStops('8','암사','암사역사공원',8).stops,
  ['암사역사공원','장자호수공원','구리','동구릉','다산','별내']);
 assert.equal(reachableTrainStations('8','암사','암사역사공원').distances.get('별내').distance,6);
 assert.equal(reachableTrainStations('8','암사역사공원','암사').distances.get('모란').distance,18);
 assert.equal(trainStationKey('8','천호(풍납토성)'),'천호');
 assert.equal(trainStationKey('8','몽촌토성(평화의문)'),'몽촌토성');
 assert.equal(trainStationKey('8','남한산성입구(성남법원,검찰청)'),'남한산성입구');
});
test('line 8 lost-train matching recognizes a position beyond the operating boundary',()=>{
 const when=Date.parse('2026-10-31T18:20:00+09:00');
 const result=findLiveCandidates([{
  trainNo:'8088',line:'8',station:'구리',direction:'0',
  receivedAt:new Date(when).toISOString(),express:false,status:'1'
 }],{date:'2026-10-31',time:'18:12',line:'8',station:'암사',next:'암사역사공원',now:when});
 assert.equal(result.candidates[0]?.number,'8088');
 assert.equal(result.candidates[0]?.stopsFromAlight,3);
});
test('renamed provider positions are matched under their actual line and train number',()=>{
 const dir=expectedLiveDirection('4','상계','당고개');
 const result=findLiveCandidates([{trainNo:'0123',line:'4',station:'불암산',direction:dir,receivedAt:new Date(now).toISOString(),express:false}],{now,date,time:'18:18',line:'4',station:'상계',next:'당고개'});
 assert.equal(result.candidates.length,1);assert.equal(result.candidates[0].number,'0123');
});

test('line 6 one-way loop directions are explicit and reject reversed choices',()=>{
 const pairs=[['응암','역촌'],['역촌','불광'],['불광','독바위'],['독바위','연신내'],['연신내','구산'],['구산','응암']];
 for(const [from,to] of pairs)assert.equal(expectedLiveDirection('6',from,to),'1',from+' → '+to);
 for(const [from,to] of [['역촌','응암'],['불광','역촌'],['독바위','불광'],['연신내','독바위'],['구산','연신내'],['응암','구산']])
  assert.equal(expectedLiveDirection('6',from,to),null,'reverse: '+from+' → '+to);
 assert.equal(expectedLiveDirection('6','새절','응암'),'0');
 assert.equal(expectedLiveDirection('6','응암','새절'),'1');
 assert.deepEqual(followStops('6','역촌','불광',4).stops,['불광','독바위','연신내','구산']);
 const stations=reachableTrainStations('6','역촌','불광');
 assert.equal(stations.distances.get('구산').distance,4);
 const fromGusan=reachableTrainStations('6','구산','응암');
 assert.equal(fromGusan.distances.get('새절').distance,2);
});


test('Jongno 3-ga toward Jonggak can reach Yeokgok through the Guro Incheon branch',()=>{
 const line='1',origin='종로3가',next='종각';
 const reach=reachableTrainStations(line,origin,next);
 assert.equal(reach.distances.get('역곡').distance,16);
 assert.equal(reach.distances.get('역곡').branched,true);
 const straight=followStops(line,origin,next,38);
 assert.equal(straight.stops.at(-1),'구로');
 assert.equal(straight.stops.includes('역곡'),false,'legacy rail stopped at the fork');
 const path=directionalPathToStation(line,origin,next,'역곡');
 assert.equal(path[0],origin);
 assert.equal(path.at(-1),'역곡');
 assert.deepEqual(path.slice(path.indexOf('구로'),path.indexOf('개봉')+1),['구로','구일','개봉']);
 assert.ok(path.includes('온수'));
 assert.ok(path.every((st,i)=>i===0||expectedLiveDirection(line,path[i-1],st)==='1'));
});

test('branch-specific rail cannot draw opposite, invalid or reversed paths',()=>{
 assert.deepEqual(directionalPathToStation('1','종로3가','종각','청량리'),[]);
 assert.deepEqual(directionalPathToStation('1','종로3가','종로5가','역곡'),[]);
 assert.deepEqual(directionalPathToStation('1','종로3가','종각','없는역'),[]);
 const incheon=directionalPathToStation('1','종로3가','종각','역곡');
 const suwon=directionalPathToStation('1','종로3가','종각','금천구청');
 assert.ok(incheon.includes('구일'));
 assert.ok(!incheon.includes('가산디지털단지'));
 assert.ok(suwon.includes('가산디지털단지'));
 assert.ok(!suwon.includes('구일'));
});

test('branch candidates and navigation use the same directional topology',async()=>{
 const diagram=await readFile(new URL('../app/v2/TrainLiveDiagram.jsx',import.meta.url),'utf8');
 assert.match(diagram,/directionalPathToStation\(line,station,next,focusStation,38\)/);
 assert.match(diagram,/directionalPathToStation\(line,station,next,p\.station,38\)/);
 assert.match(diagram,/setFocusedTrain\(key\)/);
 assert.match(diagram,/const focusedStation=focusedPosition\?\.station\|\|''/);
 assert.match(diagram,/const path=useMemo\(\(\)=>mapStations\(line,station,next,focusedStation\)/);
 assert.match(diagram,/the effect above centers it afterwards/);
 assert.doesNotMatch(diagram,/displayed\.has\(clean\(p\.station\)\)\)\s*\)\.filter\(Boolean\)/);
});
