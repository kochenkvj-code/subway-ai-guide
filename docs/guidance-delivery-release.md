# Guidance delivery / translated route snapshots

## Rollback
Code tag `rollback-before-guidance-20261117` points to
`5a9d673431095db56c910bfab521a4b3a01ca3c2`, production `dpl_F4PgfZkydm7xbxAVYcQpW1jffy4d`.
DB pre-change column snapshot: release workspace `work/db-before.json` (schema metadata only).
Migration `20261117044443_guidance_delivery.sql` is additive. Existing text rows default
to message_type=text; no existing conversation/shared snapshot is overwritten.
Restore code first. New columns/cache can remain and expire naturally. Optional
`database/guidance-rollback.sql` removes new schema only; drain active rooms/translations
before doing this. Existing messages/source snapshots are not deleted by rollback.
Old clients receiving new cards through the new API get a plain guidance URL fallback.

## Behavior
No result-language dropdown (both roles); search uses current app/staff language.
Source snapshot/signatures/24h lifetime/ordinary admin sharing policy remain unchanged.
Public shared view defaults to explicit ?lang or primary browser language (unsupported→en),
allows local language changes, and leaves the source snapshot/map query unchanged.
Only free-text fields are translated. Official path/station/line/fare data use existing i18n.
No Google Search in translation; existing Flash-Lite LOW configuration is reused.
No new environment variables or employee sessions, no queue/worker, no pretranslation.

Translation cache is (share_id, language), FK cascade with the existing 24h snapshot.
Same language / station-only results: zero translation calls. Foreign place-guidance first
view: one successful translation call per target language; subsequent views reuse it.
Normal concurrent requests have one owner; 90s stale lease permits crash recovery.
Failed translations never become successful cache entries; max 3 attempts/language/result
bounds public costs. Ambiguous upstream failure can still incur an extra billed retry.
No exact price/latency claim: provider quality/cost was not measured in browser fixtures.
Output validation rejects metadata tags, obvious mixed scripts and altered numeric values
(excluding known numbered station names); bad output leaves official routing visible,
with retry/original explicitly offered. Unknown proper destination names can remain original.

Interpreter + control is staff-only. Existing menu definitions provide translated labels.
Cards use existing messages/Realtime and the 36-message cap; no chat translation on cards.
Menu IDs are server allowlisted. Route attachment verifies the active staff bearer token,
share expiry and exact equality of room station code with saved route origin (API + DB).
Staff rooms may create bound shares without obtaining global/admin QR privileges.
Only IDs/station context are in cards; no tokens in links. Menu frames are same-origin
under a full-screen overlay; proxy search reuses RouteLab. Parent room stays mounted/inert,
keeps receiving messages and preserves the draft. Read-only result may remain open if
room closes; its public link remains valid until snapshot expiry. Other panels close.
Lazy panel bundle preserves the initial interpreter workspace footprint.

## Verification
- Full build: 300 passing tests, plus a separately added numbered-station validation test.
- Isolated PostgreSQL under service_role: staff/guest isolation, allowlist, wrong-origin
  rejection, replay/count, 36 cap, closed rooms, 8-way translation claim, stale attempt
  rejection, cache reuse, cascade cleanup and denied direct anonymous grants.
- Browser fixtures: staff + / passenger no +, menu zero AI, proxy path with fixed station,
  retained room + draft, no speculative translation, first-view translation and cache reuse,
  language changes, original map link, and 320/390/768 widths.
- Existing route/share and no-selector regression scripts updated to the new contract.
- Browser model responses are fixtures, not live provider quality measurements. Physical
  iPhone microphone/keyboard checks remain a device verification limitation.
