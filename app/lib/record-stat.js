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
export function recordStat(event_type, event_name, language, context = null) {
  if (typeof window === "undefined" || isAnalyticsExcluded()) return;
  try {
    lastEventTime = Math.max(Date.now(), lastEventTime + 1);
    void fetch("/api/stats/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type, event_name, language, session_id: getVisitSessionId(), context, occurred_at: new Date(lastEventTime).toISOString() }),
      keepalive: true,
    }).catch(() => {});
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
