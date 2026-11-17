-- FIRST restore deployment/tag rollback-before-interpreter-realtime-20261117.
-- Additive objects may be left in place during code rollback; no existing chat rows need restoring.
-- Run only after new in-flight requests have drained (at least 90 seconds).
begin;
drop trigger if exists interpreter_room_notify on public.interpreter_test_rooms;
drop trigger if exists interpreter_message_notify on public.interpreter_test_messages;
drop trigger if exists interpreter_message_guard on public.interpreter_test_messages;
drop policy if exists interpreter_receive on realtime.messages;
drop function if exists public.interpreter_claim(uuid,text,uuid,text,uuid);
drop function if exists public.interpreter_finish(uuid,text,uuid,uuid,text,text);
drop function if exists public.interpreter_fail(uuid,text,uuid,uuid);
drop function if exists public.interpreter_close(uuid);
drop schema if exists interpreter_private cascade;
alter table public.interpreter_test_rooms drop column if exists realtime_topic;
commit;
