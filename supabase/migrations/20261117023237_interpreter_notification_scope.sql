-- A saved message emits one notification. Counter/timestamp updates need none.
drop trigger interpreter_room_notify on public.interpreter_test_rooms;
create trigger interpreter_room_notify after insert or update of guest_token_hash,staff_lang,guest_lang,closed_at
 on public.interpreter_test_rooms for each row execute function interpreter_private.notify_room();
