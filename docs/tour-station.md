# Station-centered tourism in V2

Opening the tourism menu automatically requests nearby places around the station passed by V2Guide. Default filters are 1.5 km and all categories. GPS is requested only after the passenger selects My location. A denied permission or failed lookup keeps the previously successful result and origin. The existing detail view and browser-back navigation remain available.

## Coordinates

`app/data/stationCoordinates.json` is the user-supplied station_coordinates.json (784 entries), cross-checked against the supplied station master CSV. Preserve string IDs, including leading zeros. Jongno 5-ga on line 1 uses coordinateId `0154`: latitude 37.570926, longitude 127.001849. Resolve by explicit coordinateId, or unique Korean station name plus line. Missing or ambiguous coordinates never silently fall back to another station.

The tourism component receives the shared selected station; a changed station ID remounts it with station origin and default filters. This change does not introduce the future global station selector.

## Complete lists, local paging

`/api/tour-test?mode=nearby&all=1` requests up to 100 metadata records per upstream page and automatically collects remaining pages with at most four concurrent calls. The browser makes one search request and shows four cards per local page; there is no passenger-operated Load more step. Images are loaded for rendered cards, and detail/image-gallery requests remain on demand. Calls without `all=1` retain the existing single-page behavior.

Full-list requests have a 45-second total timeout, a 5,000-record/100-page guard, and reject incomplete upstream responses rather than present a partial list as complete. Duplicate content IDs are collapsed. The origin, language, radius and category form the per-component memory cache key (two-minute TTL, maximum 12 entries); an already complete all-category list can be filtered locally. Nothing is persisted in a database or browser storage for this feature.

## Verification

- `npm run test:tour`: uploaded coordinates, four language services/categories, complete multi-page retrieval, bounded concurrency, partial-page failures and legacy requests.
- `npm run build`: production Next.js build, including the existing required train-lost tests.
- `npm run test:tour-ui` after build: isolated production browser test with fixture TourAPI responses; checks automatic station search without GPS, local paging, detail return, GPS success/denial, retry after API failure, cached category filters, and four languages at 320x640 and 390x844. No statistics/DB writes. Fixture timings do not establish live provider latency.

Production must separately verify the real provider response after deployment. Existing language-specific API environment variables are reused; no new credentials are needed.
