-- Widen training_sessions.mode to include random_test and full_test.

alter table public.training_sessions
  drop constraint if exists training_sessions_mode_check;

alter table public.training_sessions
  add constraint training_sessions_mode_check
  check (mode in ('learn', 'practice', 'random_test', 'full_test'));
