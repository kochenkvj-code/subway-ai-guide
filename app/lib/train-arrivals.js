// Seoul's timestamps have no zone suffix; all are Korea Standard Time.
export const ARRIVAL_STALE_MS = 180000;
export const CURRENT_STATION = { name: '종로5가', lineId: '1001', line: '1호선' };
export const ARRIVAL_DIRECTIONS = [
  { id: 'up', provider: '상행', nextStation: '동대문' },
  { id: 'down', provider: '하행', nextStation: '종로3가' },
];
export function receiptTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(value)) return NaN;
  return Date.parse(value.replace(' ', 'T') + '+09:00');
}
const clean = (value, length = 80) => String(value || '').replace(/[<>\u0000-\u001f]/g, '').slice(0, length);
export function normalizeArrivals(payload, now = Date.now()) {
  const rows = Array.isArray(payload.realtimeArrivalList) ? payload.realtimeArrivalList : [];
  let staleCount = 0;
  const groups = ARRIVAL_DIRECTIONS.map(direction => {
    const trains = new Map();
    for (const row of rows) {
      if (String(row.subwayId) !== CURRENT_STATION.lineId || row.statnNm !== CURRENT_STATION.name || row.updnLine !== direction.provider) continue;
      if (String(row.arvlCd) === '2') continue; // Already departed this station.
      const received = receiptTime(row.recptnDt), age = now - received;
      if (!Number.isFinite(received) || age > ARRIVAL_STALE_MS || age < -60000) { staleCount++; continue; }
      const arrivalCode = String(row.arvlCd || '');
      if (['0','1'].includes(arrivalCode) && age > 60000) { staleCount++; continue; }
      const rawSeconds = Number(row.barvlDt);
      const estimatedAt = /^\d+$/.test(String(row.barvlDt)) && rawSeconds > 0 && rawSeconds <= 86400 ? new Date(received + rawSeconds * 1000).toISOString() : null;
      const rank = /^[01][12]/.test(String(row.ordkey)) ? Number(String(row.ordkey)[1]) : 9;
      const train = {
        trainNo: clean(row.btrainNo, 16), destination: clean(row.bstatnNm, 40),
        kind: clean(row.btrainSttus, 16), arrivalCode, receivedAt: new Date(received).toISOString(),
        estimatedAt, message: clean(row.arvlMsg2), location: clean(row.arvlMsg3, 40),
        lastTrain: String(row.lstcarAt) === '1', rank,
      };
      const key = train.trainNo || `${rank}-${train.destination}`;
      const previous = trains.get(key);
      if (!previous || received > Date.parse(previous.receivedAt)) trains.set(key, train);
    }
    const sorted = [...trains.values()].sort((a,b) => a.rank-b.rank || (Date.parse(a.estimatedAt)||Infinity)-(Date.parse(b.estimatedAt)||Infinity));
    return { id: direction.id, nextStation: direction.nextStation, trains: sorted.slice(0, 4) };
  });
  const received = groups.flatMap(x=>x.trains).map(x=>Date.parse(x.receivedAt));
  return {
    station: CURRENT_STATION, fetchedAt: new Date(now).toISOString(),
    updatedAt: received.length ? new Date(Math.max(...received)).toISOString() : null,
    status: received.length ? 'ok' : staleCount ? 'stale' : 'empty', groups,
  };
}
// Return null instead of continuing to display old arrival states.
export function arrivalStatus(train, now = Date.now()) {
  const received = Date.parse(train.receivedAt), age = now - received;
  if (!Number.isFinite(received) || age > ARRIVAL_STALE_MS || age < -60000) return null;
  if (['0','1'].includes(train.arrivalCode)) return age <= 60000 ? { state: train.arrivalCode === '0' ? 'approaching' : 'arrived' } : null;
  const remaining = Date.parse(train.estimatedAt) - now;
  if (Number.isFinite(remaining) && remaining > 0) return { state: 'minutes', minutes: Math.ceil(remaining/60000) };
  if (train.estimatedAt) return null;
  const states = { '3':'previousDeparted', '4':'previousApproaching', '5':'previousArrived' };
  return age <= 60000 && states[train.arrivalCode] ? { state: states[train.arrivalCode] } : null;
}
