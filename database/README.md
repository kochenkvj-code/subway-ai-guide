# Statistics storage

`stats-activity.sql` records the additive production schema upgrade applied through
Supabase migration `gate_actions_and_visible_session_time`.

- `chatbot_events`: action log, including `gate_action` names and optional
  allowlisted `gate_*` context on feedback. `created_at` is the server receipt
  timestamp; `occurred_at` is the validated client action time used for display.
  Historical rows without an action timestamp retain server receipt ordering.
- `chatbot_session_activity`: one anonymous segment per page load. Reloads create
  a new page ID but retain the existing tab session ID. Only cumulative visible
  milliseconds are updated, not appended to the action log.
- Write/read RPCs are security-invoker functions callable only by `service_role`.
  RLS blocks direct public access; the Next.js API retains the server secret.
- The report now sums tracked segments within the selected KST dates using
  `get_chatbot_activity_range`. New clients split at KST midnight. Historical
  unsplit rows use their original start date; unmeasured sessions show `미측정`.
  See `stats-activity-daily.sql` and `docs/stats-stabilization-rollback.md`.
- Checkpoints run every 15 seconds while visible and on hide/pagehide. Visibility
  resumes on return (including the back/forward cache). Abrupt termination or
  network failure can lose the final unsaved interval. Visibility measures an
  open screen, not proof of reading or issue resolution.

Verification: production RPC updates were exercised inside a rolled-back SQL
transaction, including a lower out-of-order update and multiple page segments.
Local production-mode browser/API/report verification used an isolated local
PostgREST fixture, including reversed request arrival, background pause/resume,
reload, admin authentication and detailed gate feedback rendering.

Facility selections reuse `quick_menu` / `facility` with an allowlisted
`facility_*` context (see `app/lib/facility-stat.js`). No schema upgrade is needed.
Menu-open events retain a null context. The admin view counts facility selections
separately from top-level menu opens and names each selection in the activity log.
Historical null-context events cannot identify which facility was selected.

Browser-level visitor identity is described in `stats-browser-visitors.sql` and
`docs/browser-visitor-rollback.md`. Visitor UUIDs are separate from 30-minute
shared browser sessions; historical records retain null visitor IDs.
