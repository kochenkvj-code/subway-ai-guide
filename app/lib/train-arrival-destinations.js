// Resolve the terminus independently from arrival predictions. The arrival API
// sometimes supplies two different termini for the same physical train.
const cache = new Map(), pending = new Map();
const safe = value => String(value ?? '').trim().slice(0, 90);
function timestamp(row) {
  const raw = safe(row.recptnDt), last = safe(row.lastRecptnDt);
  const full = [raw, last].find(s => /^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d+)?$/.test(s));
  if (full) return Date.parse(full.slice(0, 19).replace(' ', 'T') + '+09:00');
  const date = last.match(/^(\d{4}-\d\d-\d\d|\d{8})/), time = raw.match(/^(\d\d:\d\d:\d\d)(?:\.\d+)?$/);
  if (!date || !time) return NaN;
  const d = date[1].length === 8 ? date[1].slice(0,4)+'-'+date[1].slice(4,6)+'-'+date[1].slice(6) : date[1];
  return Date.parse(d + 'T' + time[1] + '+09:00');
}
export function positionDestinations(payload, now = Date.now()) {
  const newest = new Map();
  for (const row of payload.realtimePositionList || []) {
    const at = timestamp(row), train = safe(row.trainNo), destination = safe(row.statnTnm);
    if (!train || !destination || !Number.isFinite(at) || now-at > 180000 || at-now > 60000) continue;
    const direction = String(row.updnLine) === '0' ? '상행' : String(row.updnLine) === '1' ? '하행' : '';
    if (!direction) continue;
    const key = direction + '/' + train, prior = newest.get(key);
    if (!prior || at > prior.at) newest.set(key, {at, destination});
    else if (at === prior.at && destination !== prior.destination) prior.destination = '';
  }
  return Object.fromEntries([...newest].filter(([,row]) => row.destination).map(([key,row]) => [key,row.destination]));
}
export async function loadArrivalDestinations(key, line) {
  if (!key || line !== '1') return {};
  const hit = cache.get(line);
  if (hit && Date.now()-hit.at < 15000) return positionDestinations(hit.payload);
  if (!pending.has(line)) pending.set(line, (async () => {
    try {
      const response = await fetch('http://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimePosition/0/500/'+line+'호선', {cache:'no-store',signal:AbortSignal.timeout(5000)});
      if (!response.ok) return {};
      const payload = await response.json();
      if (!Array.isArray(payload.realtimePositionList)) return {};
      cache.set(line, {at:Date.now(), payload});
      return positionDestinations(payload);
    } catch { return {}; }
    finally { pending.delete(line); }
  })());
  return pending.get(line);
}
