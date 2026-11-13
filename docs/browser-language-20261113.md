# Browser language initialization — 2026-11-13

Scope: root/V2 first entry, including gate links. Supported explicit URL `lang`
values win; otherwise map `navigator.language` to ko/en/ja/zh. Unsupported,
empty or unreadable preferences fall back to en. No provider request is needed.
Do not scan `navigator.languages` or infer language from the question.

Manual changes keep the chosen language in the current URL (including ko).
Station navigation and the iPhone full-document home-to-chat handoff carry the
resolved language. QR URL generation and Gemini prompts remain unchanged.
No database or server environment changes are required.

## Rollback

Pre-change production commit: `e14e53b93ee3f0580c4217444b2f740bce48d4b7`.
Remote Git tag: `rollback-before-browser-language-20261113`.
Pre-change READY production deployment: `dpl_29EjKHLSxyABm7g6ekXtSqBe6ZQq`.
URL: https://subway-ai-guide-gbhswd5be-t5-b.vercel.app
Project: `prj_AarjheGYfoVmMkbiAwg7EMkbALxx` (`subway-ai-guide`).
Team: `team_7CqUKa0HUcTaAhbsO6WH4zbG`.

For immediate traffic rollback use Vercel's rollback operation targeting the
above deployment ID. This requires no rebuild or database reversal. Vercel
rollback pauses automatic production alias assignment; restore it deliberately
when promoting the next corrected production deployment.

For source rollback revert the commit that introduces this document on top of
current main, then deploy normally. Do not reset main or discard later commits.
The tag is a fixed source reference, not a moving backup branch.

## Validation

- `npm run build` runs the repository's required test suites and production build.
- `npm run test:station-entry` covers locale mappings, URL precedence, gate parity,
  unreadable/empty preferences and unchanged canonical QR generation.
- `NODE_PATH=<playwright node_modules> node tests/browser-language-ui.cjs`
  checks root/V2/gate entry, regional locales, URL overrides, manual selection,
  reload/station/history retention and iPhone chat handoff.
  AI and other API requests in this browser test are mocked; the test verifies
  the language sent in the chat request, without paid model calls.
