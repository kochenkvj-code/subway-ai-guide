# Recovery point: language persistence and short chat context

Baseline production commit: `4b613b680027b599cee3670fadae3879ca2cf649`
Git tag: `rollback/pre-language-context-2026-10-30`
Baseline Vercel deployment: `dpl_3xv8793ij593mLnC1qbZTtKntuKM`

The complete original API route, including every prompt, is preserved in
`google-search-before-language-context.js.txt` and at the tag above. No credential
values are included. The existing per-question prompt functions are unchanged;
a short context rule is appended to the system instruction only when a fresh
previous exchange is actually supplied. Without history the system instruction
remains identical to baseline.

To disable context while preserving the language-switch UI, restore only
`app/api/google-search/route.js` from this tag, rebuild, commit and deploy.
The old route ignores the additional client history fields and treats questions
as independent single-turn requests. To roll back both features, restore
`app/page.js`, `app/components/SubwayRouteCard.jsx`, and
`app/api/google-search/route.js` from this tag. The unused chat-history helper can
also be removed. Review any subsequent changes before restoring these files.
Do not reset the production branch or force-push. Production deployment still
requires explicit user authorization.

Context policy: only the immediately previous successful general-AI Q/A pair;
expires five minutes after answer completion; max 500 question characters and
2500 answer characters. Static quick-menu navigation resets the context scope,
while language changes do not. Failed answers are not reused. All conversation
content stays in this browser tab's React state, not Supabase or browser storage;
only the bounded pair is sent to Google with a subsequent question. Closing or
reloading the tab clears chat history. Existing analytics identifiers are not
used to load or join any user's conversation.
