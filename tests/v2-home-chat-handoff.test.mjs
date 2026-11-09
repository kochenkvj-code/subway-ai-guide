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
