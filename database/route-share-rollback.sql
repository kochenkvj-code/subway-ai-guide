-- Restore rollback-before-route-sharing-20261117 code first. Existing features do not depend on these additions.
select cron.unschedule(jobid) from cron.job where jobname='route-result-expiry-cleanup';
drop function if exists public.create_route_result_share(text,text,text,jsonb);
-- Removing the feature also removes saved shared results. Leave the table for natural expiry if links must survive.
drop table if exists public.route_result_shares;
