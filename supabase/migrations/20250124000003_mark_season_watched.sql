-- RPC to mark a season as watched (bulk insert)
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
      tmdb_id,
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
    on conflict (user_id, tmdb_id) do nothing;
  end loop;
end;
$$;

-- RPC to mark a season as unwatched (bulk delete)
create or replace function public.mark_season_unwatched(
  show_id int,
  season_num int
)
returns void
language plpgsql
security definer
as $$
begin
  delete from public.watched_episodes
  where user_id = auth.uid()
  and tmdb_show_id = show_id
  and season_number = season_num;
end;
$$;
