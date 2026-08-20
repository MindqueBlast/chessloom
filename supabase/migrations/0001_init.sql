-- Chessloom application schema, row-level security, and private PGN storage.

create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  default_side_mode text not null default 'both'
    check (default_side_mode in ('white', 'black', 'both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.studies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source_type text not null
    check (source_type in ('pgn_paste', 'pgn_upload')),
  pgn_text text,
  pgn_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studies_pgn_source_present
    check (pgn_text is not null or pgn_storage_path is not null),
  unique (id, user_id)
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies (id) on delete cascade,
  chapter_index integer not null check (chapter_index >= 0),
  name text not null,
  initial_fen text,
  headers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (study_id, chapter_index),
  unique (id, study_id)
);

create table public.nodes (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null,
  chapter_id uuid not null,
  parent_id uuid,
  path_key text not null,
  ply integer not null check (ply >= 0),
  san text,
  uci text,
  fen text not null,
  comment text,
  nags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint nodes_chapter_study_fk
    foreign key (chapter_id, study_id)
    references public.chapters (id, study_id)
    on delete cascade,
  unique (id, chapter_id),
  unique (study_id, path_key),
  constraint nodes_parent_chapter_fk
    foreign key (parent_id, chapter_id)
    references public.nodes (id, chapter_id)
    on delete cascade
);

create table public.position_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  study_id uuid not null,
  path_key text not null,
  attempts integer not null default 0 check (attempts >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  streak integer not null default 0 check (streak >= 0),
  mastery integer not null default 0 check (mastery between 0 and 100),
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint position_progress_owned_study_fk
    foreign key (study_id, user_id)
    references public.studies (id, user_id)
    on delete cascade,
  unique (user_id, study_id, path_key)
);

create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  study_id uuid not null,
  mode text not null check (mode in ('learn', 'practice')),
  checkpoint jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_sessions_owned_study_fk
    foreign key (study_id, user_id)
    references public.studies (id, user_id)
    on delete cascade
);

comment on column public.training_sessions.updated_at is
  'Session TTL is app-enforced: active sessions older than 14 days are expired.';

create index studies_user_id_idx
  on public.studies (user_id);
create index nodes_chapter_id_idx
  on public.nodes (chapter_id);
create index nodes_parent_chapter_idx
  on public.nodes (parent_id, chapter_id)
  where parent_id is not null;
create index position_progress_due_idx
  on public.position_progress (user_id, study_id, due_at);
create index position_progress_study_user_idx
  on public.position_progress (study_id, user_id);
create index training_sessions_study_user_idx
  on public.training_sessions (study_id, user_id);
create index training_sessions_active_idx
  on public.training_sessions (user_id, study_id, mode, updated_at desc)
  where status = 'active';

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger studies_set_updated_at
  before update on public.studies
  for each row execute function private.set_updated_at();
create trigger chapters_set_updated_at
  before update on public.chapters
  for each row execute function private.set_updated_at();
create trigger position_progress_set_updated_at
  before update on public.position_progress
  for each row execute function private.set_updated_at();
create trigger training_sessions_set_updated_at
  before update on public.training_sessions
  for each row execute function private.set_updated_at();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.studies enable row level security;
alter table public.chapters enable row level security;
alter table public.nodes enable row level security;
alter table public.position_progress enable row level security;
alter table public.training_sessions enable row level security;

create policy profiles_owner_all
  on public.profiles
  for all
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy studies_owner_all
  on public.studies
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy chapters_owner_all
  on public.chapters
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.studies
      where studies.id = chapters.study_id
        and studies.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.studies
      where studies.id = chapters.study_id
        and studies.user_id = (select auth.uid())
    )
  );

create policy nodes_owner_all
  on public.nodes
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.studies
      where studies.id = nodes.study_id
        and studies.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.studies
      where studies.id = nodes.study_id
        and studies.user_id = (select auth.uid())
    )
  );

create policy position_progress_owner_all
  on public.position_progress
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy training_sessions_owner_all
  on public.training_sessions
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete
  on public.profiles,
     public.studies,
     public.chapters,
     public.nodes,
     public.position_progress,
     public.training_sessions
  to authenticated;

insert into storage.buckets (id, name, public)
values ('pgns', 'pgns', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

create policy pgns_owner_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'pgns'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy pgns_owner_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pgns'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy pgns_owner_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'pgns'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'pgns'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy pgns_owner_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pgns'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
