-- Returns shared list context for a given TMDB content
-- Shows which shared lists contain this item and who the other members are
create or replace function public.get_watching_context(
  p_content_id int,
  p_content_type text
)
returns table (
  list_name text,
  member_names text[]
)
language sql
security definer
set search_path = ''
as $$
  select
    l.name,
    array_agg(lm.member_name order by lm.member_name)
      filter (where lm.user_id != auth.uid())
  from public.list_items li
  join public.lists l on l.id = li.list_id
  join public.list_members lm on lm.list_id = li.list_id
  where li.content_id = p_content_id
    and li.content_type = p_content_type
  group by li.list_id, l.name;
$$;
