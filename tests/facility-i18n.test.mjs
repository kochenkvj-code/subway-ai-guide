import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadFacilityTranslator} from './helpers/load-facility-i18n.mjs';
const translate=await loadFacilityTranslator();
const corpus=JSON.parse(await readFile(new URL('./fixtures/facility-phrases.json',import.meta.url),'utf8'));

test('289-station actual phrase corpus is fully classified with explicit original fallback in three languages',()=>{
 assert.equal(corpus.stats.stations,289);assert.equal(corpus.stats.records,3710);
 assert.deepEqual(corpus.stats.failed,[]);assert.deepEqual(corpus.stats.partial,[]);
 for(const lang of ['en','ja','zh'])for(const [field,values]of Object.entries(corpus.values))for(const value of Object.keys(values)){
  const result=translate(value,lang,field);
  assert.equal(result.original,value.trim().replace(/\s+/g,' '));
  assert.ok(result.text);
  if(result.untranslated){assert.equal(result.translated,false);assert.equal(result.text,result.original);}
  else if(result.translated)assert.doesNotMatch(result.text,/[가-힣]/,`${lang}: ${value}`);
 }
});
test('exits, basement and connection floors retain numbers; codes are not guessed',()=>{
 assert.equal(translate('1, 2번 출입구 사이','en').text,'Between Exit 1,2');
 const lineLocation=translate('B1 8호선 연결통로방면 게이트 옆','en').text;
 assert.match(lineLocation,/B1 · Line 8/);assert.doesNotMatch(lineLocation,/B18/);
 assert.match(lineLocation,/Beside Gate/);
 assert.equal(translate('B1 ↔ 1F','ja','floorConnection').text,'地下1階 ↔ 1階');
 assert.equal(translate('BM1','zh','floor').text,'BM1');
 assert.equal(translate('지하1층 2번 출입구 부근','en').text,'B1 · Near Exit 2');
 assert.equal(translate('2번 출입구','zh').text,'2号出口');
});
test('station direction and boarding position use documented names and preserve position numbers',()=>{
 assert.equal(translate('종각 방면3-2','en').text,'Toward Jonggak · 3-2');
 assert.match(translate('종각 방면3-2','ja').text,/3-2/);
 assert.equal(translate('새로운 장소 3번 출입구 옆','en').text,'새로운 장소 3번 출입구 옆');
 assert.equal(translate('새로운 장소 3번 출입구 옆','en').untranslated,true);
 assert.equal(translate('대합실(B3))','zh').untranslated,true);
});
test('usage, restroom types, status and brands translate without a provider call',()=>{
 assert.equal(translate('1인가족 단독사용','en','method').text,'One family at a time');
 assert.equal(translate('영업시간내','ja','hours').text,'営業時間内');
 assert.equal(translate('효성티앤에스','zh','provider').text,'Hyosung TNS');
 assert.equal(translate('보수 중','en','status').text,'Under maintenance');
 assert.doesNotMatch(translate('일반(남,여) / 교통약자(남,여)','zh','restroomInfo').text,/[가-힣]/);
 assert.equal(translate('1번 출입구','ko').text,'1번 출입구');
});
