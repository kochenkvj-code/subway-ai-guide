# V2 root cutover and rollback — 2026-11-09 KST

## Verified pre-cutover production baseline

- Commit: `22614e9c51015a641e4de7a8d45ea909df782052`
- Remote branch: `backup/before-v2-root-20261109`
- Annotated remote tag: `rollback-before-v2-root-20261109`
- Vercel production deployment: `dpl_CrKewgDed8Rk5JYtrqQBhR8CEaZj` (READY before cutover)
- Deployment URL: `https://subway-ai-guide-1n8v3ccle-t5-b.vercel.app`
- Inspector: https://vercel.com/t5-b/subway-ai-guide/CrKewgDed8Rk5JYtrqQBhR8CEaZj
- Project: `prj_AarjheGYfoVmMkbiAwg7EMkbALxx`; team: `team_7CqUKa0HUcTaAhbsO6WH4zbG`

The branch and annotated tag were pushed before modifying entry pages. No environment variables, database records, API routes, models or schemas are changed by this cutover. A previous deployment still uses shared external services; reverting deployment does not revert external data or credentials.

## Address contract

- `/`: V2, defaults to station `0154` only when `station` is absent.
- `/?station=0150`: V2 for the specified station; leading zeros retained.
- `/?from=gate`: V2 gate guide for `0154`, English by default.
- `/?station=0150&from=gate`: old QR compatibility; same station, English unless `lang` specified. Existing entry adapter normalizes to `view=gate` and retains the language.
- `/?station=0150&view=gate`: new gate URL; selected language supplied by the QR generator (`lang` absent means Korean).
- `/v2?...`: still renders V2 and honors existing query parameters. QR links copied from either V2 entry use root `/` rather than `/v2`.
- `/legacy`: unchanged old `GuideExperience` with original behavior.
- `/legacy?from=gate`: unchanged original English gate experience.
- Invalid or empty station codes remain invalid; no silent reassignment to another station.

## Immediate production rollback

1. Open the recorded Vercel deployment in project **subway-ai-guide**, team **t5-b**.
2. Select **Rollback** to that exact deployment (or use authenticated CLI: `vercel rollback https://subway-ai-guide-1n8v3ccle-t5-b.vercel.app`). Verify production alias `subway-ai-guide.vercel.app` moves to that deployment.
3. Verify `/` renders old GuideExperience, `/?from=gate` opens the old English gate guide, and `/v2?station=0152` renders V2 for Jonggak.
4. Record the incident and align Git main before allowing another production push. Vercel rollback may disable automatic production alias assignment; inspect that state and explicitly promote the intended production deployment when resuming releases.

This cutover adds `/legacy`; rolling all the way back to the baseline naturally removes `/legacy`. The old experience remains at `/` on that baseline.

## Source rollback without overwriting other work

Find the exact cutover commit with `git log --oneline -- app/page.js app/v2/page.js app/legacy/page.js`, inspect its diff, then `git revert <cutover-commit>` on a fresh checkout of current main. Review conflicts and later entry changes; never reset/force-push main or restore an old full tree over newer changes. Run build and URL regression tests, then push the reviewed revert. The remote tag remains a full source recovery point.

## Verification

- `npm run build`: existing required tests and Next production build.
- `node tests/v2-root-cutover-ui.cjs`: actual built UI with mocked APIs; root/default/station/invalid, both gate query forms, /v2 compatibility, 4 languages, selected-station QR URLs and clipboard, reload/back/home, legacy rendering and English gate behavior, route cross-navigation, mobile overflow.
- After deploy: verify READY deployment SHA/production alias, live root/legacy/v2 HTTP responses and shipped entry bundles. Local browser fixtures do not establish live provider availability; separately check existing station endpoints without calling paid AI.

## Statistics continuity

The existing statistics endpoint and tables are shared by V2 and legacy. No schema migration or historical rewrite is performed. The data has no version or station dimension, so past V1/V2 events cannot reliably be separated retrospectively. The admin title is made service-wide and its feedback link uses root. The V2 first-visit event now uses the actual entry language, and newly supported menu event names (`timetable`, `found`, `lost`, `feedback`) are accepted by the event validator. Route, live and feedback entry clicks are covered without duplicating embedded gate/fare initial events. Existing event IDs, session IDs, delivery retries, time-zone reporting and admin authorization are unchanged. Full deployment rollback also restores the preceding statistics validator and labels; newly collected records remain in storage.
