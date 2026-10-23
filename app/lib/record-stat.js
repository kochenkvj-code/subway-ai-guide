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
export function recordStat(event_type, event_name, language) {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/stats/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type, event_name, language, session_id: getVisitSessionId() }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* Statistics must never interrupt the passenger experience. */ }
}
