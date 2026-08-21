-- FSRS progress columns and TS-authored training RPCs (no SQL mastery math).

alter table public.position_progress
  add column if not exists fsrs_stability double precision not null default 0,
  add column if not exists fsrs_difficulty double precision not null default 0,
  add column if not exists fsrs_elapsed_days double precision not null default 0,
  add column if not exists fsrs_scheduled_days double precision not null default 0,
  add column if not exists fsrs_reps integer not null default 0,
  add column if not exists fsrs_lapses integer not null default 0,
  add column if not exists fsrs_state integer not null default 0,
  add column if not exists fsrs_learning_steps integer not null default 0,
  add column if not exists fsrs_last_review timestamptz;

-- Existing rows keep due_at unchanged; FSRS columns default to New-card state.
-- App migrate-on-read (Task 3) seeds stability/difficulty from legacy mastery.

drop function if exists public.apply_training_result(uuid, text, boolean);
drop function if exists public.apply_training_result_and_checkpoint(
  uuid, uuid, uuid, text, boolean, jsonb, timestamptz
);

create function private.validate_training_progress(p_progress jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  required_keys constant text[] := array[
    'attempts',
    'correct_count',
    'streak',
    'mastery',
    'last_reviewed_at',
    'due_at',
    'fsrs_stability',
    'fsrs_difficulty',
    'fsrs_elapsed_days',
    'fsrs_scheduled_days',
    'fsrs_reps',
    'fsrs_lapses',
    'fsrs_state',
    'fsrs_learning_steps',
    'fsrs_last_review'
  ];
  key text;
begin
  if p_progress is null or jsonb_typeof(p_progress) <> 'object' then
    raise exception 'Training progress is required';
  end if;

  foreach key in array required_keys loop
    if not p_progress ? key then
      raise exception 'Training progress is missing required field: %', key;
    end if;
  end loop;

  if jsonb_typeof(p_progress->'last_reviewed_at') not in ('null', 'string') then
    raise exception 'Training progress last_reviewed_at must be null or ISO timestamp';
  end if;
  if jsonb_typeof(p_progress->'fsrs_last_review') not in ('null', 'string') then
    raise exception 'Training progress fsrs_last_review must be null or ISO timestamp';
  end if;
  if jsonb_typeof(p_progress->'due_at') <> 'string' then
    raise exception 'Training progress due_at must be an ISO timestamp';
  end if;
end;
$$;

revoke all on function private.validate_training_progress(jsonb) from public;

create function public.apply_training_result(
  p_user_id uuid,
  p_study_id uuid,
  p_path_key text,
  p_correct boolean,
  p_progress jsonb
)
returns public.position_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_progress public.position_progress;
begin
  if p_user_id is null then
    raise exception 'User is required';
  end if;
  if p_path_key is null or btrim(p_path_key) = '' then
    raise exception 'Training path is required';
  end if;

  perform private.validate_training_progress(p_progress);

  if not exists (
    select 1
    from public.studies
    where id = p_study_id
      and user_id = p_user_id
  ) then
    raise exception 'Study not found';
  end if;

  if not exists (
    select 1
    from public.nodes
    where study_id = p_study_id
      and path_key = p_path_key
  ) then
    raise exception 'Training position not found';
  end if;

  insert into public.position_progress (
    user_id,
    study_id,
    path_key,
    attempts,
    correct_count,
    streak,
    mastery,
    last_reviewed_at,
    due_at,
    fsrs_stability,
    fsrs_difficulty,
    fsrs_elapsed_days,
    fsrs_scheduled_days,
    fsrs_reps,
    fsrs_lapses,
    fsrs_state,
    fsrs_learning_steps,
    fsrs_last_review
  )
  values (
    p_user_id,
    p_study_id,
    p_path_key,
    (p_progress->>'attempts')::integer,
    (p_progress->>'correct_count')::integer,
    (p_progress->>'streak')::integer,
    (p_progress->>'mastery')::integer,
    case jsonb_typeof(p_progress->'last_reviewed_at')
      when 'null' then null
      else (p_progress->>'last_reviewed_at')::timestamptz
    end,
    (p_progress->>'due_at')::timestamptz,
    (p_progress->>'fsrs_stability')::double precision,
    (p_progress->>'fsrs_difficulty')::double precision,
    (p_progress->>'fsrs_elapsed_days')::double precision,
    (p_progress->>'fsrs_scheduled_days')::double precision,
    (p_progress->>'fsrs_reps')::integer,
    (p_progress->>'fsrs_lapses')::integer,
    (p_progress->>'fsrs_state')::integer,
    (p_progress->>'fsrs_learning_steps')::integer,
    case jsonb_typeof(p_progress->'fsrs_last_review')
      when 'null' then null
      else (p_progress->>'fsrs_last_review')::timestamptz
    end
  )
  on conflict (user_id, study_id, path_key)
  do update set
    attempts = excluded.attempts,
    correct_count = excluded.correct_count,
    streak = excluded.streak,
    mastery = excluded.mastery,
    last_reviewed_at = excluded.last_reviewed_at,
    due_at = excluded.due_at,
    fsrs_stability = excluded.fsrs_stability,
    fsrs_difficulty = excluded.fsrs_difficulty,
    fsrs_elapsed_days = excluded.fsrs_elapsed_days,
    fsrs_scheduled_days = excluded.fsrs_scheduled_days,
    fsrs_reps = excluded.fsrs_reps,
    fsrs_lapses = excluded.fsrs_lapses,
    fsrs_state = excluded.fsrs_state,
    fsrs_learning_steps = excluded.fsrs_learning_steps,
    fsrs_last_review = excluded.fsrs_last_review
  returning * into updated_progress;

  return updated_progress;
end;
$$;

create function public.apply_training_result_and_checkpoint(
  p_user_id uuid,
  p_session_id uuid,
  p_study_id uuid,
  p_path_key text,
  p_correct boolean,
  p_progress jsonb,
  p_checkpoint jsonb,
  p_expected_updated_at timestamptz
)
returns public.position_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_session public.training_sessions;
  updated_progress public.position_progress;
  next_status text;
begin
  if p_user_id is null then
    raise exception 'User is required';
  end if;
  if p_path_key is null or btrim(p_path_key) = '' then
    raise exception 'Training path is required';
  end if;
  if p_checkpoint is null or jsonb_typeof(p_checkpoint) <> 'object' then
    raise exception 'Training checkpoint is required';
  end if;

  perform private.validate_training_progress(p_progress);

  select *
  into locked_session
  from public.training_sessions
  where id = p_session_id
    and user_id = p_user_id
    and study_id = p_study_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active training session not found';
  end if;
  if locked_session.updated_at <> p_expected_updated_at then
    raise exception 'Training session changed before the checkpoint was saved';
  end if;
  if not exists (
    select 1
    from public.nodes
    where study_id = p_study_id
      and path_key = p_path_key
  ) then
    raise exception 'Training position not found';
  end if;

  insert into public.position_progress (
    user_id,
    study_id,
    path_key,
    attempts,
    correct_count,
    streak,
    mastery,
    last_reviewed_at,
    due_at,
    fsrs_stability,
    fsrs_difficulty,
    fsrs_elapsed_days,
    fsrs_scheduled_days,
    fsrs_reps,
    fsrs_lapses,
    fsrs_state,
    fsrs_learning_steps,
    fsrs_last_review
  )
  values (
    p_user_id,
    p_study_id,
    p_path_key,
    (p_progress->>'attempts')::integer,
    (p_progress->>'correct_count')::integer,
    (p_progress->>'streak')::integer,
    (p_progress->>'mastery')::integer,
    case jsonb_typeof(p_progress->'last_reviewed_at')
      when 'null' then null
      else (p_progress->>'last_reviewed_at')::timestamptz
    end,
    (p_progress->>'due_at')::timestamptz,
    (p_progress->>'fsrs_stability')::double precision,
    (p_progress->>'fsrs_difficulty')::double precision,
    (p_progress->>'fsrs_elapsed_days')::double precision,
    (p_progress->>'fsrs_scheduled_days')::double precision,
    (p_progress->>'fsrs_reps')::integer,
    (p_progress->>'fsrs_lapses')::integer,
    (p_progress->>'fsrs_state')::integer,
    (p_progress->>'fsrs_learning_steps')::integer,
    case jsonb_typeof(p_progress->'fsrs_last_review')
      when 'null' then null
      else (p_progress->>'fsrs_last_review')::timestamptz
    end
  )
  on conflict (user_id, study_id, path_key)
  do update set
    attempts = excluded.attempts,
    correct_count = excluded.correct_count,
    streak = excluded.streak,
    mastery = excluded.mastery,
    last_reviewed_at = excluded.last_reviewed_at,
    due_at = excluded.due_at,
    fsrs_stability = excluded.fsrs_stability,
    fsrs_difficulty = excluded.fsrs_difficulty,
    fsrs_elapsed_days = excluded.fsrs_elapsed_days,
    fsrs_scheduled_days = excluded.fsrs_scheduled_days,
    fsrs_reps = excluded.fsrs_reps,
    fsrs_lapses = excluded.fsrs_lapses,
    fsrs_state = excluded.fsrs_state,
    fsrs_learning_steps = excluded.fsrs_learning_steps,
    fsrs_last_review = excluded.fsrs_last_review
  returning * into updated_progress;

  next_status := case
    when p_checkpoint ->> 'status' = 'complete' then 'completed'
    else 'active'
  end;

  update public.training_sessions
  set checkpoint = p_checkpoint,
      status = next_status
  where id = p_session_id
    and user_id = p_user_id
    and status = 'active'
    and updated_at = p_expected_updated_at;

  if not found then
    raise exception 'Training session changed before the checkpoint was saved';
  end if;

  return updated_progress;
end;
$$;

revoke all on function public.apply_training_result(
  uuid, uuid, text, boolean, jsonb
) from public, authenticated, anon;
grant execute on function public.apply_training_result(
  uuid, uuid, text, boolean, jsonb
) to service_role;

revoke all on function public.apply_training_result_and_checkpoint(
  uuid, uuid, uuid, text, boolean, jsonb, jsonb, timestamptz
) from public, authenticated, anon;
grant execute on function public.apply_training_result_and_checkpoint(
  uuid, uuid, uuid, text, boolean, jsonb, jsonb, timestamptz
) to service_role;

comment on function public.apply_training_result(
  uuid, uuid, text, boolean, jsonb
) is
  'Service-only progress upsert from TS-computed fields; p_correct is audit-only.';

comment on function public.apply_training_result_and_checkpoint(
  uuid, uuid, uuid, text, boolean, jsonb, jsonb, timestamptz
) is
  'Service-only atomic TS-authored progress commit and checkpoint save.';
