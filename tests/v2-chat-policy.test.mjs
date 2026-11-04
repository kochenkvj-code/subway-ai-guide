import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMenuRecommendation as parse,buildV2Prompt,recommendationTargets} from '../app/lib/v2-chat-policy.js';
const allowed=['route','facility','live'];
test('only one complete final standalone valid menu is accepted',()=>{
 for(const [raw,answer,id]of [
 ['안내입니다.\n<menu_recommendation>facility</menu_recommendation>','안내입니다.','facility'],
 ['案内です。\n<menu_recommendation>live</menu_recommendation>  \n','案内です。','live'],
 ['Answer\n<menu_recommendation>none</menu_recommendation>','Answer',null],
 ['Answer\n<menu_recommendation>unknown</menu_recommendation>','Answer',null],
 ['Answer\n<menu_recommendation>facility','Answer',null],
 ['Answer\n<menu_reco','Answer',null],
 ['Answer\n<menu_recommendation>facility</menu_recommendation>\nMore text','Answer\nMore text',null],
 ['Answer\n<menu_recommendation>facility</menu_recommendation>\n<menu_recommendation>route</menu_recommendation>','Answer',null],
 ['Answer <menu_recommendation>route</menu_recommendation>','Answer',null],
 ['```xml\n<menu_recommendation>facility</menu_recommendation>\n```','```xml\n<menu_recommendation>facility</menu_recommendation>\n```',null],
 ['> <menu_recommendation>facility</menu_recommendation>','> <menu_recommendation>facility</menu_recommendation>',null],
 ['Answer without metadata','Answer without metadata',null],
 ['Example: `<menu_recommendation>facility</menu_recommendation>`','Example: `<menu_recommendation>facility</menu_recommendation>`',null]
 ])assert.deepEqual(parse(raw,allowed),{answer,recommendedMenu:id});
 assert.equal(parse('Answer\n<menu_recommendation>route</menu_recommendation>',allowed,false).recommendedMenu,null);
 assert.equal(parse('<menu_recommendation>route</menu_recommendation>',allowed).recommendedMenu,null);
});
test('prompt preserves station, language, accuracy and independent-answer policies without Jongno hints',()=>{
 const station={stationCode:'2637',line:'6',names:{ko:'동묘앞'}};
 const text=buildV2Prompt('서울역 화장실?', 'ja',station,'Japanese output rule');
 for(const expected of ['동묘앞','2637','Line 6','Japanese output rule','Google Search','NOT nonexistent','Independently answer','different subject station','Route allows a different origin','not restaurant','first/last'])assert.ok(text.includes(expected),expected);
 for(const forbidden of ['종로5가','광장시장','종오지하'])assert.ok(!text.includes(forbidden));
 assert.ok(!recommendationTargets(station).some(([id])=>id==='gate'));assert.ok(recommendationTargets({...station,stationCode:'0154'}).some(([id])=>id==='gate'));
});
test('transfer-line identity is mandatory for answers, searches and recommendations',()=>{
 for(const [code,line]of [['0159','1'],['2637','6']]){
 const text=buildV2Prompt('수유실 어디예요?','ko',{stationCode:code,line,names:{ko:'동묘앞'}},'한국어');
 for(const rule of [line+'호선 동묘앞역','LINE-SPECIFIC STATION IDENTITY','separate staff','separate station entities',line+'호선 동묘앞 수유실','bare shared station name','useful alternative','transfer access only if verified','button would open the entry line'])assert.ok(text.includes(rule),rule);
 }
});
