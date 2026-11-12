# Statistics stabilization — 2026-11-12

Rollback source: `3fc9c50d880c2242a6ee7066776c96bca4456d22`.
Remote branch: `backup/before-stats-stabilize-20261112`.
Annotated tag: `rollback-before-stats-stabilize-20261112`.
Previous production deployment: `dpl_6h67EiHY4jmNDi9uMKnMTnFgALfi`.
Previous production URL: `https://subway-ai-guide-h86i1czmd-t5-b.vercel.app`.

For immediate recovery, promote/rollback to that deployment in project
`prj_AarjheGYfoVmMkbiAwg7EMkbALxx`, team `team_7CqUKa0HUcTaAhbsO6WH4zbG`.
Confirm `subway-ai-guide.vercel.app` points to it. Vercel rollback may disable
subsequent automatic production alias assignment; check before the next release.
For source recovery, revert this release commit on latest main; do not force push.

DB migration `stats_daily_activity_checkpoints` only adds nullable `activity_date`
and two new service-role-only SECURITY INVOKER RPCs. Existing activity RPCs,
tables and event rows remain usable. Leave these additive objects in place when
rolling code back: old tabs/old deployment still work. Do not delete accumulated
statistics or restore a database snapshot. New client checkpoints also remain
readable through the old total-time RPC, although old UI totals span all dates.

Daily segmentation starts at this release. Historical rows cannot be exactly
split across midnight; their full duration belongs to their original KST start
date in the new period report. No historical durations or event timestamps are
rewritten. Previous unsupported/dropped actions cannot be recovered.

Client limits: existing events queue retains at most100 entries for30minutes;
activity queue coalesces latest totals per page/day, at most100 checkpoints,
30minute retention, one request at a time,12second timeout and exponential
retry2–60seconds. Saved activity survives same-tab reload, not guaranteed after
closing the tab or killing the browser. No analytics delivery blocks the
passenger's request. Activity checkpoints remain every15seconds while visible;
only admin stats refresh every30seconds while visible.
