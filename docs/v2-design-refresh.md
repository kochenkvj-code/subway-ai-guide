# V2 mobile design

Only V2 presentation and its staff picker change. Root V1, Search Lab, AI model/prompt settings and API handlers remain unchanged. URL builders still determine station code, language, main link and gate link.

## Main screen

- White/sage colors with a full-size question input and three-column quick guide.
- Station identity and caret at the AI card upper-right: fixed 16px text beside a 19px line badge. Long names ellipsize without growing or displacing the row; the caret stays visible.
- 15px horizontal AI-card padding (14px on narrow phones). Example chips size by their text rather than equal-width columns, wrap only when the full row is genuinely too narrow, and do not hide behind station tools.
- Compact arrival strip with symmetric adjacent-station labels: same font size as train destination labels, emphasized by darker semibold color. No direction suffixes such as 방면/bound. Each direction has two trains; every train shows its own provider destination and existing ETA/status. No guessed destinations, train numbers, estimates or API changes.
- Quick-guide cards always center the icon above the label, including short phones. Heights are reduced through vertical padding/gaps (74px normally, 68/64px minimum on shorter phones), rather than a horizontal icon/label layout. On shorter phones, reduced whitespace and denser menu cards keep all nine guides visible. Very small screens may scroll; menu scroll margins protect focus from the bottom dock. The question text/input remain legible and tourism banner remains available.

## Navigation and chat

- Bottom controls: all guides, AI question, language. The language button opens a four-choice panel upward; selection, Escape and outside clicks close it without resetting station, draft or history.
- Arrival details open from the direction headings; whole-column hit areas avoid tiny touch targets.
- Chat privacy warning occupies the existing header row between title and Home. It is a natural short sentence, with the complete disclosure in its accessible label/title. No separate privacy row, bottom notice or station-name badge in general chat. Shared chat defaults preserve V1's original notice.
- Assistant and user bubbles cap at 85% width. Google-provided markup is unchanged within a horizontally scrollable wrapper if needed.
- Bottom controls coexist with the chat input. Visual viewport contraction hides the dock and sizes the workspace to the visible height; closing the keyboard restores it. Real-device Safari keyboard behavior still requires device verification.
- Workspace back controls use a stable SVG arrow. Feedback station-badge styles are scoped to `.sf-pane` to prevent facility station names from inheriting a circular badge style.

## Staff picker

- No address/share control appears on the visitor's AI card. The first section of the station dialog is an address disclosure, above search and results.
- Existing independent main/gate URL inputs, copy actions and language/base-path behavior are retained in that same dialog.
- Current line selected initially; All and 1–9 direct buttons, multilingual search, two-column station results, no former 30-result truncation. Displayed IDs remain canonical stationCode values, not invented public station numbers.

## Verification

Project build/unit suites; mocked browser checks for mobile widths, five station identities including long English names, four languages, all picker results, transfer identities, main/gate links and clipboard, upward language panel, keyboard viewport handling, preserved chat state, compact 375×667 menus and unchanged V1 behavior. Separate chat checks cover 85% bubbles, natural inline privacy copy and provider-markup containment. No paid model generation or operational DB writes in tests.

## Mobile keyboard behavior
V2 chat locks document scrolling and sizes/positions its workspace to the visual viewport. Both viewport resize and pan events are handled, and the dock stays hidden until the keyboard closing animation restores the viewport. Only messages scroll; leaving chat restores document styles. Composer text is 16px to avoid iOS focus zoom. Browser fixtures cover three repeated open/pan/blur/close cycles and draft retention; a physical iPhone keyboard still needs device confirmation. V1 is unchanged.
