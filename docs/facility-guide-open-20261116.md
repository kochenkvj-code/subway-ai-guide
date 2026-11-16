# Facility guide: visible locations and information chips

Approved design: the second facility-guide demo, with every supplied location
visible and no detail or additional-location disclosure controls.

## Changes

- Group facility records in compact category cards; emphasize the location.
- Show every matching record, including categories with more than three records.
- Present floors, exits, fare-gate side, accessibility, provider status, hours,
  nursing-room usage, locker capacity and ATM provider as visible information.
- Preserve toilet details and readable telephone links without extra taps.
- Use the same display component in the main mobile flow, `/v2`, the standalone
  facility page, the station-office test page, and wide view.
- Replace accumulated inline style overrides with one facility-scoped stylesheet.
- Embed only the required Lucide icon geometry; no new package or network request.
- Keep station matching, API requests, translation, office sharing mappings,
  excluded stations, and statistics collection unchanged. Search also includes
  the translated accessibility and fare-gate labels shown on screen.

## Verification

- `npm run build`: 269 tests passed; Next.js production build passed.
- `tests/facility-guide-ui.cjs`: seven categories and 14 visible records,
  fourth elevator and fifth escalator retained, no collapse controls, four
  languages at 320/390/768px, all filters, search, readable phone links,
  standalone and wide entries, partial/empty/failed responses.
- `tests/station-office-ui.cjs`: 12 existing office scenarios passed, including
  shared sources, independent loading, office failure, and excluded stations.
- `tests/v2-facility-route-ui.cjs`: existing translation/source fallback and
  facility-record checks passed; route UI checks remained passing.
- Browser checks used the local production build and fixture responses. No
  synthetic production statistics, Gemini requests, or DB writes were made.

## Rollback point

- Remote tag: `rollback-before-facility-open-20261116`
- Commit: `06b7d58884e1156de2867e74481f83d50192146d`
- Production deployment: `dpl_8CuaKc5Vj4Mu6VKnjmoLxudD9s73`
- Deployment URL: `https://subway-ai-guide-qhqy3k9a9-t5-b.vercel.app`
- Team: `team_7CqUKa0HUcTaAhbsO6WH4zbG`
- Project: `prj_AarjheGYfoVmMkbiAwg7EMkbALxx`

The tag was pushed and the deployment was confirmed as the active production
deployment before editing. An immediate Vercel rollback can target this
deployment without rebuilding. A source rollback can restore the tagged
facility files in a subsequent commit. No schema migration is involved.

Production is released from `main` after local validation. No preview deployment
is needed for this change. Deployment identifiers and smoke-check results are
recorded in the local release record under `work/facility-redesign/`.
