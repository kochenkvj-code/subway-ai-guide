# Facility record deduplication — 2026-11-18

Scope: exact JSON record deduplication after station filtering/page merging, before category counts and caching. Applies to all six facility API categories and the separately loaded customer safety office category. No UI, translation, source selection, API credentials or database changes.

Object key order is ignored recursively; array order, value types, null and missing fields remain distinct. Different records are retained even when their IDs or locations match. ID conflicts emit only category and differing field names to server diagnostics. Original rows are not modified.

Verification: `npm run build` includes `test:facility-records` (six regression tests), plus existing application checks. API fixture covers repeated records within and across pages, corrected cache counts, different IDs, changed timestamps, missing IDs, nested field order and safety office integration. Acceptance: Jongno 5-ga TL129A/TL129B = two banks / 32 compartments; Dongmyo line 1 TL127A = one bank / nine compartments.

Rollback code tag: `rollback-before-facility-dedup-20261118`
Previous main SHA: `b9cbf8e8c958dc60e433c3b4ca9da503d72458aa`
Previous production deployment: `dpl_H5MXasLGz3vrpruFd7Ws9ZH38289`
Previous deployment URL: `subway-ai-guide-6z6dn4ecm-t5-b.vercel.app`

To restore code through normal Git deployment, revert this release commit on current main. Vercel can alternatively roll back to the recorded deployment (note that platform rollback can suspend automatic alias assignment until promotion). No DB rollback is required.
