# Phase 3d — station-scoped found-item search

V2 found-item search now uses the entry URL's exact common station code, not
the legacy feedback-station ID. The selected station/line is shown as the
default custody location. There is no automatic search on entry: the passenger
submits Search. Existing date bounds, item input, Seoul-wide/custom-place
search, local four-item pages, details and navigation remain available.

The server resolves station identity and custody aliases independently. Empty,
shortened and unknown entry codes fail instead of reverting to Jongno 5-ga.
Responses carry station identity, which the client verifies; component and
navigation identities prevent old station drafts/details/results leaking.
Legacy no-code and feedback-station-ID calls remain supported.

## Portal agency identity

An actual LOST112 portal list request for Dongmyo returned two separate custody
agencies. Independent item-detail requests confirmed their organization IDs:

- `0159`: `동묘앞역(1호선)`, `V0001918`.
- `2637`: `동묘앞역(6호선)`, `V0000325`.

These verified external IDs/names are stored separately from the app's station
codes in `app/data/lostFoundAgencies.json`. Queries use the corresponding
verified agency name. Other stations use explicit station wording and local
line validation. New station-code queries preserve the station suffix rather
than searching broad neighborhood names. Station scope calls only the portal
API; Seoul-wide scope still checks portal and police with Seoul date/area bounds.

Filtering excludes police/substation names, wrong stations, explicit other
lines, old/invalid dates and closed records. Transfer-station names without
enough line/verified-organization evidence are rejected, not mixed across
lines. A source organization ID contradicting a verified mapping is rejected.
There is no generic shared-custody assumption or warning. Friday-transfer
guidance remains specific to the original Jongno 5-ga station context.

## Verification

- Eleven server tests cover legacy behavior, line/agency separation, invalid
  entry codes, provider routing, date/status rules, cursor caps and failures.
- The full production build passes with found-item tests included.
- Browser tests use the real server handler with isolated provider fixtures:
  Jongno 5-ga, Jonggak, Dongmyo lines 1/6, Jongno 3-ga line 3 and Seoul line 1;
  no automatic search, station changes, four languages, 320/390/768 px, details,
  browser back/forward, Seoul-wide searches and errors. No live DB writes.
- Direct API verification on 2026-11-02 returned eight recent Dongmyo line 1
  records, all labeled line 1, six line 6 records, all labeled line 6, and five
  Jonggak records. Counts can change. These checks do not certify all stations'
  registered agency names or current item availability.

Deploy to the operating domain under `/v2`. V1, other feature adapters, AI
prompts, statistics and feedback DB/schema are unchanged.
