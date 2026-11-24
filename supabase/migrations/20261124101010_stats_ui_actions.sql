-- Add only the UI action type; existing event types, data and permissions remain intact.
set local lock_timeout = '5s';
alter table public.chatbot_events
 drop constraint valid_event_type,
 add constraint valid_event_type check (event_type in ('page_view','quick_menu','ai_question','route_search','language_change','feedback','gate_action','ui_action'));
