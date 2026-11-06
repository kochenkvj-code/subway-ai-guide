import test from 'node:test';
import assert from 'node:assert/strict';
import {positionMessage} from '../app/arrival-test/position/message.js';
const message=(stops,state,lang)=>positionMessage({stops,row:{trainSttus:state}},lang);
test('exact compact labels for four languages',()=>{
 for(const [lang,stops,entry,arrived] of [['ko','3역 전','진입','도착'],['en','3 stops','Arriving','Arrived'],['ja','3駅前','進入中','到着'],['zh','前方3站','进站中','已到站']]){
 assert.equal(message(3,'1',lang),stops);assert.equal(message(0,'0',lang),entry);assert.equal(message(0,'1',lang),arrived);
 }
});
test('previous station departures are one stop away, not selected station departures',()=>{
 assert.equal(message(1,'2','ko'),'1역 전');assert.equal(message(0,'3','ko'),'1역 전');
 assert.equal(message(1,'2','en'),'1 stops');assert.equal(message(0,'3','ja'),'1駅前');
});
