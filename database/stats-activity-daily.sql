-- Additive: legacy RPCs and rows remain valid for existing clients and rollback.
alter table public.chatbot_session_activity add column if not exists activity_date date;
create or replace function public.record_chatbot_activity_v2(p_page_id uuid,p_session_id uuid,p_visible_ms bigint,p_activity_date date)
returns void language sql security invoker set search_path='' as $$
 insert into public.chatbot_session_activity(page_id,session_id,visible_ms,activity_date)
 values(p_page_id,p_session_id,p_visible_ms,p_activity_date)
 on conflict(page_id) do update set visible_ms=greatest(public.chatbot_session_activity.visible_ms,excluded.visible_ms),updated_at=now()
 where public.chatbot_session_activity.session_id=excluded.session_id and public.chatbot_session_activity.activity_date=excluded.activity_date;
$$;
revoke all on function public.record_chatbot_activity_v2(uuid,uuid,bigint,date) from public,anon,authenticated;
grant execute on function public.record_chatbot_activity_v2(uuid,uuid,bigint,date) to service_role;
create or replace function public.get_chatbot_activity_range(p_sessions uuid[],p_start date,p_end date)
returns table(session_id uuid,visible_ms bigint) language sql stable security invoker set search_path='' as $$
 select a.session_id,sum(a.visible_ms)::bigint from public.chatbot_session_activity a
 where a.session_id=any(p_sessions) and coalesce(a.activity_date,(a.started_at at time zone 'Asia/Seoul')::date) between p_start and p_end
 group by a.session_id;
$$;
revoke all on function public.get_chatbot_activity_range(uuid[],date,date) from public,anon,authenticated;
grant execute on function public.get_chatbot_activity_range(uuid[],date,date) to service_role;
