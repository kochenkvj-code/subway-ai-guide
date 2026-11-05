# V2 mobile presentation refresh

Only `/v2` presentation and its staff station picker change. Root V1, Search Lab, AI settings and API handlers are unchanged. Existing root/V2 URL builders remain authoritative for station code, language and main/gate links.

- White/sage palette from reviewed AI First prototype, existing Navy prototype layout and full-size AI section.
- Station header reuses the small station-name caret and ↗ controls. No prominent staff labels.
- Four directly accessible language buttons and three bottom destinations: all guides, AI chat, arrivals. Chat retains its existing input, history and recommendation handling. Visual viewport reduction hides tabs and sizes the chat workspace to the visible height; tabs return after closing the keyboard.
- Arrival board presents provider directions symmetrically, two trains per direction, with destination and ETA/status in each row. Terminus comes only from the existing normalized API destination, unknown stays unknown. Inner/outer is a separate operator direction label. No estimates, train-number edits, provider changes or polling changes.
- Station picker opens on the current line. All + lines 1–9 are direct buttons. Two-column list, search retained, no previous 30-result truncation. Codes remain canonical stationCode, not inferred public station numbers. URL dialog still has independent main and gate addresses.

Validation: full project build/unit suites; fixtures for mobile layouts, four languages, all picker results, same-name transfer stations, link pairs/clipboard, tab/history and root isolation. Fixture AI/arrival responses avoid paid generation and operational DB writes. Real device Safari keyboard behavior requires device verification; visual viewport behavior is exercised in Chromium.

Follow-up: the home header places the four language choices in a compact 2×2 group to the right of station tools. Workspace language controls stay directly accessible. Arrival labels use restrained weights and thin symmetric direction arrows; loop labels are secondary text in Korean. Removed obsolete V2 development copy and the promotional footer, while retaining privacy guidance and the tourism banner.

Current refinement: language selection is the bottom-right tab, opening a four-choice panel upward; it replaces the arrival tab. Arrival details stay accessible through the direction headings. Header language controls and home privacy copy are removed; the original chat-composer privacy guidance remains. Summary direction headings use station names without direction suffixes (방면/bound/方面/方向). Existing URL language state, chat draft/history and station selection are preserved.

Conversation/identity refinement: V2 supplies its own concise single-line privacy notice to the shared chat component, whose default V1 text remains unchanged. Assistant and user bubbles cap at 85%; generated Google markup remains intact inside a horizontally scrollable wrapper. Station identity/caret/QR tools move into the AI card upper-right. Workspace back controls use one stable SVG icon (including facilities).

Facilities correction: scope feedback `.sf-station` rules under `.sf-pane`, preventing the facility station-name span from inheriting the 19px white-on-blue circular line badge. The shared class names no longer distort the facility header.

Staff QR controls are now inside a disclosure in the station picker, retaining both existing main/gate URL inputs and copy actions. No share arrow is shown on the visitor main card. The station name stays at the AI card upper-right with its caret and a title-sized 20px weight. Reduced the AI header row gap and top/bottom padding, without shrinking the question field.

The arrival board is a secondary strip: compact heading/row heights and reduced vertical padding retain both trains per direction. A full-column hit area opens details without requiring a tiny visual heading target.

Current chat notice: restore complete localized privacy sentences at the top below the chat title, remove the redundant chat-header station badge/name, and hide the original bottom notice only for V2 general chat. The shared component defaults to showing its original notice for V1. The selected-station AI context remains unchanged.
