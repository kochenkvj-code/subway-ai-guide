# Arrival investigation and recovery — 2026-11-02

Recovery tag: `recovery/train-arrivals-20261102-before-fix`.
Recovery commit: `eb6473be36271256b22c31a868a3c1ed26c09458`.
Independent archive: `/workspace/subway-arrivals-before-fix-20261102.tar.gz`.

To undo this change, revert its commit, or restore the arrival files from the
recovery tag. Do not reset unrelated station-master, chat, or statistics work.
The production deployment at recovery creation was
`dpl_S4xtezdu7f7xiFg56ExrmJDGHxrA`.

## Confirmed defects

The raw upstream response contains multiple rows for the same train and
direction. A newer position-only row can have `barvlDt=0` while another row
still contains a valid prediction. Selecting the entire newest row erases that
prediction. The recorded fixture in `tests/fixtures/arrivals-20261102.json`
contains a concrete example: Jongno 5-ga downbound 0149, 16:51:10 KST (360
seconds, Sinseol-dong) and 16:51:18 (zero, Dongmyo). At collection time,
16:52:19, the older prediction still had 4 minutes 51 seconds remaining.

The fix chooses ETA evidence independently from the newest location. A still
valid prediction may survive a subsequent zero-only poll, with the prediction's
original timestamp preserved. It is never extended or invented, never copied
across stations/directions, and never keeps a train absent from the new feed.
A newer departure suppresses older duplicate rows.

The response also contains contradictory termini for the same train. Line 1
termini are corroborated against the separate real-time position feed, fetched
in parallel and cached/coalesced per line. Conflicting arrival termini without
corroboration remain unconfirmed. Train numbers are never rewritten.

## Remaining source limitation — not resolved by this patch

Direct raw responses confirm genuine zero-only predictions at the boundaries:
Seoul upbound and Cheongnyangni downbound. In the Seoul observations, train
0130 changed from Yongsan (16:49:09 KST) to Seoul arrival (16:56:15 KST), while
its raw `barvlDt` stayed zero. There was no positive prediction to preserve.
Cheongnyangni downbound 0153/0155 also returned zero-only en-route rows.

This patch does **not** claim to provide ETAs for these zero-only trains. It
does not introduce timetable substitutes, station-distance guesses, a new
position-only UI, or fabricated minute values. Continuous ETAs for such trains
require an additional verified prediction source or an explicitly chosen
prediction model. The inference that operator boundaries cause missing values
is not established by these observations.

## Verification

Actual public upstream rows are stored without credentials. Regression tests
cover same-response duplicates, cross-poll ETA preservation and expiry,
station/direction separation, departures, destination conflicts, independent
destination corroboration, and graceful position-feed failure. Existing
station and arrivals tests and the production build must pass before release.
