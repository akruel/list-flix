-- Local dev seed for testing watch progress (movies + derived series watched).
-- Login: dev@list-flix.local / dev123456
--   Console: await window.__supabase.auth.signInWithPassword({ email: 'dev@list-flix.local', password: 'dev123456' })
-- OTP inbox (local): http://127.0.0.1:54324
--
-- Expected card behaviour:
--   A Origem  (movie, watched)   → blue check badge (top-right)
--   Chernobyl (tv, 5/5)          → green progress bar (100%), no badge
--   Breaking Bad (tv, 3/62)      → amber progress bar (~5%), no badge

create extension if not exists pgcrypto;

do $$
declare
  dev_user_id uuid := '11111111-1111-1111-1111-111111111111';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    dev_user_id,
    'authenticated',
    'authenticated',
    'dev@list-flix.local',
    crypt('dev123456', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dev User"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  on conflict (id) do nothing;

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    dev_user_id,
    dev_user_id,
    format('{"sub":"%s","email":"dev@list-flix.local"}', dev_user_id)::jsonb,
    'email',
    'dev@list-flix.local',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do nothing;
end $$;

-- Watchlist
insert into public.watchlists (
  user_id,
  tmdb_id,
  media_type,
  title,
  name,
  poster_path,
  vote_average,
  release_date,
  first_air_date,
  overview
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    27205,
    'movie',
    'A Origem',
    null,
    '/9e3Dz7aCANy5aRUQF745IlNloJ1.jpg',
    8.37,
    '2010-07-15',
    null,
    'Filme assistido (watched_movies).'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    87108,
    'tv',
    null,
    'Chernobyl',
    '/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg',
    8.7,
    null,
    '2019-05-06',
    'Série completa: 5/5 episódios assistidos → barra verde (100%).'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    1396,
    'tv',
    null,
    'Breaking Bad',
    '/hGwm9Cj3CdbJIqQWNExQqiYmCd4.jpg',
    8.9,
    null,
    '2008-01-20',
    'Série parcial: 3/62 episódios → barra âmbar (~5%).'
  )
on conflict (user_id, tmdb_id, media_type) do nothing;

-- Movie watched (explicit toggle path)
insert into public.watched_movies (user_id, tmdb_id)
values ('11111111-1111-1111-1111-111111111111', 27205)
on conflict (user_id, tmdb_id) do nothing;

-- Series cache totals (required for derived "assistido" on TV)
insert into public.series_cache (tmdb_id, total_episodes, number_of_seasons)
values
  (87108, 5, 1),
  (1396, 62, 5)
on conflict (tmdb_id) do update
set
  total_episodes = excluded.total_episodes,
  number_of_seasons = excluded.number_of_seasons,
  updated_at = now();

-- Chernobyl: all 5 episodes watched → series should appear as watched
insert into public.watched_episodes (
  user_id,
  tmdb_show_id,
  tmdb_episode_id,
  season_number,
  episode_number
)
values
  ('11111111-1111-1111-1111-111111111111', 87108, 1725580, 1, 1),
  ('11111111-1111-1111-1111-111111111111', 87108, 1747124, 1, 2),
  ('11111111-1111-1111-1111-111111111111', 87108, 1747125, 1, 3),
  ('11111111-1111-1111-1111-111111111111', 87108, 1747126, 1, 4),
  ('11111111-1111-1111-1111-111111111111', 87108, 1747127, 1, 5)
on conflict (user_id, tmdb_episode_id) do nothing;

-- Breaking Bad: first 3 episodes only → series should NOT appear as watched
insert into public.watched_episodes (
  user_id,
  tmdb_show_id,
  tmdb_episode_id,
  season_number,
  episode_number
)
values
  ('11111111-1111-1111-1111-111111111111', 1396, 62085, 1, 1),
  ('11111111-1111-1111-1111-111111111111', 1396, 62086, 1, 2),
  ('11111111-1111-1111-1111-111111111111', 1396, 62087, 1, 3)
on conflict (user_id, tmdb_episode_id) do nothing;
