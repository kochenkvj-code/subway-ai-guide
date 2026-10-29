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
- The report sums all tracked segments for the session IDs in the selected
  event period. This is cumulative session screen time, not time limited to that
  date range. Old unmeasured sessions display `미측정`.
- Checkpoints run every 15 seconds while visible and on hide/pagehide. Visibility
  resumes on return (including the back/forward cache). Abrupt termination or
  network failure can lose the final unsaved interval. Visibility measures an
  open screen, not proof of reading or issue resolution.

Verification: production RPC updates were exercised inside a rolled-back SQL
transaction, including a lower out-of-order update and multiple page segments.
Local production-mode browser/API/report verification used an isolated local
PostgREST fixture, including reversed request arrival, background pause/resume,
reload, admin authentication and detailed gate feedback rendering.
