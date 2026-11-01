alter table public.station_feedback drop constraint station_feedback_type_check;
alter table public.station_feedback add constraint station_feedback_type_check check(type in ('equipment','signage','cleanliness','convenience','idea','other','praise'));
