# Phase 3b — station-scoped route origin

V2 directions now take the departure station from the entry URL's common
station context. There is no departure-station picker inside the route menu.
The selected line number/color and four-language station name appear beside
the route title. Destination search and the three existing search criteria
remain available.

The browser sends `station=<exact stationCode>` to `/api/subway-route`.
The server resolves that value from the common station master and uses its
code as the provider's `dptreStn`, with `stationValueType=code`. The destination
continues to use the existing multilingual station-search registry. An exact
typed official destination is also resolved to its existing code.

Unknown, shortened, empty and out-of-scope origin codes are rejected. The
provider's first station name, line, and station code (when supplied) must
match the selected origin. A different destination is also rejected. Results
return `originCode`/`originLine`, which the client checks before displaying.

Route requests abort on unmount; navigation snapshots retain station identity
and cannot restore another station's result. Language changes preserve the
query/result. Back/forward restores the current station's search/result
without another provider call. Re-entering directions from home starts a new
search with the same fixed origin.

Legacy requests without `station` retain the Jongno 5-ga name/code behavior.
The existing V1 screen remains unchanged. Other non-default V2 menus and AI
are still gated for their later phases. AI prompts, arrival logic, feedback DB,
and statistics collection/schema are unchanged.

## Verification

- Six API tests cover exact origin codes, transfer lines, Seoul aliases, legacy
  requests, typed destinations, all three search criteria, invalid/same-station
  inputs, wrong-origin/line/provider responses, concurrent station isolation,
  and missing keys.
- Required build tests and production build pass.
- Browser tests exercise the real API handler with isolated provider fixtures:
  four origins, four languages, 320/390 px, back/forward without refetch, home
  reset, and V1 unchanged. No AI calls or live DB writes.
- Station-entry and feedback/navigation browser regressions pass.
- Direct provider verification in an isolated Vercel deployment on 2026-11-02:
  `0152` Jonggak line 1, `2637` Dongmyo line 6, `0319` Jongno 3-ga line 3, and
  `0150` Seoul Station line 1 all return routes to `0222` Gangnam that begin at
  the requested station and line. These samples do not certify every station
  or every operating-time/provider condition.

Review deployment is separate from the operating domain. Promoting this change
to production requires the user's deployment instruction.
