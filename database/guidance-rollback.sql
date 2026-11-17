-- Restore code tag rollback-before-guidance-20261117 first. Additive objects can stay during rollback.
-- Wait for active rooms and in-flight translations to expire before optional schema removal.
drop function if exists public.interpreter_guidance(uuid,text,uuid,text,jsonb);
drop function if exists public.route_translation_claim(text,text,uuid);
drop function if exists public.route_translation_finish(text,text,uuid,jsonb,boolean);
drop table if exists public.route_result_translations;
alter table public.interpreter_test_messages drop column if exists guidance_request,drop column if exists payload,drop column if exists message_type;
