# Route search / shared translation simplification — 2026-11-18

## Scope
- Restored `app/lib/route-place-prompt.js` byte-for-byte to `f4d5718^` (pre-QR sharing). Only the place_name instruction was removed.
- Search title and map query use the submitted query. Unexpected place_name markup is stripped without discarding its text. Existing station/walk/menu metadata parsing remains unchanged.
- Removed number equality and language-script heuristics from shared translation validation, including the official-station numeric exception machinery. Retained object/string fields, non-empty required translations, 6000-character cap, and metadata tag rejection.
- Added safe server diagnostics for search authentication, grounded search, result parsing, official route lookup, shared translation authentication/generation/validation and snapshot/claim/save stages. Logs contain stage/outcome/language/duration/error category, no full query, response text, share ID or tokens.
- No UI, DB/schema/data, caching, expiry, map linking, model, reasoning, search tools, or sharing authority changes. No new AI calls or translation exceptions.

## Verification
- `npm run build`: all 310 tests passed and Next production build succeeded.
- Added simulated search coverage: three destinations × four languages × administrator/nonadministrator headers (24 combinations), including unexpected inline tags, unchanged metadata, original title/map query and safe diagnostics.
- Translation tests cover full-width digits, Japanese number words, original proper names, invalid fields/empty/oversized/tagged responses, and cache/pending/same-language no-extra-translation paths.
- Review: production prompt equals pre-QR prompt; API model/thinking/Grounding/output budget unchanged. No UI diff.
- Actual Gemini calls were NOT exercised: direct POST connectivity from this workspace to the production deployment was blocked by the network proxy (CONNECT 403). No measured claims about live success rate or speed improvement. Browser fixtures and mocked API results must not be treated as live AI measurements.

## Rollback
- Tag: `rollback-before-route-simplify-20261118`
- Prior main SHA: `f709a14e789338ec0861f78cc53fc862048e7298`
- Prior production deployment: `dpl_AJSnhggwQEmBQmM799ZJRvmcV6fv`
- Prior production URL: `subway-ai-guide-1hw14sprl-t5-b.vercel.app`
- Restore using a normal Git revert, or Vercel rollback to the prior deployment (platform rollback may pause automatic alias assignment until promotion). No database rollback needed.
