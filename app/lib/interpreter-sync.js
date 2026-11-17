// One coordinator owns refetching and subscription lifetime. No steady polling while subscribed.
export function startInterpreterSync({load,connect,onError=()=>{},onStatus=()=>{},isVisible=()=>true,setTimer=setTimeout,clearTimer=clearTimeout,now=Date.now,expiresAt}){
 let stopped=false,busy=false,again=false,healthy=false,connection=null,reconnecting=false;
 let pollTimer,retryTimer,expiryTimer,watchdog,generation=0;
 async function sync(){
  if(stopped||!isVisible())return;
  if(busy){again=true;return;}
  busy=true;
  try{await load();if(!stopped)onStatus(true);}catch(e){if(!stopped){onError(e);fallback();scheduleRetry();}}
  finally{busy=false;if(again&&!stopped){again=false;void sync();}}
 }
 function fallback(){
  healthy=false;onStatus(false);if(pollTimer!=null)return;
  pollTimer=setTimer(async()=>{pollTimer=null;await sync();if(!stopped&&!healthy)fallback();},8000);
 }
 async function reconnect(){
  if(stopped||reconnecting||!isVisible())return;
  reconnecting=true;clearTimer(retryTimer);retryTimer=null;clearTimer(watchdog);
  const current=++generation;connection?.close();connection=null;
  try{
   const c=await connect({changed:()=>{if(current===generation)void sync();},status:ok=>{
    if(stopped||current!==generation)return;
    healthy=ok;clearTimer(watchdog);
    if(ok){clearTimer(pollTimer);pollTimer=null;clearTimer(retryTimer);retryTimer=null;void sync();}
    else{fallback();scheduleRetry();}
   }});
   if(stopped)c.close();else connection=c;
   if(!healthy)watchdog=setTimer(()=>{fallback();scheduleRetry();},10000);
  }catch{if(!stopped){fallback();scheduleRetry();}}
  finally{reconnecting=false;}
 }
 function scheduleRetry(){if(!stopped&&retryTimer==null)retryTimer=setTimer(()=>{retryTimer=null;void reconnect();},15000);}
 void sync();void reconnect();
 if(expiresAt)expiryTimer=setTimer(()=>void sync(),Math.max(0,Date.parse(expiresAt)-now()+100));
 return {refresh:sync,resume(){void sync();if(!healthy)void reconnect();},stop(){stopped=true;clearTimer(pollTimer);clearTimer(retryTimer);clearTimer(expiryTimer);clearTimer(watchdog);connection?.close();}};
}
