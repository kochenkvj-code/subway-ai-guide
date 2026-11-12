# Browser visitor identity release — 2026-11-12

Baseline commit: `0a54d02819e43c076ab0c044cae72c156a926283`.
Remote branch: `backup/before-browser-visitors-20261112`.
Annotated tag: `rollback-before-browser-visitors-20261112`.
Baseline production deployment: `dpl_D11JE7fLfLEJN5Bxb2T7U4mAdsMu`.
Project: `prj_AarjheGYfoVmMkbiAwg7EMkbALxx`, team `team_7CqUKa0HUcTaAhbsO6WH4zbG`.

For immediate recovery, restore the baseline deployment alias in Vercel. Revert
this release commit on latest main for source recovery; do not force push or
restore unrelated old files. Rollback may pause automatic alias assignment.

DB migration only adds nullable UUID visitor_id fields and a new SECURITY INVOKER
service-role-only activity v3 RPC. v1/v2 RPCs, report RPCs and all records remain
valid. Leave the additive migration in place when rolling code back; do not
restore the database or delete new records. Historical records remain null:
there is no IP/device/time-based backfill or identity merge.

## Identity and session meaning

A random browser visitor UUID is stored in localStorage, expiring after180days
without use. A session UUID is shared in localStorage and renews on the next
interaction after30minutes without recorded interactions. A visible page's
15second heartbeat alone does not keep the session alive. Reload, focus return
and analytics events count as interactions. Pointer and keyboard events refresh
the timestamp without issuing network calls or storing the interaction contents.
Web Locks serialize creation/renewal across supported same-origin tabs; older
browsers fall back to synchronous localStorage coordination (concurrent first
writes may still race there). Persistent storage blocked: tab-session fallback,
visitor_id=null, no browser-wide identity is claimed. Storage clearing, private
contexts, another browser and another origin create independent identities.

No fingerprint, raw IP or hardware identifier is added. Opt-out prevents identity
allocation/update and analytics delivery; it does not retroactively delete data.
The visitor ID is pseudonymous usage linkage, not proof of a physical person or
of abusive traffic. browser UUID expiry does not delete server-side statistics.

## Admin interpretation

Visitor totals count known visitor UUIDs in the selected period, independently
of list filters. Sessions without visitor_id remain visible in All but are not
counted as known visitors or matched to visitor-specific filters. Repeat means
at least2sessions in the selected period. Short-repeat means at least3sessions
with measured screen time at most15seconds in that period; unmeasured durations
are not assumed short. These are analysis filters, not automatic bot judgments.
The visitor-ID button applies an exact-ID filter across sessions in the period.
Parallel visible pages contribute their measured page time to the shared session;
this is screen time summed by page, not deduplicated wall-clock person time.

## Verification

Stats unit/API/identity checks, full npm build suite and local production browser
checks cover concurrent tabs, reload,30minute renewal, visitor expiry, opt-out,
blocked storage, legacy compatibility, no added per-keypress network traffic,
admin filtering and mobile width. Production DB RPC verification uses a rolled
back transaction so synthetic visitor/activity records do not remain.
