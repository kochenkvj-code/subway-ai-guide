import test from 'node:test';
import assert from 'node:assert/strict';
import {positionMessage} from '../app/arrival-test/position/message.js';
const message=(stops,state,lang)=>positionMessage({stops,row:{trainSttus:state}},lang);
test('exact compact labels for four languages',()=>{
 for(const [lang,stops,entry,arrived] of [['ko','3 정거장','진입','도착'],['en','3 stops','Arriving','Arrived'],['ja','3駅前','進入中','到着'],['zh','前方3站','进站中','已到站']]){
 assert.equal(message(3,'1',lang),stops);assert.equal(message(0,'0',lang),entry);assert.equal(message(0,'1',lang),arrived);
 }
});
test('remaining stops come only from position, regardless of station status',()=>{
 for(const state of ['0','1','2','3','99'])for(const [lang,one,three] of [['ko','1 정거장','3 정거장'],['en','1 stop','3 stops'],['ja','1駅前','3駅前'],['zh','前方1站','前方3站']]){
 assert.equal(message(1,state,lang),one);assert.equal(message(3,state,lang),three);
 }
 assert.equal(message(0,'3','ko'),'3','an unhandled status must not invent a one-stop distance');
});
