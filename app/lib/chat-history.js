// Browser-tab memory only. Never include static cards, errors, loading text,
// language markers, grounding HTML or other users' records as model history.
export const HISTORY_TTL_MS = 5 * 60 * 1000;
export const MAX_HISTORY_MESSAGES = 2;
export const MAX_HISTORY_CHARS = 3000;
export function buildChatHistory(messages, {scope=0,now=Date.now()}={}) {
  const lastIndex=messages.findLastIndex(message=>message.chatTurn && message.contextScope===scope);
  if(lastIndex<0)return {history:[],historyCompletedAt:null};
  const answer=messages[lastIndex];
  if(answer.role!=="assistant" || answer.pending || answer.error || !answer.generalChat || !Number.isFinite(answer.completedAt) || now<answer.completedAt || now-answer.completedAt>HISTORY_TTL_MS)return {history:[],historyCompletedAt:null};
  const question=messages.slice(0,lastIndex).findLast(message=>message.chatTurn && message.contextScope===scope);
  if(!question || question.role!=="user" || !question.generalChat)return {history:[],historyCompletedAt:null};
  return {history:[{role:"user",text:(question.contextText||question.text).slice(0,500)},{role:"assistant",text:answer.text.slice(0,2500)}],historyCompletedAt:answer.completedAt};
}
export function validateChatHistory(value, completedAt, now=Date.now()) {
  if(value===undefined)return [];
  if(!Array.isArray(value)||![0,MAX_HISTORY_MESSAGES].includes(value.length))throw new Error("Invalid conversation history");
  let total=0;
  const result=value.map((message,index)=>{
    const role=index===0?"user":"assistant";
    if(!message||message.role!==role||typeof message.text!=="string"||!message.text.trim()||message.text.length>(role==="user"?500:2500))throw new Error("Invalid conversation history");
    total+=message.text.length;
    if(total>MAX_HISTORY_CHARS)throw new Error("Conversation history too long");
    return {role:role==="assistant"?"model":"user",parts:[{text:message.text}]};
  });
  // Independently enforce freshness at the API. Bad clocks or stale requests
  // fall back to a normal single-turn question, rather than failing the answer.
  if(result.length && (!Number.isFinite(completedAt)||now<completedAt||now-completedAt>HISTORY_TTL_MS))return [];
  return result;
}
