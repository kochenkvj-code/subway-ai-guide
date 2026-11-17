create table public.route_result_shares(
 id text primary key check(id ~ '^[A-Za-z0-9_-]{43}$'),creator text not null,digest text not null,
 snapshot jsonb not null check(octet_length(snapshot::text)<=110000),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '24 hours'
);
alter table public.route_result_shares enable row level security;
revoke all on public.route_result_shares from public,anon,authenticated;
grant select,insert,delete on public.route_result_shares to service_role;
create index route_result_shares_expiry on public.route_result_shares(expires_at);
create index route_result_shares_creator on public.route_result_shares(creator,created_at);
create function public.create_route_result_share(p_id text,p_creator text,p_digest text,p_snapshot jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.route_result_shares;
begin
 perform pg_advisory_xact_lock(hashtextextended('route-share:'||p_creator,0));
 select * into saved from public.route_result_shares where creator=p_creator and digest=p_digest and expires_at>now() limit 1;
 if found then return jsonb_build_object('id',saved.id,'expiresAt',saved.expires_at);end if;
 if (select count(*) from public.route_result_shares where creator=p_creator and created_at>now()-interval '1 hour')>=30 then return jsonb_build_object('error','rate-limited');end if;
 insert into public.route_result_shares(id,creator,digest,snapshot) values(p_id,p_creator,p_digest,p_snapshot) returning * into saved;
 return jsonb_build_object('id',saved.id,'expiresAt',saved.expires_at);
end;$$;
revoke all on function public.create_route_result_share(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_route_result_share(text,text,text,jsonb) to service_role;
select cron.schedule('route-result-expiry-cleanup','*/10 * * * *',$$delete from public.route_result_shares where expires_at<now();$$);
