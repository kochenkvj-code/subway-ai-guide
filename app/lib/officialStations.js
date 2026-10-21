import official from "../data/seoulMetroOfficialStations.json";
const clean = value => String(value || "").normalize("NFC").trim().toLocaleLowerCase().replace(/[\s._·・･,，‘’'“”"\-‐‑–—:：()（）\[\]{}]/g, "");
// Match Korean initial consonants locally; no additional API requests.
const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const initialsOf = (name) => [...String(name || "")].map(char => {
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3
    ? INITIALS[Math.floor((code - 0xac00) / 588)]
    : char;
}).join("");
const isInitialQuery = query => query.length >= 2 && /^[ㄱ-ㅎ]+$/.test(query);
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
  const grouped = new Map();
  for (const s of official) {
    if (s.code === "9005" && s.line === "GTX-A") continue;
    if (![s.ko, s.en, s.ja, s.zh].some(v => clean(v).includes(q)) && !(isInitialQuery(q) && initialsOf(clean(s.ko)).startsWith(q))) continue;
    if (!grouped.has(s.ko)) grouped.set(s.ko, []);
    grouped.get(s.ko).push(s);
  }
  const results = [...grouped.values()].map(group => {
    const preferred = group.find(s => /^0[1-9]호선$/.test(s.line)) || group[0];
    return { ...preferred, lines: [...new Set(group.map(s => s.line))], codes: group.map(s => s.code) };
  });
  results.sort((a,b) => {
    const rank = s => {
      const ko = clean(s.ko), label = clean(s[lang] || s.ko);
      if (isInitialQuery(q) && initialsOf(ko) === q) return 0;
      if (isInitialQuery(q) && initialsOf(ko).startsWith(q)) return 1;
      if (ko === q + "역" || (lang === "en" && label === q + "station")) return 0;
      if (ko === q || label === q) return 1;
      if (ko.startsWith(q) || label.startsWith(q)) return 2;
      return 3;
    };
    return rank(a)-rank(b) || a.ko.localeCompare(b.ko, "ko");
  });
  return results.slice(0, limit);
}
export function officialCodeForName(ko) {
  return byKo.get(ko)?.code || null;
}
