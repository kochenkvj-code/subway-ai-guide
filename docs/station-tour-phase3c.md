# Phase 3c — station-scoped nearby attractions

V2 passes the entry URL's common station context to NearbyTour, replacing the
legacy Jongno 5-ga feedback-station object for this feature. Its exact uploaded
coordinate ID determines the center. The selected line/color and multilingual
name appear above results. Opening the menu searches within 1.5 km with all
categories; there is no station picker inside this menu.

Station code is part of component identity, tourism cache keys and detail
history identity. A changed development station remounts the feature, resets
filters/basis/pages and aborts pending requests. Old-station results are not
reused. Missing coordinates do not fall back to Jongno 5-ga.

Existing explicit GPS, radius/category controls, full-result collection,
four-card local paging, images, details and language services are preserved.
Other adapters, AI prompts, statistics, feedback storage and arrivals are not
changed in this phase.

## Verification

- All 289 master entries resolve their own uploaded coordinate ID and match
  the master coordinates exactly.
- Tourism API/unit tests and the full production build pass.
- Browser/provider-fixture tests pass for `0152`, `2637`, `0159`, `0319` and
  `0150`: correct center/line/name, no old-station result reuse, no automatic
  GPS, four languages at 320/390 px, complete lists, local paging, detail/back,
  explicit GPS, denied permission and retries.
- Station-entry browser regressions pass.
- Direct live tourism calls on 2026-11-02 returned complete, distinct lists
  around Jonggak and Gangnam: 135 and 51 places at test time. Counts can change;
  these samples do not certify live coverage at every station.

Deploy to the operating domain's `/v2`, retaining root V1 and phase 3b routes.
