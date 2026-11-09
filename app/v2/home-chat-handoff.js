// iPhone WebKit can retain stale hit-test offsets when a keyboard-heavy home
// view swaps to a fixed chat workspace within the same document. Only the
// iPhone home composer uses a fresh page, carrying the question in short-lived
// same-tab storage instead of exposing it in the URL.
export const HOME_CHAT_HANDOFF_KEY='subway:v2:home-chat-handoff';
export const HOME_CHAT_HANDOFF_PARAM='chatHandoff';

export function isIOSPhone(userAgent){
 return /iPhone|iPod/i.test(String(userAgent||''));
}

export function stageHomeChatHandoff(storage,token,question,now=Date.now()){
 storage.setItem(HOME_CHAT_HANDOFF_KEY,JSON.stringify({token,question,at:now}));
}

export function takeHomeChatHandoff(storage,token,now=Date.now()){
 let raw;
 try{
  raw=storage.getItem(HOME_CHAT_HANDOFF_KEY);
  storage.removeItem(HOME_CHAT_HANDOFF_KEY);
 }catch{return null;}
 if(!raw)return null;
 let value;
 try{value=JSON.parse(raw);}catch{return null;}
 if(!value||value.token!==token||typeof value.question!=='string'||!value.question.trim())return null;
 if(!Number.isFinite(value.at)||now<value.at-5000||now-value.at>45000)return null;
 return value.question.trim();
}
