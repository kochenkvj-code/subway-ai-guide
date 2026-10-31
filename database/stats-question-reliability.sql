-- Additive: existing clients and records remain compatible.
alter table public.chatbot_events add column if not exists event_id uuid;
alter table public.chatbot_events add column if not exists question text check (char_length(question) <= 500);
create unique index if not exists chatbot_events_event_id_key on public.chatbot_events(event_id);
