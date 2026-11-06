import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../app/lib/raw-arrival-groups.js',import.meta.url),'utf8');
const module=new vm.SourceTextModule(source);
await module.link(()=>{throw Error('unexpected dependency');});
await module.evaluate();
const {rawArrivalGroups}=module.namespace;
const station={subwayId:'1008'};
const make=(dir,ordkey,message,changes={})=>({subwayId:'1008',updnLine:dir,ordkey,arvlCd:'1',barvlDt:'0',arvlMsg2:message,arvlMsg3:'석촌',recptnDt:'2026-11-06 17:48:44',trainLineNm:'별내행 - 잠실방면',...changes});

test('line 8: retain all four raw 0-second provider messages in ordkey buckets',()=>{
 const rows=[
  make('상행','01000별내0','석촌 도착'),
  make('상행','02003별내0','[3]번째 전역 (문정)'),
  make('하행','11001모란0','전역 도착'),
  make('하행','12004모란0','[4]번째 전역 (천호)'),
  make('상행','01000별내0','다른 노선',{subwayId:'1002'})
 ];
 const groups=rawArrivalGroups({realtimeArrivalList:rows},station);
 assert.deepEqual(groups.map(g=>g.provider),['상행','하행']);
 assert.deepEqual(groups.map(g=>[g.first.length,g.second.length]),[[1,1],[1,1]]);
 assert.equal(groups[0].second[0].arvlMsg2,'[3]번째 전역 (문정)');
 assert.equal(groups[0].second[0].barvlDt,'0');
});
test('do not drop departed, old, duplicated, or unranked provider records',()=>{
 const a=make('상행','01000별내0','남한산성입구 출발',{arvlCd:'2',recptnDt:'2020-01-01 00:00:00'});
 const b=make('상행','01000별내0','남한산성입구 출발',{arvlCd:'2'});
 const c=make('상행','','서버 원문');
 const groups=rawArrivalGroups({realtimeArrivalList:[a,b,c]},station);
 assert.equal(groups[0].first.length,2);
 assert.equal(groups[0].other.length,1);
 assert.equal(groups[0].first[0].recptnDt,'2020-01-01 00:00:00');
});
