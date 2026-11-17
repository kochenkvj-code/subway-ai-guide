# Interpreter operational integration

## Release / rollback
- Previous production commit: `69bc3f81008c6b8a9e7aecfc45ced45e1d1c3362`.
- Pushed annotated tag: `rollback-before-interpreter-realtime-20261117`.
- Previous deployment: `dpl_Hr7raNoerXwAaHKR6RoiE22yoHgw`.
- DB: three additive migrations in `supabase/migrations`. Existing messages/rooms and
  original non-null fields are retained. Pre-change schema snapshot is in the
  release workspace `work/release/db-before.json` (no conversation contents).
- Restore the previous deployment first. Schema additions may remain during rollback.
  After at least 90 seconds without new-version traffic, run
  `database/interpreter-cleanup-rollback.sql`, then `database/interpreter-realtime-rollback.sql`.
  Rollback removes only new request bookkeeping/topics/policies/functions/triggers;
  it does not restore expired/deleted conversations, and must not restore those private contents.
- Expiry access remains 30 minutes. Cleanup runs every 5 minutes; cascading deletion
  removes messages and request records. pg_cron stays installed on rollback.

## Independent publication settings (server environment variables)
- `INTERPRETER_MODE=admin` (default): button visible and creation allowed only with admin session.
- `INTERPRETER_MODE=trial`: public button; no station password. Existing IP/room/message limits stay.
- `INTERPRETER_MODE=station`: public button; create requires `stationPin === stationCode`.
  The code must also exist in the station master. No employee accounts or additional sessions.
- `QR_SHARE_MODE=admin` (default) or `public`: independent of interpreter mode.
- `SUPABASE_PUBLISHABLE_KEY`: public browser key; never use the secret/service-role key here.
- Changes to deployment env settings take effect on the next production deployment.
  No hardcoded release dates or automatic publication.

## Authorization and realtime
Existing `/api/stats` cookie remains scoped to that path. Its authenticated status
endpoint exchanges it for a separate root-scoped HttpOnly `sag_staff_access` cookie,
HMAC-signed with a different purpose. Stats privileges are not granted by station codes.
Logout clears both cookies. Admins logged in before this release acquire the staff cookie
on their next guide visit/focus without re-entering a password.

Private Broadcast subscriptions use a 244-bit random per-room topic as a short-lived
subscription capability, not an employee identity. Only the bearer-authenticated room API
returns it. Realtime SELECT policy checks that exact topic and the active room's expiry.
The publishable key alone cannot guess or subscribe to another room. There is no client
INSERT policy. No raw chat/token is broadcast; payload is `{}`. Room content tables
remain inaccessible to anon/authenticated roles. No Supabase Auth accounts/custom JWT
signing secrets are created. A still-connected client may receive a final close notification;
content reads always recheck expiry/role and cannot access a closed room.

Transactions emit notifications after changes; an exception in notification enqueue is
caught so it cannot roll back a successful translation. Reconnect/focus synchronizes all
(up to 36) messages. No regular content polling while SUBSCRIBED. If connect fails, use
8-second polling and retry subscription every 15 seconds. Foreground/online events sync.

Requests are scoped by room + sender + client UUID and content fingerprint. A 90-second
lease prevents concurrent translation; stale/failed requests can be retried with the same
ID and frozen languages. This prevents normal duplicate calls, not perfect exactly-once
billing after an ambiguous upstream response/crash. No queue or worker introduced.

## Validation
- `npm run build`: existing regression suites plus interpreter API/access/sync tests.
- `npm run test:stats`: existing admin/statistics regression.
- `npm run test:interpreter-db`: isolated PostgreSQL concurrency tests, uses Docker
  `metro-interpreter-db-20261117`. Bootstrap fixture in `tests/fixtures/interpreter-db-bootstrap.sql`.
- Local browser tests at 320/390/768 pixels and all four display languages.
- Never seed chatbot statistics for release tests. Interpreter test rooms use synthetic
  text and are explicitly closed/deleted after integration checks.
- Physical iPhone/Android microphone and background behavior still require device checks.

### Verified results (2026-11-17)
- Production build: 285 tests passed; existing statistics suite: 39 passed.
- Real isolated PostgreSQL tests passed under `service_role`, including 40 simultaneous
  claims / 36 simultaneous completions, request replay, stale attempt rejection,
  frozen language, close-versus-finish and denied anonymous content access.
- Browser: 12 chat QR combinations (4 languages × 320/390/768), all ten menu headers,
  main interpreter link, two independent contexts, healthy idle polling suppression,
  forced WebSocket failure → 8s polling → reconnect → polling stopped, and closure.
- Browser uses intercepted API/Realtime frames, not live Gemini or live Supabase sockets.
- Production SQL verifies exact-topic authorization, denied content/RPC grants and an
  active cleanup job with a successful run. Synthetic check room was removed.
- This environment blocks external WebSockets (proxy HTTP 403; direct DNS unavailable).
  End-to-end live Supabase socket and physical phone speech checks remain a limitation;
  automatic polling fallback is included and tested. No exact total-cost savings claimed.
