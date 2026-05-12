create table public.watch_partners (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  partner_user_id uuid references auth.users(id) on delete cascade not null,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, partner_user_id),
  check (user_id != partner_user_id)
);

alter table public.watch_partners enable row level security;

create policy "Users can view own partnerships"
  on public.watch_partners for select
  using (auth.uid() = user_id or auth.uid() = partner_user_id);

create policy "Users can create partnerships"
  on public.watch_partners for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own partnerships"
  on public.watch_partners for delete
  using (auth.uid() = user_id or auth.uid() = partner_user_id);

create index idx_watch_partners_user on public.watch_partners(user_id);
create index idx_watch_partners_partner on public.watch_partners(partner_user_id);
