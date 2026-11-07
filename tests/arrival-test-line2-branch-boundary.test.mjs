import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const load=async path=>readFile(new URL(path,root),'utf8');
const graph=JSON.parse(await load('app/data/trainLostGraph.json'));
const directions=JSON.parse(await load('app/data/trainLostDirection.json'));
const source=await load('app/arrival-test/position/groups.js');
const {positionGroups}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const fixture=(line,no,from,dir,dst)=>({
 subwayId:'100'+line,trainNo:no,statnNm:from,updnLine:dir,
 statnTnm:dst,trainSttus:'1',recptnDt:'2026-11-07 11:40:00'
});
const distance=(line,no,from,dir,dst,target)=>{
 const row=fixture(line,no,from,dir,dst);
 const group=positionGroups([row],line,target,graph,directions).groups.find(g=>g.dir===dir);
 return group.candidates[0]?.stops??null;
};

test('line 2 shuttle trains reach their junction but never become main-loop arrivals',()=>{
 const examples=[
  ['성수 지선 → 성수', '1568','용두','0','성수지선','성수',3],
  ['성수 지선 → 용답', '1568','용두','0','성수지선','용답',2],
  ['성수 지선 → 건대입구 제외', '1568','용두','0','성수지선','건대입구',null],
  ['성수 지선 → 뚝섬 제외', '1568','용두','0','성수지선','뚝섬',null],
  ['성수 지선 → 문래 제외', '1568','용두','0','성수지선','문래',null],
  ['신도림 지선 → 신도림', '5569','도림천','1','신도림지선','신도림',1],
  ['신도림 지선 → 대림 제외', '5569','도림천','1','신도림지선','대림',null],
  ['신도림 지선 → 문래 제외', '5569','도림천','1','신도림지선','문래',null],
  ['신도림 지선 → 건대입구 제외', '5569','도림천','1','신도림지선','건대입구',null]
 ];
 for(const [label,no,from,dir,dst,target,expected] of examples)
  assert.equal(distance('2',no,from,dir,dst,target),expected,label);
});
test('departing shuttles cannot be mistaken for main-loop trains',()=>{
 const examples=[
  ['성수 출발 지선 → 용답','1569','성수','1','신설동','용답',1],
  ['성수 출발 지선 → 건대입구 제외','1569','성수','0','신설동','건대입구',null],
  ['신도림 출발 지선 → 도림천','5570','신도림','0','까치산','도림천',1],
  ['신도림 출발 지선 → 대림 제외','5570','신도림','1','까치산','대림',null],
  ['신설동행 지선 → 성수 제외','1565','용답','1','신설동','성수',null]
 ];
 for(const [label,no,from,dir,dst,target,expected] of examples)
  assert.equal(distance('2',no,from,dir,dst,target),expected,label);
});
test('circular main-loop routes continue across Seongsu and Sindorim',()=>{
 const examples=[
  ['성수→건대입구','2102','성수','0','성수종착','건대입구',1],
  ['성수 본선→용답 제외','2102','성수','0','성수종착','용답',null],
  ['신도림→대림','2147','신도림','1','성수종착','대림',1],
  ['신도림 본선→도림천 제외','2147','신도림','1','성수종착','도림천',null],
  ['한양대→성수→건대입구','2130','한양대','0','성수종착','건대입구',3]
 ];
 for(const [label,no,from,dir,dst,target,expected] of examples)
  assert.equal(distance('2',no,from,dir,dst,target),expected,label);
});
test('other lines still show upstream trains even if their destination terminates or branches first',()=>{
 assert.equal(distance('1','1023','동대문','0','동묘앞종착','신설동'),2);
 assert.equal(distance('5','5789','광나루','1','둔촌동종착','길동'),3);
});
test('position grouping preserves upstream API row values without mutating them',()=>{
 const row=fixture('2','1568','용두','0','성수지선'),before=JSON.stringify(row);
 const result=positionGroups([row],'2','성수',graph,directions);
 assert.equal(JSON.stringify(row),before);
 assert.equal(result.groups.find(g=>g.dir==='0').trains[0].row.statnTnm,'성수지선');
});
