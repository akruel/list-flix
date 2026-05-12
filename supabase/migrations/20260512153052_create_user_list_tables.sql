create type public.user_list_tag_type as enum (
  'noite_de_pipoca',
  'fim_de_semana'
);

create table public.user_list (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) not null default auth.uid(),
  tmdb_id        integer not null,
  media_type     text check (media_type in ('movie', 'tv')) not null,
  title          text,
  name           text,
  poster_path    text,
  backdrop_path  text,
  vote_average   numeric,
  release_date   text,
  first_air_date text,
  overview       text,
  created_at     timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, tmdb_id, media_type)
);

create table public.user_list_tags (
  id             uuid default gen_random_uuid() primary key,
  user_list_id   uuid references public.user_list(id) on delete cascade not null,
  tag            public.user_list_tag_type not null,
  created_at     timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_list_id, tag)
);

alter table public.user_list enable row level security;
alter table public.user_list_tags enable row level security;

create policy "Users can view own list items"
  on public.user_list for select
  using (auth.uid() = user_id);

create policy "Users can insert own list items"
  on public.user_list for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own list items"
  on public.user_list for delete
  using (auth.uid() = user_id);

create policy "Users can update own list items"
  on public.user_list for update
  using (auth.uid() = user_id);

create policy "Users can view own tags"
  on public.user_list_tags for select
  using (
    exists (
      select 1 from public.user_list
      where id = user_list_tags.user_list_id
      and user_id = auth.uid()
    )
  );

create policy "Users can insert own tags"
  on public.user_list_tags for insert
  with check (
    exists (
      select 1 from public.user_list
      where id = user_list_tags.user_list_id
      and user_id = auth.uid()
    )
  );

create policy "Users can delete own tags"
  on public.user_list_tags for delete
  using (
    exists (
      select 1 from public.user_list
      where id = user_list_tags.user_list_id
      and user_id = auth.uid()
    )
  );

create index idx_user_list_user_id on public.user_list(user_id);
create index idx_user_list_tmdb on public.user_list(tmdb_id, media_type);
create index idx_user_list_tags_list_id on public.user_list_tags(user_list_id);
