# Shared official station-name directory — 2026-11-15

## Scope and preserved data

Display lookup now uses `app/data/seoulMetroOfficialStations.json`: 799 line/code
records, representing 655 distinct Korean name strings. The file is not rewritten
or copied. `app/lib/station-directory.js` builds shared in-memory name indexes.
`stationNameI18n.js`, `officialStations.js` display lookup and `facility-i18n.js`
all use that common module without circular imports.

The 440-entry `app/data/subwayStations.json` is retained byte-for-byte as an
archive. Application code, test loaders and scripts have no reference to it.
There is no runtime fallback to the archive. `stationNameAliases.json` retains
276 input-only compatibility labels; these mappings contain no display
translations or routing codes. Existing valid inputs keep their name mapping,
with the explicitly approved canonical changes 능길 → 신길온천 and
4.19민주묘지 → 4·19민주묘지. Literal Korean API qualifiers remain unchanged.

The base-station selector remains `seoulMetroStationMaster.json`: 289 line/code
entries (251 distinct Korean names), including separate Jongno 3-ga line 1/3/5
platforms. Its data, labels and selection code are unchanged. This migration does
not extend the set of supported base stations.

## Behavior

- Station lookup distinguishes `translated`, `untranslated` (raw text exists)
  and `missing` (no source text). Display results expose no station code.
- Optional line/code context limits name lookup to that line/platform. 서울 vs
  서울역 is resolved within that context without changing the graph.
- Lost-item candidate/map destination callbacks no longer use the API-input
  resolver as a translation whitelist. Unknown nonempty destinations retain
  their source label, rather than becoming “Destination unknown.”
- Existing Line 2 inner/outer terminus rules remain. Line 2 branch and Line 6
  Eungam loop labels reuse the existing live-display formatter, retaining
  operating qualifiers and track labels. No train direction rules are changed.
- Home/live destinations also retain unknown provider wording. API raw rows
  are not modified; raw JSON remains the provider's Korean source.
- Facility location parsing uses shared station labels. Its all-or-original
  behavior remains: an unrecognized phrase is not partially translated.
- `stationName()` keeps its string return contract and strict empty-string
  lookup mode. Canonical station input lookup keeps its string/null contract.
- Route search prefix/initial matching, result grouping, preferred codes,
  provider request construction and the route API handler are unchanged.
- Train candidate ranking, topology, freshness thresholds, activity tracking,
  Gemini prompts/settings and database schema are unchanged.

## Verification

- `npm run build`: 256 tests pass; Next.js production build succeeds.
- `npm run test:stats`: 35 tests pass.
- New name tests cover all 799 records × 4 languages with exact line/code
  context, every graph station on lines 1–9, explicit aliases, unknown/missing
  destinations, Line 2/6 service labels and facility direction/boarding codes.
- Before/after snapshots: 2,646 official-search inputs and 799 code lookups
  unchanged. All 1,820 previously accepted compatibility inputs retain their
  mapping except the two approved canonical name corrections.
- `npm run test:station-names-ui` (Playwright/Chromium): local production build,
  ko/en/ja/zh, 320/390px; home/live detail; timetable upcoming/full/first-last;
  facility locations; lost-item candidate/map/handoff; station initial search
  and route request codes 2811 → 2805; 289-entry selector and Jongno 3-ga
  0153/0319/2535; wide facility rendering at 1440px. No browser exceptions.
- Browser provider responses are fixtures. Subway-route requests execute the
  actual API handler with an injected provider response. No production stats
  writes, Gemini calls or SMS sends are made by the local UI tests.
- Archive, official source, base-station master, graph/direction files, route
  API handler and candidate computation are unchanged against the rollback tag.

Limitations: these checks verify lookup coverage and use of the checked-in
translations, not an independent linguistic audit of every source entry.
Translations and typography can differ from the archived directory. The official
registry contains duplicate foreign labels and some line-specific spelling
inconsistencies; explicit compatibility aliases preserve the existing accepted
inputs rather than silently selecting the first colliding station. The old
route-search matching/code rules are intentionally unchanged. Real iOS keyboard,
carrier network behavior and SMS delivery are outside this change's tests.

## Release and rollback

Pre-change source: `bc4e789f9b8cdf9d2ae3a2b1d8923e46a1498ee8`.
Remote rollback tag: `rollback-before-station-names-799-20261115`.
Pre-change production: `dpl_2GX8qeM9TxfE2rsDRZNKMjQmn1Fb`
(`subway-ai-guide-bpqvk5yp4-t5-b.vercel.app`).
Project: `prj_AarjheGYfoVmMkbiAwg7EMkbALxx`.
Team: `team_7CqUKa0HUcTaAhbsO6WH4zbG`.

Release plan: one production deployment after local verification; no preview
deployment. Verify READY state, production alias, served build and read-only
responses. Do not generate synthetic production analytics for a smoke test.
For immediate rollback, restore production traffic to the exact deployment
above. For a source rollback, revert the migration commit while preserving
unrelated later commits. No database rollback or migration is required.
