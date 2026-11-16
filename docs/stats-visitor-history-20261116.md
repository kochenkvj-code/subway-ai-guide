# Visitor history across the full retained period — 2026-11-16

Clicking a visitor ID previously filtered only the date-bounded rows already in
the browser. A visitor query now loads all retained events for that exact UUID,
plus activity for those sessions, without a calendar restriction. This is
browser identity history, not a claim of person/device identity. Visitor-less
legacy records cannot be retroactively attached to an ID.

The authenticated /api/stats/report endpoint accepts visitor=<UUID>. It validates
that UUID before any DB request, retains the existing admin authorization and
no-store response, applies visitor_id equality, and paginates events and activity
in batches of 1,000 until exhausted. Activity is summed across stored pages for
matching sessions. No database schema, RLS, collection or existing data changes.
The existing visitor_id index is already present in stats-browser-visitors.sql.
Ordinary date reports preserve their original 93-day limit and activity RPC.

Admin UI maintains separate date-report and visitor-history state. Summary cards
and charts remain date-scoped. The raw access/activity list and AI question list
show the selected visitor's full history with explicit labels. Clicking an ID
resets record filters to all. Clearing the ID restores the selected period.
Aborted or stale requests cannot replace another visitor's results. History
loading/failure is separate from the general report and does not show stale rows.
No polling or automatic refresh is added.

Validation: 39 statistics tests pass, including unauthorized/invalid UUID cases,
1,001 event rows, 1,001 activity rows, omitted dates, full-period activity sums,
and unchanged date RPC/range rules. Full required build and 269 tests pass.
Browser → real report handler → local fixture REST server confirms a year-old
question, three sessions including access-only history, exact visitor isolation,
full activity time, unchanged date cards, filter reset, restoration and error
handling. The fixture uses no production secrets, data or writes.

Changes are local only. No production/preview deployment, migration or external
message. Customer-office sharing labels were removed in a separate local commit;
their backend mappings remain intact.
