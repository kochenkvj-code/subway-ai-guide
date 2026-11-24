# Public timetable, crowding and QR release — 2026-11-24

## Scope

All users use the existing administrator operation timetable, including its existing design, native DAY/SAT/END data, direction classification and crowding display. The previous passenger component and API remain checked in for rollback but are no longer selected by the main screen.

Home and live-arrival crowding and the timetable crowding endpoint are public. Missing statistics still leave arrival/timetable information usable. Production QR_SHARE_MODE and ROUTE_SHARE_MODE are public. Interpreter room creation, statistics, test timetable API and diagnostics keep their existing administrator restrictions. Existing guest access to a valid interpreter room is unchanged.

## Cache

The validated raw source is wrapped in Next.js unstable_cache with a 300-second revalidation period. Dataset revision, station, line and native day form the key. All pages and record identities are validated before a successful write. The callback throws on failure; stale/fallback results never become new successful cache entries. Pending upstream requests are deduplicated within the server instance. The existing bounded memory cache remains a secondary layer, using original fetchedAt timestamps rather than restarting freshness on read. Sources over 24 hours old are not served. businessDate is calculated per response.

The installed Next.js implementation was tested with controlled backing storage for cross-instance reuse and stale preservation on failed background revalidation. This is not a production failure-injection test. Largest reference CSV station/day raw source: approximately 305 KB UTF-8 (Seongsu weekday, 1,184 rows), below the 2 MiB cache limit.

## QR quota identity

Verified room/staff identities remain supported. Public creation uses a validated IP from deployment forwarding headers, with x-forwarded-for supported. Unverified staff cookies cannot choose a quota identity. If no valid identity exists, creation fails without a DB write instead of using a shared anonymous bucket. Existing database rate limits and 24-hour expiry are unchanged. Users behind the same public IP still share the IP quota.

## Rollback

- Code tag: rollback-before-public-crowding-qr-20261124
- Previous commit: 1dbf408959a8690c32f8e00d8e5d9b24a8291c22
- Previous ready production deployment: dpl_6MLHf7vyHPDaWUoS2nFfQagc52MB
- Before release: QR_SHARE_MODE and ROUTE_SHARE_MODE absent from project environment settings; INTERPRETER_MODE absent (defaults to admin).
- Release adds only production QR_SHARE_MODE=public and ROUTE_SHARE_MODE=public. Preview/development settings and secrets are unchanged.

For immediate restoration, roll back to the previous production deployment, whose environment snapshot predates publication. Also remove the two new production mode variables before a future rebuild of the old code. Keep the rollback tag; do not delete the old timetable component/API. No database migration or data rewrite is part of this release.
