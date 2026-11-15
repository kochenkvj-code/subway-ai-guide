# Temporary legacy activity origin diagnostics — 2026-11-15

Purpose: identify the source of undated, visitor-less activity checkpoints.
The activity endpoint emits `[stats/activity-legacy-origin]` only when a validated
checkpoint omits `activity_date`. The existing RPC, payload and response remain
unchanged. The dashboard, event collection, reports and database schema/data
are not changed by this patch.

Logged fields: session/page UUID prefixes (8 characters), Origin host,
Referer origin and pathname (no query/fragment), receiving server origin,
server commit prefix (12 characters), and the submitted visible milliseconds.
No IP, raw User-Agent, authorization, message text, cookies or full IDs are logged.
Origin/Referer are untrusted browser-supplied diagnostic hints, not proof of identity.
Missing headers are null.

Inspect Vercel application logs promptly after recurrence; log retention is limited.
Match the session prefix to the admin list. If an old standalone deployment sends
to its own unchanged API, this patch on current production cannot observe it.
No synthetic activity should be posted to production for verification because
that would contaminate the presentation statistics.

Removal: remove the temporary comment and `if(day===undefined)` logging block in
`app/api/stats/activity/route.js`, remove its two focused diagnostic tests, and
redeploy. Keep any unrelated later changes. Delete this note when investigation
is complete. Existing server log retention applies independently.

Rollback baseline: `9986aa33c808e63a7e90973a7e764297c35f7e7b`.
Remote tag: `rollback-before-stats-legacy-diagnostic-20261115`.
Pre-change production deployment: `dpl_7pbMaX35btF7S85KFz7H24RiLhKF`
(`subway-ai-guide-kweapmcpl-t5-b.vercel.app`).

Verification: stats tests cover unchanged legacy/modern RPC routing, diagnostic
source extraction and query/credential omission; the required build suites also
run. Production verification uses deployment state and read-only page fetches.
