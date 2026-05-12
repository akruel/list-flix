-- Update migrate_user_data to reference user_list instead of watchlists
create or replace function public.migrate_user_data(old_user_id uuid, new_user_id uuid)
returns void as $$
begin
  if auth.uid() != new_user_id then
    raise exception 'Unauthorized migration attempt';
  end if;

  update public.lists
  set owner_id = new_user_id
  where owner_id = old_user_id;

  update public.list_members
  set user_id = new_user_id
  where user_id = old_user_id
  and not exists (
    select 1 from public.list_members existing
    where existing.list_id = public.list_members.list_id
    and existing.user_id = new_user_id
  );

  delete from public.list_members where user_id = old_user_id;

  update public.list_items
  set added_by = new_user_id
  where added_by = old_user_id;

  update public.user_list
  set user_id = new_user_id
  where user_id = old_user_id
  and not exists (
    select 1 from public.user_list existing
    where existing.tmdb_id = public.user_list.tmdb_id
    and existing.media_type = public.user_list.media_type
    and existing.user_id = new_user_id
  );

  delete from public.user_list where user_id = old_user_id;

  update public.watched_movies
  set user_id = new_user_id
  where user_id = old_user_id
  and not exists (
    select 1 from public.watched_movies existing
    where existing.tmdb_id = public.watched_movies.tmdb_id
    and existing.user_id = new_user_id
  );

  delete from public.watched_movies where user_id = old_user_id;

  update public.watched_episodes
  set user_id = new_user_id
  where user_id = old_user_id
  and not exists (
    select 1 from public.watched_episodes existing
    where existing.tmdb_episode_id = public.watched_episodes.tmdb_episode_id
    and existing.user_id = new_user_id
  );

  delete from public.watched_episodes where user_id = old_user_id;

end;
$$ language plpgsql security definer;
