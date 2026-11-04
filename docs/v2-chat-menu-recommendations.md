# V2 station-aware chat and optional menu recommendation

## Scope

V2 chat uses `/api/v2/chat`, an isolated handler. The root service and Search Lab continue using the byte-unchanged `/api/google-search` handler and prompts. Vertex AI global `gemini-3.5-flash-lite:generateContent`, Google Search grounding, 500 output-token cap and a 45-second provider timeout are retained. Exactly one generation call occurs; there is no intent-router call, official-data prefetch, function calling, forced JSON mode or retry for metadata errors. Model/API migration was not required.

The common master validates `stationCode`; absent code defaults to 0154 while explicit invalid codes are rejected before provider authentication/calls. The prompt retains selected output language, verified public information, official/business source distinctions, station/arcade/outside distinctions, nonexistence-vs-unverified, concise independent answers and bounded follow-up history. Jongno-specific landmark hints are absent. Five-minute history remains one user/assistant pair; only cleaned answer text is stored in the client history.

## Recommendation contract

One final standalone `<menu_recommendation>ID</menu_recommendation>` line, with an available navigation ID or `none`. Prompt instructions cannot guarantee semantics; recommendations are supplementary and conservative. Cross-station facility/live/timetable/tour/found/feedback recommendations are prohibited in the prompt. Routes may have another origin/destination; train-lost may have another alighting station. No station code, generated URL, parameters or automatic search is accepted as metadata. A valid complete provider finish and a nonempty answer are needed before showing a button.

The parser strips standalone protocol records (including malformed/truncated records), rejects unknown IDs, duplicate records, non-terminal records and inline malformed trailers. Quoted and fenced examples are preserved as answer content rather than executable recommendations. Missing or failed recommendation never retries or suppresses usable answer text. This soft text protocol is intentionally best-effort, not a schema guarantee.

Targets include nine quick-guide entries plus `live`. Gate/fare static guidance is common to all stations and is now available/recommendable for every entry station. Embedded AI follow-up requests use the selected station through the V2 endpoint; V1 is unchanged. Button labels come from app translations. Search sources/suggestions remain separate. Offset-based grounding supports are retained only where they still address the unchanged answer prefix. Navigation goes through V2's normal history handling, without prefilling or auto-executing anything. Returning to chat preserves its message history.

## Editable route origin

Only V2 route cards with a station context show an origin editor. Entry station is the default; the user selects an explicit station/line/code from the existing 289-entry Seoul Metro master. The existing official route endpoint validates the selected code, with no server changes. App entry station and other menus are unchanged. Browser history retains the changed route origin; a fresh menu visit resets it to the entry station. Root V1 retains its fixed origin and has no editor.

## Validation and limits

Unit/provider-fixture tests cover protocol parsing, station validation, invalid requests without provider calls, one-generation payload, history, grounding source preservation and unchanged root/Search Lab provider payload behavior. Chromium tests cover two station entries × four languages, recommendation navigation, changing route origin, actual API request parameters, back/forward/history, unknown menu filtering, 320/390px widths, and V1 isolation. Existing multi-station route browser regression is also run.

No paid model calls were made during this implementation, respecting the earlier constraint. Thus real multilingual recommendation accuracy, actual grounding usage and the 4–5-second latency target are NOT established by fixture tests. The same generation count/model/output cap avoids new serial AI/API stages, but the longer prompt can still affect latency and input cost. Existing root service/Search Lab code is unchanged; this is not a claim that the new model answers have been field-tested. No stats redesign or unrelated arrival ETA changes are included.
