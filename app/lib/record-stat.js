import { isAnalyticsExcluded } from './analytics-preference';
// Anonymous ID scoped to a browser tab. Survives reloads, not tab closure.
const SESSION_KEY = "subway_ai_guide_visit_session";
let visitSessionId;
function getVisitSessionId() {
  if (visitSessionId) return visitSessionId;
  if (typeof window === "undefined" || !window.crypto?.randomUUID) return null;
  try {
    const saved = window.sessionStorage.getItem(SESSION_KEY);
    if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved)) {
      visitSessionId = saved;
      return visitSessionId;
    }
    visitSessionId = window.crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, visitSessionId);
  } catch {
    // Storage may be blocked; keep analytics non-blocking.
    visitSessionId = window.crypto.randomUUID();
  }
  return visitSessionId;
}
// Successful DB acknowledgements remove entries; uncertain deliveries keep the
// same UUID across retries/reloads so the server can ignore duplicate writes.
const QUEUE_KEY = "subway_ai_guide_pending_events_v1";
const MAX_AGE = 30 * 60 * 1000;
const MAX_PENDING = 100;
const MAX_IN_FLIGHT = 4;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let lastEventTime = 0;
const pendingEvents = new Map();
let initialized = false, retryTimer = null, inFlight = 0;
function persistQueue() {
  try {
    if (!pendingEvents.size) window.sessionStorage.removeItem(QUEUE_KEY);
    else window.sessionStorage.setItem(QUEUE_KEY, JSON.stringify([...pendingEvents.values()].map(({body,queuedAt})=>({body,queuedAt}))));
  } catch { /* Blocked/full storage falls back to the in-memory queue. */ }
}
function pruneQueue() {
  const now=Date.now();
  for(const [id,item] of pendingEvents) if(now-item.queuedAt>=MAX_AGE || item.queuedAt>now+300000) pendingEvents.delete(id);
}
function clearQueue() {
  pendingEvents.clear();
  if(retryTimer!==null)clearTimeout(retryTimer);
  retryTimer=null;persistQueue();
}
function scheduleRetry() {
  if(retryTimer!==null)clearTimeout(retryTimer);
  retryTimer=null;
  if(!pendingEvents.size)return;
  const now=Date.now();
  const due=Math.min(...[...pendingEvents.values()].map(item=>Math.min(item.queuedAt+MAX_AGE,item.sending?Infinity:item.nextAttemptAt)));
  retryTimer=setTimeout(()=>{retryTimer=null;flushQueue();},Math.max(1000,due-now));
}
function flushQueue(force=false) {
  if(isAnalyticsExcluded()){clearQueue();return;}
  pruneQueue();persistQueue();
  const now=Date.now();
  for(const [id,item] of pendingEvents){
    if(inFlight>=MAX_IN_FLIGHT)break;
    if(!item.sending && (force||item.nextAttemptAt<=now))void sendEvent(id);
  }
  scheduleRetry();
}
function initializeQueue() {
  if(initialized)return;
  initialized=true;
  if(!isAnalyticsExcluded())try {
    const raw=window.sessionStorage.getItem(QUEUE_KEY);
    const saved=raw&&raw.length<=250000?JSON.parse(raw):[];
    if(Array.isArray(saved))for(const item of saved.slice(0,MAX_PENDING)){
      if(typeof item?.body!=="string"||item.body.length>8192||!Number.isFinite(item.queuedAt))continue;
      try {
        const body=JSON.parse(item.body),time=Date.parse(body.occurred_at);
        if(!UUID.test(body.event_id)||body.session_id!==getVisitSessionId()||!Number.isFinite(time)||Date.now()-time>=MAX_AGE||Date.now()-item.queuedAt>=MAX_AGE||time>Date.now()+300000||item.queuedAt>Date.now()+300000)continue;
        pendingEvents.set(body.event_id,{body:item.body,queuedAt:item.queuedAt,nextAttemptAt:0,attempts:0,sending:false});
        lastEventTime=Math.max(lastEventTime,time);
      }catch{ /* Discard malformed entries individually. */ }
    }
  }catch{ /* No persistence is required to use the guide. */ }
  window.addEventListener("online",()=>flushQueue(true));
  window.addEventListener("pageshow",()=>flushQueue(true));
  window.addEventListener("pagehide",()=>flushQueue(true));
  document.addEventListener("visibilitychange",()=>flushQueue(true));
  const preference=()=>{if(isAnalyticsExcluded())clearQueue();else flushQueue(true);};
  window.addEventListener("analytics-preference-change",preference);
  window.addEventListener("storage",preference);
  flushQueue();
}
async function sendEvent(id) {
  const item=pendingEvents.get(id);
  if(!item||item.sending)return;
  item.sending=true;inFlight++;
  try {
    const response=await fetch("/api/stats/event",{
      method:"POST",headers:{"Content-Type":"application/json"},body:item.body,keepalive:true,
      signal:AbortSignal.timeout(12000),
    });
    // 403 may be a temporary edge challenge; retry it within the retention
    // window. Malformed/unsupported events cannot be repaired by retrying.
    if(response.status===204 || [400,404,405,410,413,422].includes(response.status)) {
      if(pendingEvents.get(id)===item)pendingEvents.delete(id);
    }
  }catch{ /* Keep uncertain deliveries for a later attempt. */ }
  finally {
    item.sending=false;inFlight--;
    item.attempts++;
    item.nextAttemptAt=Date.now()+Math.min(60000,1000*2**Math.min(item.attempts,6));
    flushQueue();
  }
}
export function recordStat(event_type,event_name,language,context=null,question=null) {
  if(typeof window==="undefined")return;
  try {
    initializeQueue();
    if(isAnalyticsExcluded()){clearQueue();return;}
    pruneQueue();
    if(pendingEvents.size>=MAX_PENDING)return;
    lastEventTime=Math.max(Date.now(),lastEventTime+1);
    const event_id=window.crypto.randomUUID();
    const body=JSON.stringify({event_id,event_type,event_name,language,session_id:getVisitSessionId(),context,
      question:(event_type==="ai_question"||event_type==="route_search"&&event_name==="request")&&typeof question==="string"?question.trim().slice(0,500):null,
      occurred_at:new Date(lastEventTime).toISOString()});
    pendingEvents.set(event_id,{body,queuedAt:Date.now(),nextAttemptAt:0,attempts:0,sending:false});
    // Persist before starting any network work, including when going offline.
    persistQueue();flushQueue();
  }catch{ /* Statistics must never interrupt the passenger experience. */ }
}

// One segment per page load, summed by anonymous tab session. Heartbeats update
// that segment rather than creating activity-list events. Out-of-order saves
// cannot reduce the stored total (the database upsert uses greatest).
export function startActivityTracking() {
  if (typeof window === "undefined" || isAnalyticsExcluded() || !window.crypto?.randomUUID) return () => {};
  const session_id=getVisitSessionId(), page_id=window.crypto.randomUUID();
  let total=0, visibleSince=document.visibilityState === "visible" ? performance.now() : null;
  let stopped=false;
  const collect=()=>{
    if(visibleSince!==null){const now=performance.now();total+=Math.max(0,now-visibleSince);visibleSince=now;}
  };
  const save=()=>{
    if(isAnalyticsExcluded())return;
    collect();
    try { void fetch("/api/stats/activity",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id,page_id,visible_ms:Math.min(604800000,Math.floor(total))}),keepalive:true}).catch(()=>{}); } catch {}
  };
  const visibility=()=>{
    collect();
    visibleSince=!isAnalyticsExcluded() && document.visibilityState === "visible" ? performance.now() : null;
    save();
  };
  const hide=()=>{collect();visibleSince=null;save();};
  const show=()=>{if(!isAnalyticsExcluded() && document.visibilityState==="visible")visibleSince=performance.now();};
  const preferenceChanged=()=>{collect();visibleSince=!isAnalyticsExcluded() && document.visibilityState==="visible" ? performance.now() : null;};
  window.addEventListener("storage",preferenceChanged);
  window.addEventListener("analytics-preference-change",preferenceChanged);
  const timer=setInterval(()=>{if(visibleSince!==null)save();},15000);
  document.addEventListener("visibilitychange",visibility);
  window.addEventListener("pagehide",hide);
  window.addEventListener("pageshow",show);
  save();
  return ()=>{if(stopped)return;stopped=true;save();clearInterval(timer);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",hide);window.removeEventListener("pageshow",show);window.removeEventListener("storage",preferenceChanged);window.removeEventListener("analytics-preference-change",preferenceChanged);};
}
