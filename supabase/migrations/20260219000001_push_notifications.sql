create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can view their own push subscription" on public.push_subscriptions;
create policy "Users can view their own push subscription" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own push subscription" on public.push_subscriptions;
create policy "Users can insert their own push subscription" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own push subscription" on public.push_subscriptions;
create policy "Users can delete their own push subscription" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
