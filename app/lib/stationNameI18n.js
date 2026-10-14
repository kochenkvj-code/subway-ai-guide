// All station names come from the user's 2026 Seoul Metro/KRIC multilingual dataset.
// No model translation, external station-name API or fuzzy name guesses.
import rawData from "../data/subwayStations.json";

const STATIONS = rawData.stations;
const aliases = new Map();
const aliasPriority = new Map();

function clean(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function key(value) {
  // Consistent comparison across Latin/CJK/Hangul, punctuation and spacing.
  return clean(value).toLocaleLowerCase().replace(/[\s._·・･,，‘’'“”"\-‐‑–—:：()（）\[\]{}]/g, "");
}

function addAlias(alias, ko, priority = 1) {
  const k = key(alias);
  if (!k) return;
  const oldPriority = aliasPriority.get(k) || 0;
  // Exact station labels outrank generated shorter aliases (e.g. a bracketed
  // sub-name must not override a different station's exact official name).
  if (oldPriority > priority) return;
  if (oldPriority < priority) {
    aliases.set(k, ko);
    aliasPriority.set(k, priority);
    return;
  }
  const other = aliases.get(k);
  if (other !== ko) {
    if (other && other.replace(/역$/, "") === ko.replace(/역$/, "")) {
      // The same station appears with and without the literal "역" suffix.
      aliases.set(k, other.length <= ko.length ? other : ko);
    } else {
      aliases.set(k, null); // genuinely ambiguous translated name
    }
  }
}

function variations(label) {
  const value = clean(label);
  if (!value) return [];
  const arr = [value];
  // Original full labels with auxiliary names are retained and also searchable
  // by their shorter primary station name.
  const withoutBracket = value.replace(/\s*[（(][^()（）]*[)）]/g, "").trim();
  if (withoutBracket && withoutBracket !== value) arr.push(withoutBracket);
  for (const entry of [...arr]) {
    const withoutSuffix = entry.replace(/(?:\s*station|역|駅|站)$/i, "").trim();
    if (withoutSuffix && withoutSuffix !== entry) arr.push(withoutSuffix);
  }
  return arr;
}

for (const [ko, item] of Object.entries(STATIONS)) {
  for (const value of [ko, item.ko, ...(item.aliases_ko || []), item.en, item.ja, item.zh]) {
    for (const [i, variant] of variations(value).entries()) addAlias(variant, ko, i === 0 ? 2 : 1);
  }
}

function findKo(value) {
  const input = clean(value);
  if (!input) return null;
  // Canonical Korean API station names must win even if a foreign alias
  // elsewhere happens to share the same characters.
  for (const variant of variations(input)) {
    if (Object.prototype.hasOwnProperty.call(STATIONS, variant)) return variant;
  }
  for (const variant of variations(input)) {
    const k = key(variant);
    if (aliases.has(k)) {
      // An ambiguous alias must never silently turn into a different station.
      if (aliases.get(k) === null) return null;
      return aliases.get(k);
    }
  }
  return null;
}

export function destinationForApi(value) {
  // Keep strict full-name matching: "강남" must never resolve to "강남구청".
  const ko = findKo(value);
  // One dataset duplicate: "하남검단산역" and "하남검단산".
  // The shorter form is preferred for API input while retaining both for output.
  if (ko?.endsWith("역") && Object.prototype.hasOwnProperty.call(STATIONS, ko.slice(0, -1))) return ko.slice(0, -1);
  return ko;
}

function noHangul(text) {
  return clean(text).replace(/_x[0-9a-f]{4}_/gi, " ").replace(/\s+/g, " ").trim();
}

export function stationName(value, lang = "ko", fallbackUnknown = true) {
  const raw = clean(value);
  const ko = findKo(raw);
  if (lang === "ko") return raw;
  if (ko) {
    const item = STATIONS[ko];
    // If a Japanese/Chinese translation is absent use *documented* English,
    // never a guessed CJK translation or Korean-only output.
    return noHangul(item[lang] || item.en || ko);
  }
  // Outside the 440-row dataset: no invented translations. For a foreign UI,
  // display a recognizable non-Hangul notice instead of leaking Korean text.
  if (!fallbackUnknown) return "";
  if (!/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(raw)) return raw;
  return { en: "Station name unavailable", ja: "駅名未登録", zh: "暂无车站译名" }[lang] || "";
}

const LINE_LABELS = {
  "신분당선": ["Shinbundang Line", "新盆唐線", "新盆唐线"],
  "신분당": ["Shinbundang Line", "新盆唐線", "新盆唐线"],
  "경의중앙선": ["Gyeongui–Jungang Line", "京義・中央線", "京义中央线"],
  "수인분당선": ["Suin–Bundang Line", "水仁・盆唐線", "水仁盆唐线"],
  "경춘선": ["Gyeongchun Line", "京春線", "京春线"],
  "공항철도": ["Airport Railroad", "空港鉄道", "机场铁路"],
  "공항철도선": ["Airport Railroad", "空港鉄道", "机场铁路"],
  "우이신설선": ["Ui–Sinseol Line", "牛耳新設線", "牛耳新设线"],
  "우이신설": ["Ui–Sinseol Line", "牛耳新設線", "牛耳新设线"],
  "에버라인": ["EverLine", "エバーライン", "爱宝线"],
  "용인경전철": ["EverLine", "エバーライン", "爱宝线"],
  "인천1호선": ["Incheon Line 1", "仁川1号線", "仁川1号线"],
  "인천2호선": ["Incheon Line 2", "仁川2号線", "仁川2号线"],
  "인천 1호선": ["Incheon Line 1", "仁川1号線", "仁川1号线"],
  "인천 2호선": ["Incheon Line 2", "仁川2号線", "仁川2号线"],
  "서해선": ["Seohae Line", "西海線", "西海线"],
  "신림선": ["Sillim Line", "新林線", "新林线"],
  "김포골드라인": ["Gimpo Goldline", "金浦ゴールドライン", "金浦黄金线"],
  "GTX-A": ["GTX-A", "GTX-A", "GTX-A"],
};

export function lineName(value, lang = "ko") {
  const raw = clean(value);
  if (lang === "ko") return raw;
  const pos = { en: 0, ja: 1, zh: 2 }[lang];
  if (pos === undefined) return raw;
  const translated = LINE_LABELS[raw] || (() => {
    const m = raw.match(/^([1-9])호선(?:\s*.*)?$/);
    return m ? [`Line ${m[1]}`, `${m[1]}号線`, `${m[1]}号线`] : null;
  })();
  if (translated) return translated[pos];
  if (!/[가-힣]/.test(raw)) return raw;
  return ["Rail line", "路線", "线路"][pos];
}

export function directionName(value, lang = "ko") {
  const raw = clean(value);
  if (!raw || lang === "ko") return raw;
  // Some upstream direction strings include a Korean -bound suffix.
  const stripped = raw.replace(/행$/, "").trim();
  return stationName(stripped, lang, false);
}

export const stationDirectoryCount = Object.keys(STATIONS).length;
