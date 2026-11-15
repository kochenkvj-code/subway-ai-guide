# Train lost-property live search window — local review

Base commit: 34756051baca98cf0e6e5dbc121d30a05271b53c.
Local rollback tag: rollback-before-train-lost-window-20261115.
Branch: train-lost-window-20261115.
No remote push, preview or production deployment is authorized for this change.

Changes:
- Shared minute-resolution validation accepts elapsed 30:59.999 and rejects
  31:00.000. Invalid elapsed values remain rejected and the exact two-minute
  future tolerance remains unchanged.
- Lookup preflight, candidate calculation, validLocation and the KST previous-day
  inference use the same validator. validLocation currently has no callers; its
  retained validation is updated for consistency without wiring new behavior.
- The existing KST date-inference trigger (more than one minute ahead of now)
  is preserved. Month/year and leap-day rollover are covered.
- Relative-time slider still ends at 30. Manual elapsed display uses floor.
- Range errors are stored as an error code and rendered in the selected ko/en/ja/zh
  language, including when the language changes after the error appears.
- Only this error receives centered alignment; other warning styles are unchanged.
- Candidate ranking, direction/topology, freshness checks, chosen-train retention,
  polling, and the existing 1–10 car selection are unchanged.

Validation:
- Before the fix, a clock of 13:30:40 allowed 29 minutes ago but rejected 30.
- 78 lost-property tests pass, including new boundary coverage at nonzero seconds,
  30:59.999/31:00, exact future limits, midnight/month/year/leap-day transitions,
  and stale/wrong-direction rejection.
- The full required test/build command passes 262 tests and the Next.js build.
- Browser tests use a local production build, fixed clocks and API fixtures.
  They do not query Gemini, send SMS, or write production statistics.
- Browser verification passes 48 cases across ko/en/ja/zh and clocks at
  13:30:40, 13:30:59.999 and 00:10:40 KST: 29/30-minute slider queries show a
  candidate; manual 30-minute queries work; manual 31-minute queries are blocked
  before the live API call. Each error is localized and centered, and changes
  language when the user switches language without another API request.

Files: app/lib/train-lost-time.js, app/lib/train-lost.js,
app/v2/TrainLostFinder.jsx, app/v2/TrainLostUI.jsx,
app/v2/train-lost-redesign.css, tests/train-lost-time.test.mjs,
tests/train-lost-window-ui.cjs, tests/train-lost.test.mjs and package.json.

No production or preview deployment was created, and no remote branch was
pushed. Browser API responses are fixtures; real train availability at a given
alighting time is not guaranteed by accepting the search window.
