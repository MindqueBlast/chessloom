-- Email reminder preference + display name already exists on profiles.
alter table public.profiles
  add column if not exists email_reminders_enabled boolean not null default true;

comment on column public.profiles.email_reminders_enabled is
  'When true, Chessloom may send due-card reminder emails (max 2/week).';
