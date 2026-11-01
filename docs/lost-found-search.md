# Seoul-only found-item search

## Passenger behavior

The shared configured station is the initial custody selection, with a thirty-day found-date window. Scope choices are current station / all Seoul / another custody location. Dates can be 7/30/90 days or an explicit interval inside the last ninety calendar days (including today, Asia/Seoul). No all-time mode is exposed. Four-language UI does not translate agency descriptions; Korean query examples remain clear for API text matching.

Both date validation and record date filtering run on the server. Old, unknown-date and invalid-date records are excluded rather than shown as currently held items. Known explicit returned/disposed/closed custody statuses are excluded when present in list records. Since the list may omit status, detail reads show the official status or “please confirm”; closed status discovered in detail removes that record from the local list. No current-custody promise is made.

## Geographic and station matching

`app/lib/lost-found-filter.js` reuses the allowlisted shared station registry. For the configured Jongno 5-ga station, strict custody aliases accept the station name and supported operator/line/customer-office suffix formats. Police substations, districts, police offices, bare neighborhood names, and other stations cannot pass this station filter. Unknown naming variants fail closed; validate actual agency labels before adding explicit `lostFoundAliases` entries to a station configuration.

For current-station searches the existing official name/place endpoint obtains candidates, then the server validates station custody and found date. This station is known to be in Seoul. Other-place searches and all-Seoul searches use the existing area/date endpoint with `N_FD_LCT_CD=LCA000` in every request, even when an item keyword is supplied. Item/other-place text filters are applied to those Seoul candidates on the server. No nationwide keyword fallback is used.

## Paging and limits

Up to three upstream pages per source are scanned per request, stopping early when ten matching rows are found. Response `nextPages` holds independent source cursors. Transiently failed sources retain their cursor for a later request; missing-key sources do not cause an endless next loop. Frontend paging displays four already checked items per page, and a separate “check more” button requests the next scan batch. Appending preserves existing order to avoid moving already viewed rows between pages. Categories only describe loaded records, not the full upstream dataset.

Existing per-source page limit 20 is retained; it returns `limited=true` and never offers page 21 to the provider. The client preserves the cap flag across further scans of another source. The UI does not claim a complete empty result while more records remain, and API errors are not presented as zero items. These bounded scans can miss matching records beyond the cap; narrow the search or use the official LOST112 website when needed. Partial failures are explicitly shown.

## Mobile and navigation

Place and period presets replace initially empty date fields. Native date inputs only appear for custom dates; they have 16px text and bounded min/max values. Detail replaces the filter/results screen, preserves list position, and participates in existing V2 Back/Forward navigation. Contact links use only the official detail phone field, never an invented station or center number. Jongno 5-ga Friday-transfer guidance comes from the user's stated operating procedure; no date-based automatic transfer inference or assumed center is applied. Other future stations receive generic custody confirmation guidance.

## Verification

`node --experimental-vm-modules --test tests/lost-found-search.test.mjs` runs the actual route against isolated XML fixtures: police/station separation, 2019/invalid dates, explicit status filtering, supported station aliases, Seoul scope on keyword/location queries, independent failure cursors, page cap and missing keys.

After a Next production build, `node --experimental-vm-modules tests/lost-found-ui.cjs` runs the browser UI through that actual route in a VM with stub provider responses. It verifies presets, date validation, four-row paging, current-station default, detail/back/forward, API failure state, all four languages and 320/390/768px widths. No production keys or real user records are used in fixtures. Live provider response formats and custody aliases still need observation in deployment; these tests are not a claim of actual iPhone/Safari hardware validation.

No Supabase changes are involved. API keys remain server-only and use the existing LOST112 env variables. Restore the previous application commit to roll back this feature; no data migration is needed.

## Progressive initial station search

Live read-only measurements on 2026-11-01 showed roughly nine seconds for the portal's bounded station scan and sixteen seconds for the police source (including connector/network overhead). Portal page two had no matching recent station items. The initial station UI now asks each provider independently with `scan=first`, limiting each to one page, and renders whichever response arrives first. The slower provider continues in the background with a localized checking notice. Initial results are not held until both providers or subsequent pages finish. Source cursors and failures are merged without skipping pages; partial failures remain visible. Additional upstream pages use the existing explicit load-more action. Filters and time/custody validation are unchanged. No cache TTL or freshness compromise was introduced.

The UI fixture deliberately blocks the police response and verifies portal results and the background notice are visible before releasing it. Another API test asserts first-scan mode requests only one page and retains page two as a cursor. Items learned to be closed in detail remain excluded if a slower initial response arrives later during that search. Actual improved production latency still needs measurement after deployment.
