# Timetable lab: static crowding (2026-09-30)

Source: user-provided Seoul Metro quarterly XLSX, 3 worksheets (weekday/Saturday/Sunday), 1,671 records, 282 exact line/station-code pairs. These are historic averages, not real-time or train-specific observations.

Run from repository root to replace with a newly published file:

```sh
python3 scripts/build-timetable-crowding.py path/to/new.xlsx --date YYYY-MM-DD
npm run test:timetable-lab
```

Only app/data/timetable-crowding.json needs replacement on a source refresh, followed by the normal single deployment. The compact file contains six 42 half-hour sequences per line/station code (weekday dir0, weekday dir1, Saturday dir0, Saturday dir1, Sunday dir0, Sunday dir1); each character is class 0/1/2/3 or 4 (unknown). Preserve each source half-hour independently, ignoring no-service/zero or missing values; no artificial values for 25h. Passenger-facing thresholds (50,80,110) follow the shared CONGESTION_THRESHOLDS in app/lib/congestion-data.js. These display categories are a custom passenger guidance convention, not the official safety classification; no source percentage is changed. 05:00–05:30 remains unknown; only 05:30–06:00 has source values. Holiday tab uses Sunday statistics as an explicitly labeled reference, not proof of holiday measurements; weekend tab uses Saturday statistics as a labeled reference. Timetable API day semantics and responses are unchanged.

Separate station codes, ambiguous shared tracks, missing data and unmatched branch stations must not be guessed. The exact file contains extra codes 9002/9003 and 0260; no implicit alias remap. Approved statistical identity mappings: Seongsu main inner 0211, main outer 9001, shuttle 9002; Eungam return to Saejeol 2611 and loop entry to Yeokchon 9006 (both statistical direction 1). These are inferred from the original statistical series and adjacent stations, not an official code-definition document. Existing live two-column UI only uses the two main-line Seongsu directions, with no added shuttle column. Live special values require matching API records; missing records remain uncolored. Screens with one departure column color only its physical display-side half. Other special codes remain unchanged. The timetable makes no external congestion API call. Main and detailed arrival screens retain their existing source/API and access controls; only their shared passenger-facing classification and explanatory copy are updated. Static data loaded with the test page only.

A layout: hour buttons use two horizontal bands (00–30 / 30–60) and one cell per visual direction; direction headers are neutral, and departure minute chips use the corresponding half-hour category. Help dialog uses Yeoksam weekday 18:00, named next stops Gangnam/Seolleung, sourced from the same static dataset. Existing main-screen palette remains unchanged.
