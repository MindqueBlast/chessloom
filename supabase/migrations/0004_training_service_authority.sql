-- Make training progress and checkpoints writable only by trusted server code.

revoke insert, update, delete on public.position_progress from authenticated;
revoke insert, update on public.training_sessions from authenticated;

drop policy if exists training_sessions_owner_all
  on public.training_sessions;

create policy training_sessions_owner_select
  on public.training_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on function public.apply_training_result(uuid, text, boolean)
  from public, authenticated, anon;
grant execute on function public.apply_training_result(uuid, text, boolean)
  to service_role;

create function public.apply_training_result_and_checkpoint(
  p_user_id uuid,
  p_session_id uuid,
  p_study_id uuid,
  p_path_key text,
  p_correct boolean,
  p_checkpoint jsonb,
  p_expected_updated_at timestamptz
)
returns public.position_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewed_at timestamptz := clock_timestamp();
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
    p_user_id,
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

revoke all on function public.apply_training_result_and_checkpoint(
  uuid, uuid, uuid, text, boolean, jsonb, timestamptz
) from public, authenticated, anon;
grant execute on function public.apply_training_result_and_checkpoint(
  uuid, uuid, uuid, text, boolean, jsonb, timestamptz
) to service_role;

comment on function public.apply_training_result_and_checkpoint(
  uuid, uuid, uuid, text, boolean, jsonb, timestamptz
) is
  'Service-only atomic training scheduler and checkpoint commit.';
