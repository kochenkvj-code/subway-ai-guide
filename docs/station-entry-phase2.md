# Phase 2: station entry URLs and development tools

V2 now resolves its station from `station=<four-digit-string>` using the phase-one master. A missing parameter explicitly defaults to Jongno 5-ga `0154`; unknown, empty, shortened or supplementary-only codes show an error and never silently fall back. No localStorage or cookie remembers a different station. Reload and view navigation retain the URL authority. Browser-back entry transitions remount the station-scoped V2 workspace to prevent old selections/results from leaking. Language changes preserve the selected station and current guide; language is stored in the URL for reload/share consistency.

The homepage station label opens a development selector with name/code search, line filter and line-specific transfer entries. Selector visibility is supplied by the server page using `V2_DEVELOPMENT_STATION_SELECTOR`; set it to `off` and rebuild/redeploy to hide it at launch. URL query parameters cannot re-enable it. A separate station-link button provides home and gate-entry URLs, clipboard copy, and selectable text fallback when clipboard is unavailable.

`stationEntryUrl` receives `basePath` explicitly: `/v2` today, `/` at final cutover. Only canonical station, optional gate view, and current language are included, never place IDs, old history or unrelated parameters. Examples:

- `/v2?station=0152`
- `/v2?station=2637&view=gate&lang=ja`
- Future root equivalent: `/?station=2637&view=gate&lang=ja`

Existing V2 `from=gate` links resolve to `view=gate` and default English unless a supported `lang` is explicitly selected. The live V1 route and its QR behavior are untouched.

## Deliberate stage boundary

Update: phase 3a now connects live arrivals/home/details for selected stations; see `docs/multi-station-arrivals.md`. The paragraph below records the original phase-2 boundary. Other menus and AI remain unconnected for non-default stations.

This phase does **not** claim that menu providers support every selected station. Only the original `0154` V2 behavior is connected. Other station homepages display their selected line/name and a development notice, without Jongno 5-ga live directions or arrival requests. Their menus and AI open a clear not-yet-connected panel, rather than query or display Jongno 5-ga data. This includes feedback counts/access and route, timetable, tourism, facilities, found items and train-lost requests. The existing station prop/legacy ID remains for the original menus until their individual migration steps. Even common gate/card guidance is held on non-default stations until station-specific escape paths (e.g. station-office location) are safe. Later menu stages should replace this temporary all-or-nothing gate with verified per-feature connections.

AI prompts, analytics schema/logic, feedback DB/auth and provider adapters have not been changed. Existing V2 page/quick-menu analytics continue as before; the new browser tests stub all analytics and provider calls. No new statistics fields or station-specific DB rows are created.

## Verification

- `npm run test:station-entry`: missing/invalid codes, line-specific IDs, root/development URL parity, four output languages, legacy QR compatibility and canonical link safety.
- `npm run build`: required train-lost, station-master and station-entry checks, followed by the production build.
- `npm run test:station-entry-ui` after build: clipboard links, station selection, reload/navigation/back, all four languages at 320x640 and 390x844, invalid entry recovery, legacy gate language, in-place gate-language changes, no wrong-station feature API calls and unchanged V1 entry.

Existing V2 gate regression checks are also run. Review links and all operational limitations should be reported with the deployment; the actual global selector is only a development convenience, not a new intended passenger workflow.
