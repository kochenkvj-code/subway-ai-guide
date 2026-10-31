# AI question records and reliable event delivery

AI request events now include up to 500 characters of the visible question, the existing language and anonymous session, and the original client event timestamp. The admin stats page lists these separately in reverse chronological order, with KST timestamps and 25-row pagination under the existing date filter. Older events display “내용 미수집”. AI answers are not stored. This also includes existing AI-backed facility guide requests. Four-language notices describe storage for service improvement.

Apply database/stats-question-reliability.sql before releasing the client/API changes. It adds nullable columns and a unique event ID index, preserving old clients and data. No public read permissions are added; the existing authenticated admin report is the only reader exposed by this application.

Transient failures (network errors, 408, 429, 5xx) retry up to three times with the same event ID, payload and timestamp. PostgREST ignores duplicate IDs. Pending events are held in page memory only, up to 100; they do not survive closing/reloading the page. This reduces losses but does not guarantee delivery. Permanent 4xx failures stop. Analytics opt-out applies to new events and retries.

Verification: stats-delivery.test.mjs covers retries, stable IDs, opt-out, permanent failure, bounded text and non-AI events. Browser verification covers the admin question list, original KST timestamp, escaped text and legacy fallback. DB transaction verification covers duplicate IDs and rolls back test records.
