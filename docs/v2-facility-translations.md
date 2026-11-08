# V2 facility display translations

The live `/api/v2/facilities` endpoint still supplies the facility records. No database, runtime translation service or Gemini request was added. No API station matching, aliases, caching, statuses or record filtering was changed. Only V2 renders these translations.

`app/data/facility-i18n.json` contains reviewed EN/JA/ZH terms, fixed phrases and numeric templates. `app/lib/facility-i18n.js` recognizes whole location expressions, preserves exit/floor/boarding-position numbers and uses the existing project multilingual station dataset for direction names. Mezzanine identifiers such as BM1 are preserved as codes. A phrase with any unrecognized part is shown entirely in Korean with a localized “Korean source” label, rather than exposing partially substituted text. New phrases are never guessed. Korean output remains unchanged.

## Actual data audit

On 2026-11-08, all 289 supported stations were queried through the existing public facility endpoint. Final responses contained 3,710 records, with no failed or partial stations. One initial non-JSON error was retried successfully. The endpoint may have returned cached data; these counts do not establish the number of upstream provider requests. The 3,710 records include the source records before the existing removed-equipment display filter.

`tests/fixtures/facility-phrases.json` stores deduplicated displayed values, occurrence counts and station references from those actual responses, not model-generated facility records. Complete raw snapshots and credentials are not committed.

For each of EN/JA/ZH, 3,570 of 3,710 location values (96.2%) are translated or language-neutral. The remaining 140 occurrences (119 unique phrases) retain their entire Korean original with an explicit source label. These include unusual signage, abbreviated/unclear references, longer instructions and malformed source text. Floor, connecting-floor, usage, restroom-type, hours and provider values in the collected corpus are covered. This is not a claim that every future provider phrase is translated.

To reproduce coverage and list exact fallback phrases and affected stations:

```sh
node --experimental-vm-modules scripts/audit-facility-translations.mjs /tmp/facility-audit.json
npm run test:facility-i18n
```

Add a verified full phrase to `phrases` for irregular sentences, or a well-defined term/template for reusable expressions. Verify all three translations and numeric identifiers against the source; do not reinterpret abbreviations or repair provider typos by guessing. Rerun the audit and regression tests. The fixture is an audit corpus, not a replacement for live API data.
