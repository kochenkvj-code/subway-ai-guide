-- Additive migration. Old deployments/tabs still use existing RPCs and null IDs.
alter table public.chatbot_events add column if not exists visitor_id uuid;
alter table public.chatbot_session_activity add column if not exists visitor_id uuid;
create index if not exists chatbot_events_visitor_idx on public.chatbot_events(visitor_id) where visitor_id is not null;
create or replace function public.record_chatbot_activity_v3(p_page_id uuid,p_session_id uuid,p_visible_ms bigint,p_activity_date date,p_visitor_id uuid)
returns void language sql security invoker set search_path='' as $$
 insert into public.chatbot_session_activity(page_id,session_id,visible_ms,activity_date,visitor_id)
 values(p_page_id,p_session_id,p_visible_ms,p_activity_date,p_visitor_id)
 on conflict(page_id) do update set visible_ms=greatest(public.chatbot_session_activity.visible_ms,excluded.visible_ms),visitor_id=coalesce(public.chatbot_session_activity.visitor_id,excluded.visitor_id),updated_at=now()
 where public.chatbot_session_activity.session_id=excluded.session_id and public.chatbot_session_activity.activity_date=excluded.activity_date
 and (public.chatbot_session_activity.visitor_id is null or public.chatbot_session_activity.visitor_id=excluded.visitor_id);
$$;
revoke all on function public.record_chatbot_activity_v3(uuid,uuid,bigint,date,uuid) from public,anon,authenticated;
grant execute on function public.record_chatbot_activity_v3(uuid,uuid,bigint,date,uuid) to service_role;
