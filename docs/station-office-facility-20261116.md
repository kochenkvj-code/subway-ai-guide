# Customer safety offices in facility guidance — 2026-11-16

Baseline: 0fe0d41 (latest main at implementation start).
Scope: customer-office guidance for the existing line 1–8 base-station master.
There are 276 line-specific entries: 266 direct office records, nine explicit
same-name cross-line mappings, and Amsa History Park (2810) without a record.
The user approved excluding 2810. The final eligible set is 275 entries.
Line 9 and 2810 are excluded only from customer-office guidance; all their
existing facility features remain unchanged. Unregistered 0200 is not added.

Implementation:
- Station-office transport is extracted from the existing audit endpoint into
  station-office-source.js. Provider selection, XML parsing and key isolation
  remain the same; concurrent requests share an in-process pending promise and
  successful source responses are cached for ten minutes per server instance.
- /api/v2/station-office validates the original base code and returns a dedicated
  customerOffice category, location/floor, telephone and hours. Excluded codes
  return without any provider request. Failures return 503, not an empty office.
- Nine cross-line mappings are explicit and verified against source name, source
  code and source line. The API response retains the user's base stationCode and
  separately identifies sourceStationCode; source records are never rewritten.
- FacilityDemo loads offices independently of existing facilities, preventing
  an office request from blocking other facility records. Source sharing remains internal and is not labeled in the passenger UI. The existing facility-context analytics identifier
  facility_customerOffice is reused. Telephone links open the user's dialer only.
- Same-name sharing is not automatically applied to future unmatched records.
- The original coverage audit retains its 290 rows and classifications, including
  its 0200 review candidate. Audit-only Line 9 contact work is unchanged.

Verification:
- Tests cover all 276 master entries: 266 direct, nine shared, one excluded;
  all Line 9 codes excluded; wrong names/lines rejected; XML and JSON transports;
  pagination, caching, base identity, API failures and unchanged audit counts.
- Browser tests cover ko/en/ja/zh, direct and shared records, phone/filter,
  320/390px, slower office response, service failure and excluded-station behavior.
  Provider responses are fixtures derived from the real 266-record API response.
  No production analytics or DB writes, SMS, real calls or Gemini requests occur.
- No DB schema/data changes and no production or preview deployments.

The only snapshot of office records added to the repository is a test fixture;
production always queries the provider. Source absence for a previously supported
station remains an explicit missing-information state rather than cross-station
substitution. The 2810 exclusion is deliberate per user instruction.

Completed local checks: full build and 269 tests pass; browser verification
passes 12 scenarios with zero page exceptions, including the 2810 exclusion.
Production deployments: 0. Preview deployments: 0.

A separate /station-office-facility-test page reuses the actual facility component
with station/language controls and example buttons. Its filter interactions disable
usage tracking; normal facility screens retain their existing tracking behavior.
An offline HTML preview contains actual API-derived office-card snapshots for
0154, 0311, 0321 and the deliberate 2810 exclusion in four languages. No provider
key or analytics calls are included in that self-contained artifact.

Passenger-facing shared-office labels and preview sample badges were removed
per user preference; the explicit source mappings and base-line identities remain
unchanged. Seoul telephone display uses hyphens, e.g. 02-6110-3211.
