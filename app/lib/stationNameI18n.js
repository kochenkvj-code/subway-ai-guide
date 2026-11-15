// Display names use the shared official directory. Input compatibility is kept
// separately from translation, and never depends on the archived directory.
import {canonicalStationName, cleanStationLabel, stationLabelResult} from './station-directory';
export {stationDirectoryCount, stationLabelResult} from './station-directory';
const clean = cleanStationLabel;

export function destinationForApi(value) {
  // Keep exact full-name matching and the existing string/null API contract.
  // Routing code selection remains in its existing official resolver.
  return canonicalStationName(value);
}

export function stationName(value, lang = "ko", fallbackUnknown = true, context = {}) {
  const result = stationLabelResult(value, lang, context);
  if (result.status === 'missing') return '';
  // Preserve the Korean API wording (including operating qualifiers) as before.
  // Only the two explicitly agreed historical names use canonical spelling.
  if (lang === 'ko') return ['능길', '4.19민주묘지'].includes(result.raw) && result.ko ? result.ko : result.raw;
  if (result.status === 'translated') return result.text;
  if (fallbackUnknown) return result.raw;
  return '';
}

const LINE_LABELS = {
  "경의선": ["Gyeongui Line", "京義線", "京义线"],
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
