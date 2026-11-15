// Single source of display names. Compatibility aliases contain input labels
// only; they never provide translations or select a station code for routing.
import official from '../data/seoulMetroOfficialStations.json';
import compatibility from '../data/stationNameAliases.json';

export const officialStationRecords = official;
export const cleanStationLabel = value => String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
const key = value => cleanStationLabel(value).toLocaleLowerCase().replace(/[\s._·・･,，‘’'“”"\-‐‑–—:：()（）\[\]{}]/g, '');
const byName = new Map(), aliases = new Map(), priorities = new Map();

function variations(label) {
  const value = cleanStationLabel(label);
  if (!value) return [];
  const result = [value];
  const primary = value.replace(/\s*[（(][^()（）]*[)）]/g, '').trim();
  if (primary && primary !== value) result.push(primary);
  for (const entry of [...result]) {
    const withoutSuffix = entry.replace(/(?:\s*station|역|駅|站)$/i, '').trim();
    if (withoutSuffix && withoutSuffix !== entry) result.push(withoutSuffix);
  }
  return result;
}

function addAlias(label, ko, priority) {
  const k = key(label);
  if (!k) return;
  const previous = priorities.get(k) || 0;
  if (previous > priority) return;
  if (previous < priority) {
    aliases.set(k, ko);
    priorities.set(k, priority);
  } else if (aliases.get(k) !== ko) {
    aliases.set(k, null); // Ambiguous foreign labels never select another name.
  }
}

for (const station of official) {
  if (!byName.has(station.ko)) byName.set(station.ko, []);
  byName.get(station.ko).push(station);
  for (const label of [station.ko, station.en, station.ja, station.zh]) {
    variations(label).forEach((v, i) => addAlias(v, station.ko, i === 0 ? 2 : 1));
  }
}
for (const [label, ko] of Object.entries(compatibility.aliases)) {
  if (!byName.has(ko)) throw new Error('Invalid station alias target: ' + ko);
  // Explicit compatibility mappings resolve documented input ambiguities (e.g.
  // the registry repeats Gangnam's foreign labels on another station). Never
  // choose the first matching row for an ambiguous foreign input.
  variations(label).forEach((v, i) => addAlias(v, ko, i === 0 ? 3 : 1));
}

export function canonicalStationName(value) {
  const variants = variations(value);
  // An exact Korean name wins over a conflicting foreign-language alias.
  for (const variant of variants) if (byName.has(variant)) return variant;
  for (const variant of variants) if (aliases.has(key(variant))) return aliases.get(key(variant));
  return null;
}

const lineKey = line => String(line ?? '').replace(/^0(?=\d호선)/, '').replace(/^(\d)$/, '$1호선');
const displayText = value => cleanStationLabel(value).replace(/_x[0-9a-f]{4}_/gi, ' ').replace(/\s+/g, ' ').trim();

// A display result deliberately exposes no code: a shared name does not identify
// a particular line/platform. Routing retains its existing code resolver.
export function stationLabelResult(value, lang = 'ko', context = {}) {
  const raw = cleanStationLabel(value);
  if (!raw) return {status: 'missing', raw, ko: null, text: ''};
  const ko = canonicalStationName(raw);
  const inContext = s => (!context.code || s.code === context.code) &&
    (!context.line || lineKey(s.line) === lineKey(context.line));
  let rows = ko ? byName.get(ko).filter(inContext) : [];
  // The graph/API calls Seoul "서울", while lines 1/4 use "서울역" in
  // the registry and GTX uses "서울". Resolve the literal station suffix only
  // within the supplied line/code; never borrow a row on another line.
  if (!rows.length && ko && (context.code || context.line)) {
    const alternate = ko.endsWith('역') ? ko.slice(0, -1) : ko + '역';
    rows = (byName.get(alternate) || []).filter(inContext);
  }
  // Without line context this is a name-only display convention, matching the
  // existing official display helper. It must never be used to infer a code.
  const row = rows[0];
  const text = row && displayText(row[lang] || row.en);
  return text ? {status: 'translated', raw, ko: row.ko, text} : {status: 'untranslated', raw, ko: null, text: raw};
}

// Full Korean aliases are needed by the facility phrase parser, which accepts
// a phrase only when every token (including auxiliary names) is recognized.
export const stationPhraseLabels = [...new Set([
  ...byName.keys(),
  ...Object.keys(compatibility.aliases).filter(label => /[가-힣]/.test(label)),
])];
export const stationDirectoryCount = byName.size;
