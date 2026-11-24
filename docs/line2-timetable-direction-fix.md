# Line 2 operation timetable direction correction — 2026-11-24

The operation dataset's main-loop IN/OUT values were mapped to the opposite
neighbors in the existing direction dictionary. Only the line-2 row classifier
changes: IN maps to dictionary ID 1, OUT to ID 0. UP/DOWN, the branch logic,
other lines, column metadata/order, crowding mapping and all shared arrival/lost
property data stay unchanged. Raw-source cache keys do not change: cached raw
rows are classified per response using the corrected adapter.

Ground truth: the uploaded official 20260901 CSV, matching dataset revision
895a541f-19c4-4457-a330-99ae77b0dc4b. Expected next stations were derived from
the same train number and direction's next chronological record, within 15
minutes and physically adjacent in the read-only graph, not from the mapping
under test. 11,437 pairs matched across 13 stations × DAY/SAT/END (39 station/day
combinations). Arrival-only, terminal and nonadjacent/unresolvable transitions
are excluded from this pair test, not inferred.

The 80 checked-in sample pairs cover Gangnam, Yeoksam, Seolleung, Seongsu,
Sindorim and both branches. Gangnam weekday train 2450: Yeoksam 21:02 →
Gangnam 21:03:30 → Gyodae 21:06. Train 2445: Gyodae 21:01 → Gangnam 21:03 →
Yeoksam 21:04:30. CSV fixtures are test inputs only, not service data.

Tests also preserve Gangnam's [Gyodae/0, Yeoksam/1] column metadata and the
existing day/direction/half-hour crowding lookups. No crowding values are flipped.
The full build and existing public/admin browser flow pass. Production API
verification is performed after deployment; CSV validation and live validation
are distinct.

Rollback tag: rollback-before-line2-timetable-direction-20261124
Previous commit: 52e422b9de7a6890676c0fa83478260144811a04
Previous ready production deployment: dpl_8ZSTcBEfHwRG4G1WTgHwacnT7AcR
No environment variables or database data/schema change.
