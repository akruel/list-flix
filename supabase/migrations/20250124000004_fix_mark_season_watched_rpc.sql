-- Fix RPC to mark a season as watched (correct column name tmdb_episode_id)
create or replace function public.mark_season_watched(
  episodes jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  episode record;
begin
  -- Iterate over the array of episodes
  for episode in select * from jsonb_to_recordset(episodes) as x(
    tmdb_id int,
    tmdb_show_id int,
    season_number int,
    episode_number int
  )
  loop
    insert into public.watched_episodes (
      user_id,
      tmdb_episode_id,
      tmdb_show_id,
      season_number,
      episode_number,
      watched_at
    )
    values (
      auth.uid(),
      episode.tmdb_id,
      episode.tmdb_show_id,
      episode.season_number,
      episode.episode_number,
      now()
    )
    on conflict (user_id, tmdb_episode_id) do nothing;
  end loop;
end;
$$;
