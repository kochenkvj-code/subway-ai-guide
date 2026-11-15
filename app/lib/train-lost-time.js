// Alighting inputs contain hours/minutes only. Treat the whole 30th minute
// as in range; reject from 31:00 onward. Keep the exact future tolerance.
export function isWithinLiveWindow(elapsed) {
  return Number.isFinite(elapsed) && elapsed >= -120000 &&
    Math.floor(elapsed / 60000) <= 30;
}

// An early-morning manual time may refer to the previous calendar day in KST.
// Only infer yesterday when that time is still inside the same live window.
export function kstAlightDateForTime(time, now = Date.now()) {
  const kstDate = at => new Date(at + 9 * 3600000).toISOString().slice(0, 10);
  const today = kstDate(now);
  const todayMs = Date.parse(today + 'T' + time + ':00+09:00');
  if (todayMs > now + 60000) {
    const yesterday = kstDate(now - 24 * 3600000);
    const yesterdayMs = Date.parse(yesterday + 'T' + time + ':00+09:00');
    if (isWithinLiveWindow(now - yesterdayMs)) return yesterday;
  }
  return today;
}
