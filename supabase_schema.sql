-- Create the lists table
create table if not exists public.lists (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  items jsonb not null
);

-- Enable Row Level Security for lists
alter table public.lists enable row level security;

-- Policies for lists (Anonymous/Public)
-- 1. Allow anyone to read lists (needed for sharing)
create policy "Public lists are viewable by everyone"
  on public.lists for select
  using (true);

-- 2. Allow anyone to create a list
create policy "Anyone can create a list"
  on public.lists for insert
  with check (true);

-- Note: Updates are currently disabled to prevent unauthorized modifications.
-- If you need editable anonymous lists, we'll need to store a secret token.

-- Create the user_interactions table
create table if not exists public.user_interactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  content_id integer not null,
  content_type text check (content_type in ('movie', 'tv', 'episode')) not null,
  interaction_type text check (interaction_type in ('watchlist', 'watched')) not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent duplicate entries for the same interaction
  unique(user_id, content_id, content_type, interaction_type)
);

-- Enable Row Level Security
alter table public.user_interactions enable row level security;

-- Create Policies

-- 1. Select Policy
create policy "Users can view their own interactions"
  on public.user_interactions for select
  using (auth.uid() = user_id);

-- 2. Insert Policy
create policy "Users can insert their own interactions"
  on public.user_interactions for insert
  with check (auth.uid() = user_id);

-- 3. Delete Policy
create policy "Users can delete their own interactions"
  on public.user_interactions for delete
  using (auth.uid() = user_id);

-- Create an index for faster lookups by user
create index if not exists user_interactions_user_id_idx on public.user_interactions(user_id);
