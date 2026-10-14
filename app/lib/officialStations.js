import official from "../data/seoulMetroOfficialStations.json";
const clean = value => String(value || "").normalize("NFC").trim().toLocaleLowerCase().replace(/[\s._·・･,，‘’'“”"\-‐‑–—:：()（）\[\]{}]/g, "");
const byKo = new Map();
for (const station of official) {
  if (!byKo.has(station.ko)) byKo.set(station.ko, station);
}
export function officialStationName(ko, lang, fallback) {
  if (lang === "ko") return ko;
  const station = byKo.get(String(ko || "").trim());
  return station?.[lang] || fallback(ko, lang);
}
export function officialStationMatches(query, lang, limit = 8) {
  const q = clean(query);
  if (!q) return [];
  const results = [];
  const seen = new Set();
  for (const s of official) {
    const labels = [s.ko,s.en,s.ja,s.zh];
    const match = labels.some(v=>clean(v).includes(q));
    if (!match) continue;
    const key = s.ko;
    if (seen.has(key)) continue;
    seen.add(key);
    const lines = official.filter(x=>x.ko===s.ko).map(x=>x.line.replace(/^0([1-9])호선$/, "$1호선"));
    results.push({...s,lines:[...new Set(lines)]});
  }
  results.sort((a,b)=>{
    const aa=clean(a[lang]||a.ko),bb=clean(b[lang]||b.ko);
    const ap=aa.startsWith(q)?0:1,bp=bb.startsWith(q)?0:1;
    return ap-bp || aa.localeCompare(bb,lang==="ko"?"ko":"en");
  });
  return results.slice(0,limit);
}
export function officialCodeForName(ko) {
  return byKo.get(ko)?.code || null;
}
