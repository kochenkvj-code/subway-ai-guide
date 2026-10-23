export function recordStat(event_type, event_name, language) {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/stats/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type, event_name, language }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* Statistics must never interrupt the passenger experience. */ }
}
