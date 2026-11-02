# Phase 1: common station master

The runtime V2 and live `/` guides, AI, analytics and Supabase remain unchanged. The master is deliberately not wired into any menu, selector or URL entry resolver yet. Review it at `/v2/station-master`; this separate page makes no provider API or statistics calls and can export its full data and audit as JSON. It is excluded from search indexing. The previously prepared route-statistics commit is not included in this release.

## Sources and authority

- `app/data/seoulMetroOfficialStations.json` (799 records) is authoritative for this stage's codes and Korean/English/Japanese/Chinese names, as instructed by the user. It is not filtered or rewritten.
- The supplied `서울교통공사_자치구별 지하철역 정보_20250804.CSV` is preserved byte-for-byte as `data/sources/seoul-metro-district-20250804.csv` (CP949; SHA-256 in the audit). Its 30 district rows identify 289 **scope candidates only**. Its spelling does not override the multilingual registry. Gyeonggi locations and the listed 9-line segment are kept; neither a Seoul geographic filter nor a blanket 1–8 line filter is applied.
- `app/data/stationCoordinates.json` (784 records) supplies coordinates by exact string code. It is unchanged. An absent coordinate is never synthesized or silently borrowed from another line.
- Current official operator membership could not be independently rechecked: direct official-site access is blocked by the execution environment network policy. The audit explicitly reports `pending-current-official-source`, not current fully verified operational coverage. Upstream API support and translations still need menu-level validation.

## Results

289/289 source entries matched after five explicit source corrections; 289/289 matched entries have exact-code GPS. Three Jongno 3-ga line/platform records are kept separately (`0153`, `0319`, `2535`) with distinct coordinates. Dongmyo line 6 is `2637`; Jonggak is `0152`. Codes stay strings with leading zeros.

Corrections, with the source text retained:

- 암사(5) → 암사(8), code `2811`.
- 암사역사공원(5) → 암사역사공원(8), code `2810`.
- 이수(4) → registry name 총신대입구(4), code `0432`; retain 이수 as alias.
- 서울(1)/(4) → registry name 서울역 on the matching lines.

2-line Kkachisan (`0200`) is in the 799-record registry but absent from the supplied scope CSV and GPS file. It is reported as a **supplementary review candidate**, outside the 289 source-listed records. Its operational membership/coordinate must be verified before adding it. The earlier pasted report's 290-row multilingual scope CSV was not supplied; this release does not pretend to reproduce its 290/289 matching figures. Do not force the count to 290 by assuming or copying the 5-line coordinate.

## Structure and next steps

Each record contains stationCode, line, subwayId, color, four names, aliases, exact-code coordinates, source provenance, legacyIds and API hints. `getStationByCode` requires a known string code and never defaults to Jongno 5-ga. Hints are not a claim that every provider supports the station. The old `jongno5ga-1` is metadata for planning a later station-code DB transition, not a new compatibility requirement or current DB migration.

No V2 prefix is embedded in the master. Later entry URL work should support `/v2?station=...` during development and `/?station=...` at cutover. The eight menus follow, then AI, and analytics last immediately before operational replacement. Branches, termini, renamed stations and unknown-provider cases need adapter validation. Keep actual passenger defaults station-locked; enable global station changes only in the development selector.

## Regeneration and verification

`npm run generate:station-master` deterministically generates the two JSON files from the preserved source and existing registries. `npm run test:station-master` checks all names against the authoritative registry, leading-zero identifiers, transfer separation, correction provenance, missing candidate exclusion, exact coordinates, reproducibility and fail-closed lookup. `npm run build` produces the Next.js release. After build, `node tests/station-master-ui.cjs` verifies the separate review page across mobile/desktop, filters, download and absence of API/stat writes.
