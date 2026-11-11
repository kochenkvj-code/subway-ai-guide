-- Optional coarse location derived from Vercel IP geolocation; existing rows remain unchanged.
alter table public.chatbot_events add column if not exists ip_region text;
comment on column public.chatbot_events.ip_region is 'Coarse IP-derived region (city or Seoul district); never raw IP or coordinates.';
