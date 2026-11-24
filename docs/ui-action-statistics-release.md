# QR and timetable action statistics — 2026-11-24

Six new `ui_action` names are allowed: menu_qr_open, route_qr_open,
timetable_crowding_help, timetable_day_weekday, timetable_day_saturday,
timetable_day_holiday. Names are fixed across languages. Menu QR stores only an
allowlisted menu identifier as context. Route delivery inside interpreter rooms
is not counted as a QR click.

The existing recordStat queue, visitor/session IDs, exclusion preference,
occurrence timestamps and event-ID deduplication are reused. Calls never block
QR or timetable interaction. Initial/automatic selections, refreshes, repeated
selection of the current day, copy/download, hour changes and filters do not
produce these events. The standalone administrator timetable test page also
does not collect timetable action statistics.

The administrator report adds a separate detail-action chart for the selected
date range and Korean descriptions in each visitor's existing complete history.
Menu, visit and language counters keep their existing event filters. UI actions
count as functional use when classifying a session, not as menu selections.
Historical clicks were not collected and cannot be reconstructed.

Database migration 20261124101010_stats_ui_actions only extends the existing
valid_event_type check. No table, policy, permission, existing record or other
constraint is changed.

Verification: statistics unit suite, production build, browser clicks through
the real collection API into a fixture DB and back through the real report API,
plus the pre-existing visitor-history regression. Browser source/route/QR
backends were mocked; no test clicks were written to the production event table.

Rollback: tag rollback-before-ui-action-stats-20261124 at
635fa62dd4a71f3b652e606ea757c3ed17479a1f; previous production deployment
 dpl_XBTVDkHQMnjMwiHtWg7wsK5WCF2m. Revert/promote the old application while
retaining the additive DB constraint: old code remains compatible, and collected
ui_action records must not be deleted. No environment variables change.
