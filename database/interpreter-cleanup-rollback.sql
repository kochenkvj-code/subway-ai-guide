-- Unschedule only this feature's job. Do not remove a shared pg_cron extension.
select cron.unschedule(jobid) from cron.job where jobname='interpreter-expiry-cleanup';
