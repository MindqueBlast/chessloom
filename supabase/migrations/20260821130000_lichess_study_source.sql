-- Widen studies.source_type to include lichess_study and store Lichess metadata.
-- Extend import_study / reimport_study with optional lichess id/url params.

alter table public.studies
  drop constraint if exists studies_source_type_check;

alter table public.studies
  add constraint studies_source_type_check
  check (source_type in ('pgn_paste', 'pgn_upload', 'lichess_study'));

alter table public.studies
  add column if not exists lichess_study_id text,
  add column if not exists lichess_study_url text;

drop function if exists public.import_study(text, text, text, text, jsonb);

create function public.import_study(
  p_title text,
  p_source_type text,
  p_pgn_text text,
  p_storage_path text,
  p_chapters jsonb,
  p_lichess_study_id text default null,
  p_lichess_study_url text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  imported_study_id uuid;
  imported_chapter_id uuid;
  imported_parent_id uuid;
  chapter jsonb;
  node jsonb;
  parent_path text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if p_title is null or btrim(p_title) = '' then
    raise exception 'Study title is required';
  end if;

  if jsonb_typeof(p_chapters) <> 'array'
    or jsonb_array_length(p_chapters) = 0 then
    raise exception 'At least one chapter is required';
  end if;

  insert into public.studies (
    user_id,
    title,
    source_type,
    pgn_text,
    pgn_storage_path,
    lichess_study_id,
    lichess_study_url
  )
  values (
    (select auth.uid()),
    btrim(p_title),
    p_source_type,
    p_pgn_text,
    p_storage_path,
    p_lichess_study_id,
    p_lichess_study_url
  )
  returning id into imported_study_id;

  for chapter in
    select value
    from jsonb_array_elements(p_chapters)
  loop
    insert into public.chapters (
      study_id,
      chapter_index,
      name,
      initial_fen,
      headers
    )
    values (
      imported_study_id,
      (chapter ->> 'chapter_index')::integer,
      chapter ->> 'name',
      chapter ->> 'initial_fen',
      coalesce(chapter -> 'headers', '{}'::jsonb)
    )
    returning id into imported_chapter_id;

    for node in
      select value
      from jsonb_array_elements(chapter -> 'nodes')
    loop
      parent_path := node ->> 'parent_path_key';
      imported_parent_id := null;

      if parent_path is not null then
        select id
        into imported_parent_id
        from public.nodes
        where study_id = imported_study_id
          and chapter_id = imported_chapter_id
          and path_key = parent_path;

        if imported_parent_id is null then
          raise exception 'Parent node % was not imported first', parent_path;
        end if;
      end if;

      insert into public.nodes (
        study_id,
        chapter_id,
        parent_id,
        path_key,
        ply,
        san,
        uci,
        fen,
        comment,
        nags
      )
      values (
        imported_study_id,
        imported_chapter_id,
        imported_parent_id,
        node ->> 'path_key',
        (node ->> 'ply')::integer,
        node ->> 'san',
        node ->> 'uci',
        node ->> 'fen',
        node ->> 'comment',
        coalesce(node -> 'nags', '[]'::jsonb)
      );
    end loop;
  end loop;

  return imported_study_id;
end;
$$;

revoke all on function public.import_study(text, text, text, text, jsonb, text, text)
  from public, anon;
grant execute on function public.import_study(text, text, text, text, jsonb, text, text)
  to authenticated;

drop function if exists public.reimport_study(uuid, text, text, text, jsonb);

create function public.reimport_study(
  p_study_id uuid,
  p_source_type text,
  p_pgn_text text,
  p_storage_path text,
  p_chapters jsonb,
  p_lichess_study_id text default null,
  p_lichess_study_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reimported_chapter_id uuid;
  reimported_parent_id uuid;
  chapter jsonb;
  node jsonb;
  parent_path text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.studies
    where id = p_study_id
      and user_id = (select auth.uid())
  ) then
    raise exception 'Study not found';
  end if;

  if p_source_type not in ('pgn_paste', 'pgn_upload', 'lichess_study') then
    raise exception 'Invalid study source type';
  end if;

  if p_pgn_text is null and p_storage_path is null then
    raise exception 'A PGN source is required';
  end if;

  if jsonb_typeof(p_chapters) <> 'array'
    or jsonb_array_length(p_chapters) = 0 then
    raise exception 'At least one chapter is required';
  end if;

  update public.studies
  set source_type = p_source_type,
      pgn_text = p_pgn_text,
      pgn_storage_path = p_storage_path,
      lichess_study_id = p_lichess_study_id,
      lichess_study_url = p_lichess_study_url
  where id = p_study_id
    and user_id = (select auth.uid());

  delete from public.chapters
  where study_id = p_study_id;

  for chapter in
    select value
    from jsonb_array_elements(p_chapters)
  loop
    insert into public.chapters (
      study_id,
      chapter_index,
      name,
      initial_fen,
      headers
    )
    values (
      p_study_id,
      (chapter ->> 'chapter_index')::integer,
      chapter ->> 'name',
      chapter ->> 'initial_fen',
      coalesce(chapter -> 'headers', '{}'::jsonb)
    )
    returning id into reimported_chapter_id;

    for node in
      select value
      from jsonb_array_elements(chapter -> 'nodes')
    loop
      parent_path := node ->> 'parent_path_key';
      reimported_parent_id := null;

      if parent_path is not null then
        select id
        into reimported_parent_id
        from public.nodes
        where study_id = p_study_id
          and chapter_id = reimported_chapter_id
          and path_key = parent_path;

        if reimported_parent_id is null then
          raise exception 'Parent node % was not imported first', parent_path;
        end if;
      end if;

      insert into public.nodes (
        study_id,
        chapter_id,
        parent_id,
        path_key,
        ply,
        san,
        uci,
        fen,
        comment,
        nags
      )
      values (
        p_study_id,
        reimported_chapter_id,
        reimported_parent_id,
        node ->> 'path_key',
        (node ->> 'ply')::integer,
        node ->> 'san',
        node ->> 'uci',
        node ->> 'fen',
        node ->> 'comment',
        coalesce(node -> 'nags', '[]'::jsonb)
      );
    end loop;
  end loop;

  delete from public.position_progress as progress
  where progress.study_id = p_study_id
    and progress.user_id = (select auth.uid())
    and not exists (
      select 1
      from public.nodes
      where nodes.study_id = p_study_id
        and nodes.path_key = progress.path_key
    );

  return p_study_id;
end;
$$;

revoke all on function public.reimport_study(uuid, text, text, text, jsonb, text, text)
  from public, anon;
grant execute on function public.reimport_study(uuid, text, text, text, jsonb, text, text)
  to authenticated;

comment on function public.reimport_study(uuid, text, text, text, jsonb, text, text) is
  'Owner-only study replacement. SECURITY DEFINER so unmatched progress can be pruned after authenticated DELETE was revoked.';
