# Station improvement ideas

V2 only: `/v2?view=feedback`. The existing production home and guide behavior are preserved. Public writers choose a category, optional location + 60-character location detail, and up to 500 characters of feedback. No photos, identity/contact fields, answers, workflow, or notifications. Four interface languages; opinion content is preserved in its original language.

## Station boundary

`app/lib/feedback-config.js` contains a shared allowlisted registry and stable station ID (`jongno5ga-1`). The current V2 has no working global station selector, so it uses its existing Jongno 5-ga station configuration. `V2Guide({station})` passes that identity to the feedback UI and badge. A future global selector must select from the same registry and pass its station object. Add the corresponding registered station before enabling it; do not derive IDs from localized names. The feedback pane is keyed by station, clearing drafts, list, filters, and auth UI on station change. APIs reject unregistered IDs. Every read, count, star, and hide includes the station ID. A single shared opinions table is used for all stations.

## Database and access

Apply `database/station-feedback.sql` before deployment. It creates `station_feedback` and an auxiliary short-lived rate-limit table (not an opinions table per station). Both use RLS, with no anon/authenticated grants. Only server service-role access is permitted. Functions use SECURITY INVOKER, empty search_path, and service_role-only execution.

Existing `/api/stats/auth` admin login grants inbox access, star and hide. From the statistics page, use “역 개선 의견함”, then “의견함 보기”. Staff-only PIN tokens grant read and star, never hide. Hidden opinions disappear from the list and thirty-day count. There is no delete or resolution workflow.

`FEEDBACK_STATION_PINS`: optional server-only JSON mapping registered station IDs to four-digit **strings**. Set real station values through the hosting environment when the station phone number integration is ready. No invented production PIN or station phone number is supplied. With no PIN configured, staff PIN access stays closed; existing administrator access still works.

`FEEDBACK_AUTH_SECRET`: optional server-only signing secret, falling back to the existing `STATS_ADMIN_PASSWORD`. A secret is required for submissions and PIN tokens. PIN changes invalidate existing tokens. Tokens are station-scoped, expire in eight hours, and are stored only in the browser tab's sessionStorage without localStorage or shared authentication state. They are not put into URLs. Reloading the tab retains authentication when sessionStorage is available; other tabs do not share it.

## Requests and counts

Public create: `/api/stats/feedback` POST. Lists: authenticated GET (ten per page, all dates), star/hide: authenticated PATCH. Count: public GET `/api/stats/feedback/count?station=…` returns only a number. PIN login: POST `/api/stats/feedback/auth`.

Atomic submission RPC deduplicates request UUIDs, checks duplicate payloads, and limits new submissions to five per ten minutes per station and hashed client IP. PIN attempts are limited to ten per ten minutes. Vercel's overwritten `x-vercel-forwarded-for` header is used only server-side for a daily keyed HMAC. Raw IP is never stored; rate buckets expire after ten minutes and are cleaned on subsequent limit checks. Shared networks may share the quota. No rate bucket is linked to an opinion row. Body byte limits and enum/length checks are enforced server-side. The client keeps the same request ID when retrying identical content after a transport failure, and disables double submit. Failed submissions retain input.

Counts use a rolling 30×24 hours and exclude hidden opinions. The inbox list includes older opinions. The badge is hidden at zero, updates on return home, successful local submission, focus, and every 30 seconds while the page is visible. Other clients' changes therefore appear within about 30 seconds, without a page reload. Count requests are aborted when the station changes. Empty/failed counts do not fabricate a number.

## Verification and rollback

`npm run test:feedback`: validation and token isolation/rotation/expiry. After `npm run build`, `npm run test:feedback-flow` starts isolated Next and PostgREST test servers on 3015/4315, then exercises browser→real API→test storage. Covers draft preservation, category, detail, submit/complete/back/home, badge, PIN, tab reload, star, admin-only hide, station filtering, thirty-day versus all-time, and four languages at 320/390/768px. Requires Playwright and Chromium in the development environment. Live Supabase tests use transactions and roll back all test opinions.

To revert UI/API release, restore the preceding Git commit; the additive DB tables can remain intact so opinions are preserved. Do not drop collected feedback to roll back the UI.

## Button filters, praise, hidden-item recovery

Apply `database/feedback-praise.sql` after the original migration. Category and location inputs are direct-tap button groups; optional location can be deselected. Praise is supported in all four languages. Only the existing top-left workspace back button remains. Administrators can choose visible/all/hidden records and restore a hidden record. Staff tokens cannot request hidden records or restore them. Hidden rows continue to be excluded from the public count.

Ten explicitly labeled test ideas were added on 2026-11-01 for Jongno 5-ga. Their request IDs have prefix `f00d0000-0000-4000-8000-`, and their content begins `[테스트 의견 n]`. They count toward the badge until hidden or removed. They are test content, not passenger feedback.

## Compact mobile inbox

The client requests one to three rows according to available viewport height, and reduces the page size if measured translated content would overflow. The API accepts only sizes 1/2/3, applies the same limit to offset calculation, and retains stable ordering. Resize and filter changes reset pagination. Opinion bodies show a two-line preview; tapping opens a native modal with the full content. The modal has an explicit close button, Escape support, and native focus handling. Station identity shares a heading row on the right throughout this feature. Staff controls share one horizontal row. No other feature's station display was changed.

The flow test seeds more than ten local test records and checks that the pager is visible without scrolling at 640/740/844px heights, including four-language small-screen cases, and that the next page can be reached.

## Four-to-five-record layout

Supersedes the earlier shrinking page-size heuristic: ordinary mobile panes request four items, taller panes five, without decrementing to a single item after a layout measurement. The inbox combines station/title and thirty-day count in one heading; removes the all-time explanatory row; and uses compact two-line cards with full content available in the dialog. Tests assert four or five records plus a visible pager across the supported mobile viewports and translations.

Apply `database/feedback-concourse.sql` before releasing this revision. It adds the `concourse` location to the existing constraint without rewriting records. Korean and Chinese location buttons fit on a single row of six; English/Japanese use two rows for readable labels. The write form places the 500-character counter beside its label and uses a short privacy/reference notice; the no-individual-response explanation remains at entry and completion.

## V2 navigation

Browser history stores guide steps as serializable in-tab state, so the header arrow uses the same history traversal as browser Back/Forward. Gate selection/results, ticket/card selection/details, official route search/results, and feedback entry/write/inbox/completion participate. The home shortcut appears only at detail steps. Returning to the main menu and explicitly opening a normal feature resets it; chat remains mounted and keeps its transcript. Feedback drafts remain mounted; a resumed draft gets an entry step behind it. Auth prompts do not create additional history steps, and successful submission replaces the write step to avoid returning to a submitted form. Language changes do not create navigation steps.

Direct entry is not trapped: native browser Back at the first app entry may leave the app. The app arrow at a direct menu entry instead offers a path to the home screen. Browser flow tests cover gate Back/Forward and reset-on-reentry, fare Back, route Back/Forward without refetching and reset-on-reentry, chat preservation, and feedback navigation. Chromium mobile emulation is used; actual Android/iOS hardware was not tested.
