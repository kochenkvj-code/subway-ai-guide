# V2 station independence: timetable, facilities and feedback

## Identity and behavior

All three menus use the common four-character station code. APIs resolve station names and lines from the allowlisted master, rather than trusting conflicting client labels. V2 timetable/facilities have no independent station selector. Timetable weekday/weekend, directions, express and first/last controls remain. Facility data is fetched together for its six categories; only categories with returned records appear. Source facility descriptions remain in the provider's original language, while controls support Korean, English, Japanese and Chinese. The former AI-preview placeholder was removed; no AI prompt was changed.

Feedback uses codes for submissions, counts, inbox, PIN tokens, stars and hidden records. 0159 and 2637 remain separate despite sharing the Dongmyo name. Existing 13 test rows were reassigned to 0154, with no loss of contents. Staff PIN configuration keys must be codes. No PIN is configured on production at this release; existing admin access remains available. No DB schema/RLS change or statistics redesign was required. Canonical codes also pass through the LOST112-specific station adapter, preserving verified custody agency identities.

## Verification

- Unit tests: station-code authority, invalid codes, conflicting station/line parameters, transfer-line filtering, timetable directions/error caching, feedback validation and token isolation.
- Live provider verification via temporary Vercel deployment: timetable Jonggak 317 upbound records; Dongmyo 6 line 165 upbound; Seoul line 1 319 upbound; Gangnam line 2 239 inner-loop; Bulamsan line 4 477 upbound; Chongshin line 4 463 downbound. Counts are snapshots, not service guarantees.
- Facilities: station/line/code fields verified for Jonggak, Seoul line 1, Dongmyo lines 1 and 6, Bulamsan and Chongshin. Dongmyo lists differ and contain their own station codes. Temporary API-key preview targets restored to production-only.
- Browser coverage: six station entries × four languages × three menus at 320/390px; timetable fixed identity, facility list/detail and source location, feedback identity and horizontal overflow. Existing actual-API feedback flow also exercises submit, inbox, PIN, stars, hide/restore, badge and station isolation with fake PostgREST storage.
- Real DB transaction inserted separate line 1/6 station-coded feedback records and verified grouping, then rolled back. Existing 13 rows verified as station_id 0154.

AI station prompts and statistics rollout remain separate phases. The deferred live-arrival ETA issue was not changed.
