-- Keep mastery server-authoritative and update scheduler state atomically.

drop policy if exists position_progress_owner_all
  on public.position_progress;

create policy position_progress_owner_select
  on public.position_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.position_progress from authenticated;

create function public.apply_training_result(
  p_study_id uuid,
  p_path_key text,
  p_correct boolean
)
returns public.position_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  reviewed_at timestamptz := clock_timestamp();
  updated_progress public.position_progress;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_path_key is null or btrim(p_path_key) = '' then
    raise exception 'Training path is required';
  end if;

  if not exists (
    select 1
    from public.studies
    where id = p_study_id
      and user_id = (select auth.uid())
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

  insert into public.position_progress as progress (
    user_id,
    study_id,
    path_key,
    attempts,
    correct_count,
    streak,
    mastery,
    last_reviewed_at,
    due_at
  )
  values (
    current_user_id,
    p_study_id,
    p_path_key,
    1,
    case when p_correct then 1 else 0 end,
    case when p_correct then 1 else 0 end,
    case when p_correct then 8 else 0 end,
    reviewed_at,
    reviewed_at + case
      when not p_correct then interval '1 hour'
      else interval '1 day'
    end
  )
  on conflict (user_id, study_id, path_key)
  do update set
    attempts = progress.attempts + 1,
    correct_count = progress.correct_count
      + case when p_correct then 1 else 0 end,
    streak = case
      when p_correct then progress.streak + 1
      else 0
    end,
    mastery = case
      when p_correct then least(100, progress.mastery + 8)
      else greatest(0, progress.mastery - 15)
    end,
    last_reviewed_at = reviewed_at,
    due_at = reviewed_at + case
      when not p_correct then interval '1 hour'
      when least(100, progress.mastery + 8) <= 20 then interval '1 day'
      when least(100, progress.mastery + 8) <= 40 then interval '3 days'
      when least(100, progress.mastery + 8) <= 60 then interval '7 days'
      when least(100, progress.mastery + 8) <= 80 then interval '14 days'
      else interval '30 days'
    end
  returning * into updated_progress;

  return updated_progress;
end;
$$;

revoke all on function public.apply_training_result(uuid, text, boolean)
  from public, anon;
grant execute on function public.apply_training_result(uuid, text, boolean)
  to authenticated;

comment on function public.apply_training_result(uuid, text, boolean) is
  'Authoritative training scheduler. Server actions pass only the owned study, path, and correctness result; clients cannot set mastery fields.';
