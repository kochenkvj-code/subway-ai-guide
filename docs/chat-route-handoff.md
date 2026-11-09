# Chat → existing wayfinding handoff

V2 chat may return `<route_query>passenger destination</route_query>` immediately before its final `<menu_recommendation>route</menu_recommendation>`. It does not recommend an alighting station or supply a station code. This optional metadata is enabled only in the production V2 prompt, not the default comparison prompt.

Only one complete standalone destination term (1–100 characters), adjacent to the valid final route recommendation and a complete answer, is accepted. Missing, malformed, duplicate, overlong or non-route metadata falls back to the existing generic menu action. Visible answer language and Google source presentation stay separate from machine metadata.

The named button passes the term and a one-use request ID into the existing RouteLab search function. Exact station matches go straight to official routing; other destinations use the existing place lookup and then official routing. No second chat call, answer-prose extraction, model-generated station code, or separate route renderer is added. Clicking twice is guarded, stale requests are aborted, and revisiting a history entry does not re-run the handoff. The header back button returns directly to the originating chat, preserving its messages. Manual menu entry starts an ordinary search form.

Validation: build + policy/API tests; `node --experimental-vm-modules tests/chat-route-handoff-ui.cjs` covers actual chat and place handlers with mocked Gemini, all four languages, direct station vs place lookup counts, request payloads, repeated handoff, chat restoration and missing-query fallback. No real paid model calls are made by these tests.
