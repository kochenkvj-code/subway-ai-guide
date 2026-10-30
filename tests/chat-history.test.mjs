import test from 'node:test';
import assert from 'node:assert/strict';
import {buildChatHistory,validateChatHistory,HISTORY_TTL_MS} from '../app/lib/chat-history.js';
const completedAt=1000000;
const pair=(q='question',a='answer',scope=0,time=completedAt)=>[
 {role:'user',text:q,chatTurn:true,generalChat:true,contextScope:scope},
 {role:'assistant',text:a,chatTurn:true,generalChat:true,contextScope:scope,completedAt:time}
];
test('only the most recent pair survives UI-only language markers',()=>{
 const messages=[...pair('old','old answer'),{role:'assistant',gateMenu:true},...pair('new','new answer'),{role:'system',languageChange:true,text:'日本語'}];
 const result=buildChatHistory(messages,{now:completedAt+1});
 assert.deepEqual(result.history,[{role:'user',text:'new'},{role:'assistant',text:'new answer'}]);
 assert.equal(result.historyCompletedAt,completedAt);
});
test('TTL starts at answer completion; scope changes, future clocks and errors clear context',()=>{
 assert.equal(buildChatHistory(pair(),{now:completedAt+HISTORY_TTL_MS}).history.length,2);
 for(const options of [{now:completedAt+HISTORY_TTL_MS+1},{now:completedAt-1},{now:completedAt,scope:1}])assert.equal(buildChatHistory(pair(),options).history.length,0);
 assert.equal(buildChatHistory([...pair(),{role:'assistant',chatTurn:true,contextScope:0,generalChat:true,error:true}],{now:completedAt}).history.length,0);
 assert.equal(buildChatHistory([{role:'assistant',text:'static card'}],{now:completedAt}).history.length,0);
});
test('bounded content is independent per browser data set, and transient/static content is excluded',()=>{
 const result=buildChatHistory(pair('Q'.repeat(1000),'A'.repeat(5000)),{now:completedAt});
 assert.equal(result.history[0].text.length,500);assert.equal(result.history[1].text.length,2500);
 assert.equal(buildChatHistory([],{now:completedAt}).history.length,0);
 assert.equal(buildChatHistory(pair().map(m=>({...m,generalChat:false})),{now:completedAt}).history.length,0);
});
test('API independently validates role order, size and freshness',()=>{
 const history=[{role:'user',text:'Q'},{role:'assistant',text:'A'}];
 assert.deepEqual(validateChatHistory(history,completedAt,completedAt+1).map(m=>m.role),['user','model']);
 assert.deepEqual(validateChatHistory(history,completedAt,completedAt+HISTORY_TTL_MS+1),[]);
 assert.deepEqual(validateChatHistory(history,undefined,completedAt),[]);
 assert.throws(()=>validateChatHistory([...history,...history],completedAt,completedAt));
 assert.throws(()=>validateChatHistory([{role:'system',text:'bad'},history[1]],completedAt,completedAt));
 assert.throws(()=>validateChatHistory([{role:'user',text:'Q'.repeat(501)},history[1]],completedAt,completedAt));
});
