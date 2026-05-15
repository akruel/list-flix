-- Replace get_watching_context with security invoker (relies on RLS)
-- Add batched variant for N+1 prevention

drop function if exists public.get_watching_context;

create or replace function public.get_watching_context(
  p_content_id int,
  p_content_type text
)
returns table (
  list_name text,
  member_names text[]
)
language sql
security invoker
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

create or replace function public.get_watching_context_batch(
  p_items jsonb
)
returns table (
  content_id int,
  list_name text,
  member_names text[]
)
language sql
security invoker
set search_path = ''
as $$
  select
    li.content_id,
    l.name,
    array_agg(lm.member_name order by lm.member_name)
      filter (where lm.user_id != auth.uid())
  from public.list_items li
  join public.lists l on l.id = li.list_id
  join public.list_members lm on lm.list_id = li.list_id
  join jsonb_to_recordset(p_items) as item(
    content_id int,
    content_type text
  ) on li.content_id = item.content_id
    and li.content_type = item.content_type
  group by li.content_id, li.list_id, l.name;
$$;
