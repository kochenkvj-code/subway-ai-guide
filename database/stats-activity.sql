-- Additive production upgrade. Existing events and counters are preserved.
alter table public.chatbot_events add column if not exists context text;
alter table public.chatbot_events add column if not exists occurred_at timestamptz;
alter table public.chatbot_events drop constraint valid_event_type;
alter table public.chatbot_events add constraint valid_event_type check (event_type in ('page_view','quick_menu','ai_question','route_search','language_change','feedback','gate_action'));
create table public.chatbot_session_activity (
  page_id uuid primary key,
  session_id uuid not null,
  visible_ms bigint not null default 0 check (visible_ms between 0 and 604800000),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chatbot_session_activity_session_idx on public.chatbot_session_activity(session_id);
alter table public.chatbot_session_activity enable row level security;
revoke all on public.chatbot_session_activity from anon, authenticated;
grant select,insert,update on public.chatbot_session_activity to service_role;
create function public.record_chatbot_activity(p_page_id uuid,p_session_id uuid,p_visible_ms bigint)
returns void language sql security invoker set search_path = '' as $$
  insert into public.chatbot_session_activity(page_id,session_id,visible_ms)
  values(p_page_id,p_session_id,p_visible_ms)
  on conflict(page_id) do update set
    visible_ms=greatest(public.chatbot_session_activity.visible_ms,excluded.visible_ms),updated_at=now()
  where public.chatbot_session_activity.session_id=excluded.session_id;
$$;
revoke all on function public.record_chatbot_activity(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.record_chatbot_activity(uuid,uuid,bigint) to service_role;
create function public.get_chatbot_activity(p_sessions uuid[])
returns table(session_id uuid,visible_ms bigint) language sql stable security invoker set search_path = '' as $$
  select a.session_id,sum(a.visible_ms)::bigint from public.chatbot_session_activity a where a.session_id=any(p_sessions) group by a.session_id;
$$;
revoke all on function public.get_chatbot_activity(uuid[]) from public,anon,authenticated;
grant execute on function public.get_chatbot_activity(uuid[]) to service_role;
