import test from 'node:test';
import assert from 'node:assert/strict';
import {HOME_CHAT_HANDOFF_KEY,HOME_CHAT_HANDOFF_PARAM,isIOSPhone,stageHomeChatHandoff,takeHomeChatHandoff} from '../app/v2/home-chat-handoff.js';

const storage=()=>{
 const values=new Map();
 return {
  getItem:key=>values.has(key)?values.get(key):null,
  setItem:(key,value)=>values.set(key,String(value)),
  removeItem:key=>values.delete(key),
 };
};

test('fresh-page chat handoff is targeted to iPhones',()=>{
 assert.equal(isIOSPhone('Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'),true);
 assert.equal(isIOSPhone('Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'),false);
 assert.equal(isIOSPhone('Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15 Safari/605.1.15'),false);
 assert.equal(isIOSPhone('Mozilla/5.0 (Linux; Android 15; Mobile)'),false);
 assert.equal(HOME_CHAT_HANDOFF_PARAM,'chatHandoff');
});

test('handoff carries a multilingual user question once without putting text in URL',()=>{
 const s=storage(),token='example-token',question='新羅ホテルまでの行き方를 알려주세요';
 stageHomeChatHandoff(s,token,question,1000);
 assert.equal(s.getItem(HOME_CHAT_HANDOFF_KEY)?.includes(question),true);
 assert.equal(takeHomeChatHandoff(s,token,2000),question);
 assert.equal(s.getItem(HOME_CHAT_HANDOFF_KEY),null);
 assert.equal(takeHomeChatHandoff(s,token,2200),null,'no repeated AI request on reload');
});

test('unrelated or expired handoffs are never sent',()=>{
 const s=storage();
 stageHomeChatHandoff(s,'one','hello',1000);
 assert.equal(takeHomeChatHandoff(s,'other',1200),null);
 assert.equal(s.getItem(HOME_CHAT_HANDOFF_KEY),null);
 stageHomeChatHandoff(s,'one','hello',1000);
 assert.equal(takeHomeChatHandoff(s,'one',47001),null);
 stageHomeChatHandoff(s,'one','hello',10000);
 assert.equal(takeHomeChatHandoff(s,'one',0),null);
});

test('blocked same-tab storage fails closed, so UI can use its normal fallback',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
 assert.throws(()=>stageHomeChatHandoff(blocked,'id','x'),/blocked/);
 assert.equal(takeHomeChatHandoff(blocked,'id'),null);
});

import {HOME_KEYBOARD_RESET_PARAM,HOME_KEYBOARD_RESET_KEY,needsHomeDocumentReset,stageHomeKeyboardReset,takeHomeKeyboardReset} from '../app/v2/home-chat-handoff.js';
test('iPhone home keyboard Done resets any subsequent menu document, but ordinary navigation remains SPA',()=>{
 const input={userAgent:'iPhone Safari',view:'home',next:'timetable',keyboardUsed:true};
 assert.equal(needsHomeDocumentReset(input),true);
 for(const next of ['live','facility','route','chat','lost'])assert.equal(needsHomeDocumentReset({...input,next}),true);
 for(const over of [{keyboardUsed:false},{userAgent:'iPad'},{userAgent:'Android'},{next:'home'},{view:'route'},{keepHomeScroll:true},{routeQuery:'서울역'}])assert.equal(needsHomeDocumentReset({...input,...over}),false);
 assert.equal(HOME_KEYBOARD_RESET_PARAM,'keyboardReset');
});
test('keyboard reset draft is private, single use and expires without triggering chat',()=>{
 const s=storage();
 stageHomeKeyboardReset(s,'nonce','서울역 가는 법',1000);
 assert.equal(takeHomeKeyboardReset(s,'nonce',1100),'서울역 가는 법');
 assert.equal(s.getItem(HOME_KEYBOARD_RESET_KEY),null);
 assert.equal(takeHomeKeyboardReset(s,'nonce',1200),null);
 stageHomeKeyboardReset(s,'old','draft',1000);
 assert.equal(takeHomeKeyboardReset(s,'old',47000),null);
 stageHomeKeyboardReset(s,'old','draft',1000);
 assert.equal(takeHomeKeyboardReset(s,'different',2000),null);
});
