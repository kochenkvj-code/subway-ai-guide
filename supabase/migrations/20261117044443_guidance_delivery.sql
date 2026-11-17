alter table public.interpreter_test_messages add column message_type text not null default 'text' check(message_type in ('text','menu','route_result'));
alter table public.interpreter_test_messages add column payload jsonb;
alter table public.interpreter_test_messages add column guidance_request uuid;
create unique index guidance_dedup on public.interpreter_test_messages(room_id,guidance_request) where guidance_request is not null;
create function public.interpreter_guidance(p_room uuid,p_token_hash text,p_request uuid,p_type text,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.interpreter_test_rooms; mid uuid; source jsonb;
begin
 select * into r from public.interpreter_test_rooms where id=p_room for update;
 if not found or r.closed_at is not null or r.expires_at<=clock_timestamp() then return jsonb_build_object('error','room-ended');end if;
 if r.staff_token_hash<>p_token_hash then return jsonb_build_object('error','staff-required');end if;
 if r.guest_token_hash is null then return jsonb_build_object('error','waiting-for-guest');end if;
 select id into mid from public.interpreter_test_messages where room_id=p_room and guidance_request=p_request;
 if mid is not null then return jsonb_build_object('messageId',mid);end if;
 if p_type='menu' and p_payload->>'menu'=any(array['route','gate','fares','tour','found','lost','timetable','facility','feedback','live']) then
  p_payload:=jsonb_build_object('menu',p_payload->>'menu','stationCode',r.station_code);
 elsif p_type='route_result' then
  select snapshot into source from public.route_result_shares where id=p_payload->>'shareId' and expires_at>clock_timestamp();
  if source is null or source->>'originCode' is distinct from r.station_code then return jsonb_build_object('error','invalid-route');end if;
  p_payload:=jsonb_build_object('shareId',p_payload->>'shareId','stationCode',r.station_code);
 else return jsonb_build_object('error','invalid-menu');end if;
 if (select count(*) from public.interpreter_test_messages where room_id=p_room)>=36 then return jsonb_build_object('error','message-limit');end if;
 mid:=gen_random_uuid();
 insert into public.interpreter_test_messages(id,room_id,sender,source_lang,target_lang,original,translated,message_type,payload,guidance_request)
 values(mid,p_room,'staff',r.staff_lang,r.guest_lang,'['||p_type||']','['||p_type||']',p_type,p_payload,p_request);
 return jsonb_build_object('messageId',mid);
end;$$;
revoke all on function public.interpreter_guidance(uuid,text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.interpreter_guidance(uuid,text,uuid,text,jsonb) to service_role;
create table public.route_result_translations(
 share_id text not null references public.route_result_shares(id) on delete cascade,language text not null check(language in ('ko','en','ja','zh')),
 state text not null check(state in ('pending','completed','failed')),attempt uuid not null,started_at timestamptz not null default now(),attempts integer not null default 1,fields jsonb,
 primary key(share_id,language)
);
alter table public.route_result_translations enable row level security;
revoke all on public.route_result_translations from public,anon,authenticated;
grant select,insert,update,delete on public.route_result_translations to service_role;
create function public.route_translation_claim(p_id text,p_language text,p_attempt uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare t public.route_result_translations; s public.route_result_shares;
begin
 perform pg_advisory_xact_lock(hashtextextended('route-translation:'||p_id||':'||p_language,0));
 select * into s from public.route_result_shares where id=p_id;
 if not found or s.expires_at<=clock_timestamp() then return jsonb_build_object('error','expired');end if;
 if p_language not in ('ko','en','ja','zh') then return jsonb_build_object('error','invalid-language');end if;
 select * into t from public.route_result_translations where share_id=p_id and language=p_language;
 if found then
  if t.state='completed' then return jsonb_build_object('state','completed','fields',t.fields);end if;
  if t.state='pending' and t.started_at>clock_timestamp()-interval '90 seconds' then return jsonb_build_object('state','pending');end if;
  if t.attempts>=3 then return jsonb_build_object('error','retry-limit');end if;
 end if;
 insert into public.route_result_translations(share_id,language,state,attempt) values(p_id,p_language,'pending',p_attempt)
 on conflict(share_id,language) do update set state='pending',attempt=p_attempt,started_at=clock_timestamp(),attempts=public.route_result_translations.attempts+1;
 return jsonb_build_object('state','claimed');
end;$$;
create function public.route_translation_finish(p_id text,p_language text,p_attempt uuid,p_fields jsonb,p_failed boolean) returns boolean
language sql security invoker set search_path='' as $$
 with updated as(update public.route_result_translations t set state=case when p_failed then 'failed' else 'completed' end,fields=case when p_failed then null else p_fields end
 where share_id=p_id and language=p_language and attempt=p_attempt and state='pending'
 and exists(select 1 from public.route_result_shares s where s.id=p_id and s.expires_at>clock_timestamp()) returning 1)select exists(select 1 from updated);
$$;
revoke all on function public.route_translation_claim(text,text,uuid),public.route_translation_finish(text,text,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.route_translation_claim(text,text,uuid),public.route_translation_finish(text,text,uuid,jsonb,boolean) to service_role;
