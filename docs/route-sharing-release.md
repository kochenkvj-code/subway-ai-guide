# Route result sharing

Scope: output-language selection, read-only reusable results, signed snapshots shared for 24h.
No interpreter room delivery feature in this release.

Rollback: pushed tag `rollback-before-route-sharing-20261117`, commit
`f1eb8b1631589f913cc998e386184868a2aaed21`, deployment `dpl_CxqnHuqLjdEaeaNAmeotGk7ReLvb`.
DB is additive: new `route_result_shares` table, server-only RPC and cleanup job.
Existing route APIs/tables need no data restoration. Restore code first; additions may
remain to expire naturally, or remove via `database/route-share-rollback.sql`.
Removing the table invalidates its shared links; no unrelated data is deleted.

`ROUTE_SHARE_MODE=public` enables creation without admin; default is admin only.
Independent of interpreter/ordinary-menu QR settings. Existing root-scoped staff cookie
and admin login exchange are reused. Query/read is public via unguessable 256-bit IDs;
DB RLS + revoked anon/authenticated table/RPC grants enforce server-only access.
No IP, admin cookies, chat tokens, debug data or signatures stored in snapshots.
Creator is an HMAC of session identity (public mode uses request IP fallback), not plaintext.
30 new snapshots/hour per creator, 100KB passenger JSON limit, same live snapshot reused.
Expiry enforced on every GET; cleanup every 10 minutes. No upstream APIs called on share/read.

HMAC uses `ROUTE_SHARE_SIGNING_SECRET` if set, otherwise existing server-only
`STATS_ADMIN_PASSWORD`, with distinct `route-share:` purpose. Normal search behavior
continues with null proofs if signing is unconfigured. Place and official responses are
signed separately with 24h proof validity; share creation validates exact recommended
station code/origin/language. Stored snapshots contain only passenger fields and version1.
Place-name localization is optional within the existing model call; Korean route_station
policy is unchanged. Completed result language is frozen, including browser history state.

Tests: complete build, six signing/API tests, isolated Postgres reuse/rate/expiry/grants,
4-language station search, Japanese place guidance, bottom-language change, read-only
shared page with zero extra Gemini/route calls, expiry and 320/390/768 widths.
Browser uses fixture API responses (not live Gemini translation quality). No synthetic
chatbot analytics are written. Local screenshots/logs are under work/.

Release validation: 293 build tests passed, six dedicated proof/API tests passed,
isolated PostgreSQL test passed under service_role. Browser tests passed on final
production build. Production DB RPC creation/reuse was checked in a rolled-back
transaction; no synthetic shared links or chatbot activity records were retained.
