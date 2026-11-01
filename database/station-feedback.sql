create table public.station_feedback (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 station_id text not null check(char_length(station_id) between 1 and 80), line text not null,
 type text not null check(type in ('equipment','signage','cleanliness','convenience','idea','other')),
 location text check(location in ('gate','platform','restroom','exit','other')),
 location_detail text not null default '' check(char_length(location_detail)<=60),
 content text not null check(char_length(btrim(content)) between 1 and 500),
 language text not null check(language in ('ko','en','ja','zh')),
 created_at timestamptz not null default now(), starred boolean not null default false, hidden boolean not null default false
);
create index station_feedback_recent on public.station_feedback(station_id,created_at desc,id desc) where not hidden;
create table public.station_feedback_limits (
 key text primary key, hits integer not null default 1, expires_at timestamptz not null
);
alter table public.station_feedback enable row level security;
alter table public.station_feedback_limits enable row level security;
revoke all on public.station_feedback,public.station_feedback_limits from public,anon,authenticated;
grant select,insert,update on public.station_feedback to service_role;
grant select,insert,update,delete on public.station_feedback_limits to service_role;
create function public.feedback_rate_limit(p_key text,p_max integer) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 delete from public.station_feedback_limits where expires_at<now();
 insert into public.station_feedback_limits(key,hits,expires_at) values(p_key,1,now()+interval '10 minutes')
 on conflict(key) do update set hits=public.station_feedback_limits.hits+1 returning hits into n;
 return n<=p_max;
end; $$;
revoke all on function public.feedback_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.feedback_rate_limit(text,integer) to service_role;
create function public.submit_station_feedback(p_data jsonb,p_rate_key text) returns text
language plpgsql security invoker set search_path='' as $$
declare existing public.station_feedback;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_data->>'request_id',0));
 select * into existing from public.station_feedback where request_id=(p_data->>'request_id')::uuid;
 if found then
   if existing.station_id=p_data->>'station_id' and existing.type=p_data->>'type' and existing.content=p_data->>'content'
      and existing.location is not distinct from p_data->>'location' and existing.location_detail=p_data->>'location_detail'
      and existing.language=p_data->>'language' then return 'duplicate'; end if;
   return 'conflict';
 end if;
 if not public.feedback_rate_limit(p_rate_key,5) then return 'limited'; end if;
 insert into public.station_feedback(request_id,station_id,line,type,location,location_detail,content,language)
 values((p_data->>'request_id')::uuid,p_data->>'station_id',p_data->>'line',p_data->>'type',p_data->>'location',p_data->>'location_detail',p_data->>'content',p_data->>'language');
 return 'created';
end; $$;
revoke all on function public.submit_station_feedback(jsonb,text) from public,anon,authenticated;
grant execute on function public.submit_station_feedback(jsonb,text) to service_role;
