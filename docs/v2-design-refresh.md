# V2 mobile presentation refresh

Only `/v2` presentation and its staff station picker change. Root V1, Search Lab, AI settings and API handlers are unchanged. Existing root/V2 URL builders remain authoritative for station code, language and main/gate links.

- White/sage palette from reviewed AI First prototype, existing Navy prototype layout and full-size AI section.
- Station header reuses the small station-name caret and ↗ controls. No prominent staff labels.
- Four directly accessible language buttons and three bottom destinations: all guides, AI chat, arrivals. Chat retains its existing input, history and recommendation handling. Visual viewport reduction hides tabs and sizes the chat workspace to the visible height; tabs return after closing the keyboard.
- Arrival board presents provider directions symmetrically, two trains per direction, with destination and ETA/status in each row. Terminus comes only from the existing normalized API destination, unknown stays unknown. Inner/outer is a separate operator direction label. No estimates, train-number edits, provider changes or polling changes.
- Station picker opens on the current line. All + lines 1–9 are direct buttons. Two-column list, search retained, no previous 30-result truncation. Codes remain canonical stationCode, not inferred public station numbers. URL dialog still has independent main and gate addresses.

Validation: full project build/unit suites; fixtures for mobile layouts, four languages, all picker results, same-name transfer stations, link pairs/clipboard, tab/history and root isolation. Fixture AI/arrival responses avoid paid generation and operational DB writes. Real device Safari keyboard behavior requires device verification; visual viewport behavior is exercised in Chromium.

Follow-up: the home header places the four language choices in a compact 2×2 group to the right of station tools. Workspace language controls stay directly accessible. Arrival labels use restrained weights and thin symmetric direction arrows; loop labels are secondary text in Korean. Removed obsolete V2 development copy and the promotional footer, while retaining privacy guidance and the tourism banner.
