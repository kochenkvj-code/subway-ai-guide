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
let lastEventTime = 0;
const pendingEvents = new Map();
let retryListenerInstalled = false;
async function sendEvent(id) {
  const item = pendingEvents.get(id);
  if (!item || item.sending) return;
  if (isAnalyticsExcluded()) { pendingEvents.delete(id); return; }
  item.sending = true;
  try {
    const response = await fetch("/api/stats/event", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: item.body, keepalive: true,
    });
    if (response.ok || (response.status >= 400 && response.status < 500 && ![408,429].includes(response.status))) {
      pendingEvents.delete(id); return;
    }
  } catch { /* Retry transient network failures without blocking the UI. */ }
  finally { item.sending = false; }
  if (pendingEvents.has(id) && ++item.attempts < 4) {
    setTimeout(() => sendEvent(id), 1000 * 2 ** item.attempts);
  } else pendingEvents.delete(id);
}
export function recordStat(event_type, event_name, language, context = null, question = null) {
  if (typeof window === "undefined" || isAnalyticsExcluded()) return;
  try {
    if (!retryListenerInstalled) {
      retryListenerInstalled = true;
      window.addEventListener("online", () => { for (const id of pendingEvents.keys()) void sendEvent(id); });
    }
    if (pendingEvents.size >= 100) return;
    lastEventTime = Math.max(Date.now(), lastEventTime + 1);
    const event_id = window.crypto.randomUUID();
    const body = JSON.stringify({event_id,event_type,event_name,language,session_id:getVisitSessionId(),context,
      question: event_type === "ai_question" && typeof question === "string" ? question.slice(0,500) : null,
      occurred_at:new Date(lastEventTime).toISOString()});
    pendingEvents.set(event_id, {body,attempts:0,sending:false});
    void sendEvent(event_id);
  } catch { /* Statistics must never interrupt the passenger experience. */ }
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
