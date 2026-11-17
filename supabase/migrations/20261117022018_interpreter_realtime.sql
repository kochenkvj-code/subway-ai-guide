-- Additive: existing room/message rows and the old API remain readable.
create schema if not exists interpreter_private;
revoke all on schema interpreter_private from public;
grant usage on schema interpreter_private to anon,authenticated,service_role;
alter table public.interpreter_test_rooms add column realtime_topic text not null
 default ('interpreter:'||gen_random_uuid()::text||gen_random_uuid()::text);
create unique index interpreter_room_topic_idx on public.interpreter_test_rooms(realtime_topic);
create table interpreter_private.requests(
 room_id uuid not null references public.interpreter_test_rooms(id) on delete cascade,
 sender text not null check(sender in ('staff','guest')), request_id uuid not null,
 fingerprint text not null, source_lang text not null, target_lang text not null,
 attempt uuid not null, started_at timestamptz not null default now(),
 state text not null check(state in ('pending','failed','completed')),
 message_id uuid, primary key(room_id,sender,request_id)
);
alter table interpreter_private.requests enable row level security;
revoke all on interpreter_private.requests from public,anon,authenticated;
grant all on interpreter_private.requests to service_role;
-- RLS performs a narrow capability check. It never exposes room rows or chat text.
-- The unguessable subscription topic is disclosed only after the room API verifies a role token.
create function interpreter_private.can_listen(topic text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.interpreter_test_rooms r
 where r.realtime_topic=topic and r.closed_at is null and r.expires_at>now());
$$;
revoke all on function interpreter_private.can_listen(text) from public;
grant execute on function interpreter_private.can_listen(text) to anon,authenticated;
create policy interpreter_receive on realtime.messages for select to anon,authenticated
 using(extension='broadcast' and interpreter_private.can_listen((select realtime.topic())));
-- No INSERT policy: clients cannot publish or spoof notifications.
create function interpreter_private.notify_room() returns trigger
language plpgsql security definer set search_path='' as $$
declare topic text;
begin
 if TG_TABLE_NAME='interpreter_test_rooms' then topic:=NEW.realtime_topic;
 else select realtime_topic into topic from public.interpreter_test_rooms where id=NEW.room_id; end if;
 if topic is not null then
  begin perform realtime.send('{}'::jsonb,'changed',topic,true);
  exception when others then raise warning 'Interpreter notification unavailable'; end;
 end if;
 return NEW;
end;$$;
revoke all on function interpreter_private.notify_room() from public,anon,authenticated;
create trigger interpreter_room_notify after insert or update on public.interpreter_test_rooms
 for each row execute function interpreter_private.notify_room();
create trigger interpreter_message_notify after insert on public.interpreter_test_messages
 for each row execute function interpreter_private.notify_room();
-- Row locks serialize insert/close, including legacy clients. Count actual messages,
-- so legacy PATCHes cannot bypass the 36-message limit.
create function interpreter_private.guard_message() returns trigger
language plpgsql security invoker set search_path='' as $$
declare r public.interpreter_test_rooms; n integer;
begin
 select * into r from public.interpreter_test_rooms where id=NEW.room_id for update;
 if not found or r.closed_at is not null or r.expires_at<=clock_timestamp() then raise exception 'room-ended'; end if;
 select count(*) into n from public.interpreter_test_messages where room_id=NEW.room_id;
 if n>=36 then raise exception 'message-limit'; end if;
 update public.interpreter_test_rooms set message_count=n+1,last_active_at=clock_timestamp() where id=r.id;
 return NEW;
end;$$;
revoke all on function interpreter_private.guard_message() from public,anon,authenticated;
create trigger interpreter_message_guard before insert on public.interpreter_test_messages
 for each row execute function interpreter_private.guard_message();
-- Server-only RPCs; request IDs are scoped to room + sender. Language is frozen on claim.
create function public.interpreter_claim(p_room uuid,p_sender text,p_request uuid,p_fingerprint text,p_attempt uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.interpreter_test_rooms; q interpreter_private.requests; n integer;
begin
 if p_sender not in ('staff','guest') then raise exception 'invalid-access'; end if;
 select * into r from public.interpreter_test_rooms where id=p_room for update;
 if not found or r.closed_at is not null or r.expires_at<=clock_timestamp() then return jsonb_build_object('error','room-ended'); end if;
 if r.guest_token_hash is null then return jsonb_build_object('error','waiting-for-guest'); end if;
 select * into q from interpreter_private.requests where room_id=p_room and sender=p_sender and request_id=p_request;
 if found then
  if q.fingerprint<>p_fingerprint then return jsonb_build_object('error','request-conflict'); end if;
  if q.state='completed' then return jsonb_build_object('state','completed','messageId',q.message_id); end if;
  if q.state='pending' and q.started_at>clock_timestamp()-interval '90 seconds' then return jsonb_build_object('error','message-pending'); end if;
 else
  select (select count(*) from public.interpreter_test_messages where room_id=p_room)+
   (select count(*) from interpreter_private.requests where room_id=p_room and state<>'completed') into n;
  if n>=36 then return jsonb_build_object('error','message-limit'); end if;
  insert into interpreter_private.requests(room_id,sender,request_id,fingerprint,source_lang,target_lang,attempt,state)
  values(p_room,p_sender,p_request,p_fingerprint,
   case when p_sender='staff' then r.staff_lang else r.guest_lang end,
   case when p_sender='staff' then r.guest_lang else r.staff_lang end,p_attempt,'pending');
 end if;
 update interpreter_private.requests set attempt=p_attempt,started_at=clock_timestamp(),state='pending'
 where room_id=p_room and sender=p_sender and request_id=p_request returning * into q;
 return jsonb_build_object('state','claimed','sourceLang',q.source_lang,'targetLang',q.target_lang);
end;$$;
create function public.interpreter_finish(p_room uuid,p_sender text,p_request uuid,p_attempt uuid,p_original text,p_translated text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.interpreter_test_rooms; q interpreter_private.requests; mid uuid:=gen_random_uuid();
begin
 select * into r from public.interpreter_test_rooms where id=p_room for update;
 if not found or r.closed_at is not null or r.expires_at<=clock_timestamp() then return jsonb_build_object('error','room-ended'); end if;
 select * into q from interpreter_private.requests where room_id=p_room and sender=p_sender and request_id=p_request;
 if not found or q.attempt<>p_attempt or q.state<>'pending' then return jsonb_build_object('error','request-conflict'); end if;
 insert into public.interpreter_test_messages(id,room_id,sender,source_lang,target_lang,original,translated)
 values(mid,p_room,p_sender,q.source_lang,q.target_lang,p_original,p_translated);
 update interpreter_private.requests set state='completed',message_id=mid where room_id=p_room and sender=p_sender and request_id=p_request;
 return jsonb_build_object('messageId',mid);
end;$$;
create function public.interpreter_fail(p_room uuid,p_sender text,p_request uuid,p_attempt uuid)
returns void language sql security invoker set search_path='' as $$
 update interpreter_private.requests set state='failed' where room_id=p_room and sender=p_sender and request_id=p_request and attempt=p_attempt and state='pending';
$$;
create function public.interpreter_close(p_room uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.interpreter_test_rooms where id=p_room for update;
 update public.interpreter_test_rooms set closed_at=coalesce(closed_at,clock_timestamp()) where id=p_room;
 delete from public.interpreter_test_messages where room_id=p_room;
 delete from interpreter_private.requests where room_id=p_room;
end;$$;
revoke all on function public.interpreter_claim(uuid,text,uuid,text,uuid),public.interpreter_finish(uuid,text,uuid,uuid,text,text),public.interpreter_fail(uuid,text,uuid,uuid),public.interpreter_close(uuid) from public,anon,authenticated;
grant execute on function public.interpreter_claim(uuid,text,uuid,text,uuid),public.interpreter_finish(uuid,text,uuid,uuid,text,text),public.interpreter_fail(uuid,text,uuid,uuid),public.interpreter_close(uuid) to service_role;
