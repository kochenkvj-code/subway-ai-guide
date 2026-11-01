alter table public.station_feedback drop constraint station_feedback_location_check;
alter table public.station_feedback add constraint station_feedback_location_check check(location in ('gate','platform','restroom','exit','other','concourse'));
