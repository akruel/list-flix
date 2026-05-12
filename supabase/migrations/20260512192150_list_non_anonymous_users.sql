create or replace function public.list_non_anonymous_users()
returns table (user_id uuid, display_name text)
language sql
security definer
as $$
  select
    id as user_id,
    coalesce(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      raw_user_meta_data->>'preferred_name',
      raw_user_meta_data->>'email',
      'Usuário'
    ) as display_name
  from auth.users
  where raw_user_meta_data->>'is_anonymous' is distinct from 'true'
  order by display_name
$$;
