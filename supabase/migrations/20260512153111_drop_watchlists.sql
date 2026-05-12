-- Migrate existing watchlists to user_list
insert into public.user_list (user_id, tmdb_id, media_type, title, name, poster_path, backdrop_path, vote_average, release_date, first_air_date, overview)
select user_id, tmdb_id, media_type, title, name, poster_path, backdrop_path, vote_average, release_date, first_air_date, overview
from public.watchlists
on conflict (user_id, tmdb_id, media_type) do nothing;

-- Drop old table
drop table if exists public.watchlists cascade;
