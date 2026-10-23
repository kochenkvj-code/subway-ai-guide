// Ephemeral per-page-load UUID: not persisted in cookies or local storage.
let visitSessionId;
function getVisitSessionId() {
  if (!visitSessionId && typeof crypto !== "undefined" && crypto.randomUUID) visitSessionId = crypto.randomUUID();
  return visitSessionId || null;
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
