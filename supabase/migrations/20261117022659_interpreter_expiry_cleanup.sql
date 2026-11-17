-- Existing access checks enforce expiry immediately. Periodic deletion removes content
-- even when nobody returns to an expired room. No external worker or HTTP endpoint.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('interpreter-expiry-cleanup','*/5 * * * *',
 $$delete from public.interpreter_test_rooms where expires_at<now();$$);
