# Route display/source language separation — 2026-11-18

## Scope
- Current app language now controls existing route result headings, station/line labels, official itinerary, intermediate stops, map button, feedback and share/delivery controls.
- AI answer, walking prose and submitted destination remain unchanged. No language-change effect or new API call was added.
- `resultLang` remains the search request's original language and is still serialized to the existing signed snapshot. App language changes do not update it. Share button receives a separate displayLanguage; source metadata, sharing permissions and snapshot identity are unchanged.
- Gemini's translation instruction now specifies only the target language by name (Korean/English/Japanese/Simplified Chinese). All remaining translation instructions, model/settings and validation remain unchanged. Source-language comparison for translation bypass and cache behavior remains in the existing API.
- No CSS/layout, other feature, model, database, role, map query or cache changes. Latest crowding/UI commits are preserved.

## Verification
- `npm run build`: 315 tests passed; Next production build succeeded.
- `tests/route-display-language-ui.cjs`: admin and nonadmin in-flight Korean searches switched to English, all four display languages switched on the existing result, original AI prose/title/map query retained, zero additional search/route calls, original Korean share language retained, share dialog translated, Korean passenger bypassed translation, Japanese passenger reused cached translation.
- `tests/route-sharing-ui.cjs`: station-only/place routes, original share language despite new display language, public snapshot viewing, expiry, zero route/AI refetch and 320/390/768 widths.
- `tests/guidance-ui.cjs`: existing interpreter delivery/room/draft preservation, lazy cached translation and language changes, original map query and three widths.
- Browser API/model results were fixtures. Tests do not establish live Gemini translation quality or measured latency improvements.
- Final production-code diff limited to RouteLab.jsx, RouteShareButton.jsx and translate-route-fields.js.

## Rollback
Tag: `rollback-before-route-display-language-20261118`
Prior main: `5d5e6d8f6a3c0f7b376935c4c7d95f534015cd09`
Prior production deployment: `dpl_4d8eUxvAPbr5bvWpewD5tJQ9p5m9`
Prior URL: `subway-ai-guide-gnob969d7-t5-b.vercel.app`
Normal Git revert can restore the previous code. Vercel rollback can restore the recorded deployment; platform rollback may pause automatic alias assignment until promotion. No database rollback is needed.
