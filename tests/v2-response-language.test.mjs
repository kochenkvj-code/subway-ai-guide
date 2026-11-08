import test from 'node:test';
import assert from 'node:assert/strict';
import {passengerLanguageRule,passengerSystemRule} from '../app/lib/v2-response-language.js';
import {v2ChatFixture} from './v2-chat-api.test.mjs';

test('chat and wayfinding send the same selected-language policy despite Korean input/history',async()=>{
 for(const [lang,name]of [['ko','한국어'],['en','English'],['ja','日本語'],['zh','简体中文']]){
  const rule=passengerLanguageRule(lang),system=passengerSystemRule(lang);
  assert.ok(rule.includes(name));assert.ok(system.includes(name));assert.ok(rule.includes('Do not repeat the Korean input'));
  for(const file of ['app/api/v2/chat/route.js','app/api/v2/route-place-test/route.js']){
   const raw=file.includes('route-place')?'選択言語の案内\n<route_station>동대입구</route_station>\n<menu_recommendation>route</menu_recommendation>':'選択言語の案内\n<menu_recommendation>route</menu_recommendation>';
   const fixture=await v2ChatFixture(raw,file);
   const response=await fixture.run({question:'신라호텔 가는 법',query:'신라호텔',lang,stationCode:'0154',history:[{role:'user',text:'한국어 질문'},{role:'assistant',text:'한국어 이전 답변'}],historyCompletedAt:Date.now()});
   assert.equal(response.status,200,file+' '+lang);assert.equal(fixture.calls.length,1);
   const request=fixture.calls[0].body;
   assert.ok(request.systemInstruction.parts[0].text.includes(system));
   assert.ok(request.contents.at(-1).parts[0].text.includes(rule));
   assert.ok(!request.contents.at(-1).parts[0].text.includes('retaining necessary proper names/signage'));
   assert.deepEqual(request.tools,[{googleSearch:{}}]);
   if(file.includes('route-place'))assert.equal((await response.json()).station.code,'0322');
   else assert.equal(request.contents.length,3,'history remains available without overriding language');
  }
 }
});
