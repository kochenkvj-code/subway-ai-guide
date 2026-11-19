# Timetable lab: static crowding (2026-09-30)

Source: user-provided Seoul Metro quarterly XLSX, 3 worksheets (weekday/Saturday/Sunday), 1,671 records, 282 exact line/station-code pairs. These are historic averages, not real-time or train-specific observations.

Run from repository root to replace with a newly published file:

```sh
python3 scripts/build-timetable-crowding.py path/to/new.xlsx --date YYYY-MM-DD
npm run test:timetable-lab
```

Only app/data/timetable-crowding.json needs replacement on a source refresh, followed by the normal single deployment. The compact file contains six 21-hour sequences per line/station code (weekday dir0, weekday dir1, Saturday dir0, Saturday dir1, Sunday dir0, Sunday dir1); each character is class 0/1/2/3 or 4 (unknown). Use the arithmetic mean of available positive half-hour statistics, ignoring no-service/zero or missing values; no artificial values for 25h. Thresholds follow the existing legend (80,130,150). The 05h class uses 05:30 only. Holiday tab uses Sunday statistics as an explicitly labeled reference, not proof of holiday measurements; weekend tab uses Saturday statistics as a labeled reference. Timetable API day semantics and responses are unchanged.

Separate station codes, ambiguous shared tracks, missing data and unmatched branch stations must not be guessed. The exact file contains extra codes 9002/9003 and 0260; no implicit alias remap. Eungam two departures share a provider direction, so no color there until separate mapping validated. No external congestion API call, environment key, admin setting, shared data, or existing main screen is changed. Static data loaded with the test page only.
