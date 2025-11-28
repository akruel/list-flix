-- Function to migrate anonymous user data
create or replace function public.migrate_user_data(old_user_id uuid, new_user_id uuid)
returns void as $$
begin
  -- Verify that the executing user is the new_user_id (security check)
  if auth.uid() != new_user_id then
    raise exception 'Unauthorized migration attempt';
  end if;

  -- 1. Update lists ownership
  update public.lists
  set owner_id = new_user_id
  where owner_id = old_user_id;

  -- 2. Update list memberships
  -- Handle potential conflicts if user is already a member
  update public.list_members
  set user_id = new_user_id
  where user_id = old_user_id
  and not exists (
    select 1 from public.list_members existing
    where existing.list_id = public.list_members.list_id
    and existing.user_id = new_user_id
  );
  
  -- Delete any remaining old memberships (duplicates)
  delete from public.list_members where user_id = old_user_id;

  -- 3. Update list items added_by
  update public.list_items
  set added_by = new_user_id
  where added_by = old_user_id;

  -- 4. Update watchlists
  update public.watchlists
  set user_id = new_user_id
  where user_id = old_user_id
  and not exists (
    select 1 from public.watchlists existing
    where existing.tmdb_id = public.watchlists.tmdb_id
    and existing.media_type = public.watchlists.media_type
    and existing.user_id = new_user_id
  );

  delete from public.watchlists where user_id = old_user_id;

  -- 5. Update watched_movies
  update public.watched_movies
  set user_id = new_user_id
  where user_id = old_user_id
  and not exists (
    select 1 from public.watched_movies existing
    where existing.tmdb_id = public.watched_movies.tmdb_id
    and existing.user_id = new_user_id
  );

  delete from public.watched_movies where user_id = old_user_id;

  -- 6. Update watched_episodes
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
