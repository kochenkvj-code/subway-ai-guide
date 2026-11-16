# Preserve facility information while improving legibility

The approved scope is presentation improvement, with no loss of previously
displayed information. This follow-up is local only; no deployment is authorized.

## Corrections

- Keep the full facility identifier (`Elevator 04`, locker number range, etc.)
  visible even when a category or search contains only one record.
- Restore restroom type and gender details to the information-chip group.
- Retain visible connected-floor and telephone action labels, record-count units,
  and original source-name tooltips.
- Match telephone text to the 11px information chips, retaining hyphen formatting
  and the `tel:` link. Allow long translated phone labels to wrap.

The data extraction and translation functions remain unchanged.

## Verification baseline

`tests/fixtures/facility-display-before-open.json` records the values produced
by the pre-redesign `info()` and `describe()` functions from commit
`06b7d58884e1156de2867e74481f83d50192146d`. It uses the seven-category,
14-record fixture in `tests/facility-guide-ui.cjs` across all four languages.
There are 232 expected displayed values, including record identities, locations,
status, floors, exits, fare-gate side, accessibility, hours, restroom details,
locker capacity, nursing-room instructions, stroller access, ATM provider and
telephone information.

The browser test checks those baseline values in the corresponding rendered
records, single-result identifiers, restroom-chip presentation, equal telephone
and chip font sizes, and responsive layouts at 320/390/768px. The normal build
suite and standalone/wide/error-state browser checks remain required.

This fixture covers representative records and does not claim a live survey of
every station. API payloads, station matching and provider data are unchanged.

## Local result

- Production build passed, including 269 unit tests.
- All 232 baseline-value comparisons passed in the browser, along with
  single-result identifier preservation and equal 11px telephone/chip text.
- Four languages at 320/390/768px, main and `/v2` entries, standalone/wide views,
  and partial/empty/failure states passed without browser errors.
- No production deployment, remote Git push or database change was performed.
