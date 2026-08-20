create function public.import_study(
  p_title text,
  p_source_type text,
  p_pgn_text text,
  p_storage_path text,
  p_chapters jsonb
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
    pgn_storage_path
  )
  values (
    (select auth.uid()),
    btrim(p_title),
    p_source_type,
    p_pgn_text,
    p_storage_path
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

revoke all on function public.import_study(text, text, text, text, jsonb)
  from public, anon;
grant execute on function public.import_study(text, text, text, text, jsonb)
  to authenticated;
