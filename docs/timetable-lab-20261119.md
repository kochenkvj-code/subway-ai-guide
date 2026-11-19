# Live timetable test page — 2026-11-19

Test page: `/v2/timetable-lab?station=0154&lang=ko`
New API: `/api/v2/timetable-lab?stationCode=0154&day=평일`

This is isolated from the operating TrainTimetable component/API. Shared arrival/lost-property graph/direction datasets are imported read-only and have no edits. No production menu links, feature visibility settings, database schema or user analytics code were changed.

## Live source audit (production key remains server-only)
The timetable key is a protected Vercel Secret and cannot be exported to this workspace. A read-only test endpoint was deployed first, then actual full provider responses were inspected and used to implement the timetable-only interpreter. No secret was returned or copied into Git.

| Station | Verified interpretation of weekday data |
| --- | --- |
| Jongno 5-ga 0154 | 3,147 historical/current rows; 2,663 expired excluded; 484 current departures, two columns |
| Seongsu 0211 | Inner/outer requests include Seongsu branch; UP/DOWN requests empty; 592 departure rows; three columns |
| Sindorim line 2 0234 | Inner/outer include Sinjeong branch; 589 departures; three columns |
| Yongdap 0244 | Seongsu branch supplied as inner/outer; 226 departures; two columns |
| Gangdong 2549 | 421 expired rows excluded; 415 departures; Cheonho/Gildong/Dunchon-dong classified by direction plus unique graph reachability |
| Eungam 2611 | UP arrivals have null departures; DOWN has two records for many train numbers, one at loop start and one post-loop; 329 departures; Yeokchon/Saejeol |
| Gusan 2616 | DOWN only, 165 departures, toward Eungam |
| Jangam 2711 | UP records are arrival-only; DOWN has 85 real departures toward Dobongsan |
| Sanggye 0410 | Old validity intervals excluded; 466 current departures; graph alias labels localized through official station names |
| Bongeunsa 4129 | Real express Y flags verified. trainKnd was null in this sample; no real limited-express-kind sample was obtained |
| Kkachisan line 2 0200 | Official directory identity used only in the test adapter because shared master lacks this identity. Existing operating legacy API supplied 111 outward departures to Sindorim; full new endpoint verified live: 111 departures, 111 arrival-only rows excluded, no unclassified rows |

Weekday and weekend responses differ for Jongno 5-ga and Seongsu. `공휴일` returned empty data for Jongno 5-ga, Seongsu, Sindorim, Yongdap, Gangdong, Eungam and Sanggye; `상시` was also empty in queried Jongno 5-ga / Seongsu samples. These are data availability findings, not proof of no trains running. No fallback from holiday to another day was added. Weekend is labeled Weekend rather than claiming an independently verified Saturday-only mapping.

Original response fields retained for interpretation include brlnNm, original upbdnbSe, trainDptreTm/trainArvlTm, origin/destination, etrnYn, trainKnd and validity intervals. Full responses are paginated to 4,000 rows per requested direction; oversize/failure is explicit, never silently truncated. Exact station/line filtering, full-row duplicate removal, validity filtering and departure-only selection precede classification. Unclassified valid departures are counted and warned about, never guessed into a column.

Actual 24h/25h departure values were observed. Internal ordering uses extended service minutes, while UI labels are Next day 00/01. At 00:10 Friday-night/Saturday-morning the service date is still Friday. The boundary is 05:00, consistent with the source validity interval's operating-day start; beyond the tested overnight range, review provider records before expanding rules.

## UI
Facility-guide reference colors, type hierarchy, borders and spacing; 7-column hour grid; all departure directions side-by-side; all rows shown without show-more or horizontal scrolling; original query station and four languages; minute/destination rows; express-only filter when applicable; destination-specific first/last dialog; fixed overlay arrows only, no swipe interception. Dense hours scroll vertically rather than shrinking text. Past/next styling denotes scheduled times only. API/day changes fetch data; hour/language/express/dialog/arrow changes do not. Partial/error/missing-hour/missing-day are distinct.

Calendar: 2026 holidays include the published 2026 calendar, election day, and KASA's 2026 additions for Labour Day/Constitution Day. Other years show a warning and retain weekday/weekend selection; expand verified calendar coverage before operating deployment. The source's separate holiday schedule remains unavailable in audited stations.

## Tests
- Full `npm run build`: 322 tests, zero failures; Next production build succeeded.
- Seven timetable regressions: genuine provider samples for branching/one-way/terminal/express/validity, overnight boundary, official-only Kkachisan identity, unknown-direction warning, station validation, pagination and cache. Fixtures are 66 KB of selected public provider records, not fabricated source evidence.
- Browser: ten full actual-response replays, 1/2/3 columns, four languages at 320/390/768/1100 widths, zero refetch on hour/overlay/language/filter/dialog, first/last, error vs missing data and line 2 Kkachisan selector.
- Chromium mobile/touch browser used. WebKit installation was blocked by the environment's download policy (HTTP 403). Physical iPhone Safari interaction was not tested and must not be claimed as verified.
- The deployed endpoint/page are connected to real provider data; fixtures are only for repeatable local browser regression.

## References
- https://www.data.go.kr/data/15143847/openapi.do (API parameters)
- https://data.seoul.go.kr/dataList/OA-22522/L/1/datasetView.do (service-day extended times and CSV day types)
- https://www.kasi.re.kr/publication/post/newsMaterial/32031 (2026 calendar)
- https://www.kasa.go.kr/prog/plcyBrf/brief/kor/sub01_01_04/view.do?plcyBrfNo=431 (2026 additions)

## Release / rollback
Three production-target deployments were needed: isolated data verification endpoint, complete test page, then a historical station-name display correction found during final live verification. Zero preview deployments. Existing operating timetable has no modifications.
Rollback tag before both: `rollback-before-timetable-lab-20261119` -> `30029da39fa5dccbfcca9470bf099a1612a47296`.
Previous production: `dpl_6VReH5f5TDP9vhDEnLTNaUPRAJAr` (`subway-ai-guide-h93joqnj4-t5-b.vercel.app`).
Source verification commit: `a2882ee9274b1acb61c8b5ebac309aa9a7428e85`, deployment `dpl_JBffGXfMTGXWAEL5CSx3PaYuJgqA`.
No database rollback is required. Do not connect the test page to operating menus before review/approval.
