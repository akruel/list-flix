-- Create list_members table
create table if not exists public.list_members (
  list_id uuid references public.lists(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('owner', 'editor', 'viewer')) not null default 'viewer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (list_id, user_id)
);

-- Create list_items table
create table if not exists public.list_items (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references public.lists(id) on delete cascade not null,
  content_id integer not null,
  content_type text check (content_type in ('movie', 'tv')) not null,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(list_id, content_id, content_type)
);

-- Modify lists table
alter table public.lists 
  add column if not exists name text not null default 'Untitled List',
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Migrate existing lists to have an owner (if possible, otherwise they might be orphaned or need manual fix)
-- For this POC, we'll assume new lists or manual cleanup. 
-- If we wanted to be strict, we'd need to know who created them, but the old schema didn't track owner in the table directly (only via RLS maybe?).
-- Actually, the old schema allowed anonymous creation, so owner_id might be null for old lists. 
-- Let's allow owner_id to be nullable for now if we want to keep old lists, OR we can enforce it for new ones.
-- The plan said "Add owner_id", let's assume it can be null for legacy or we default to the creator if we knew them.
-- Since we are removing 'items', we should drop it.
alter table public.lists drop column if exists items;

-- Enable RLS
alter table public.list_members enable row level security;
alter table public.list_items enable row level security;

-- Helper functions to avoid infinite recursion in RLS
create or replace function public.is_list_member(_list_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.list_members
    where list_id = _list_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

create or replace function public.is_list_owner(_list_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.list_members
    where list_id = _list_id
    and user_id = auth.uid()
    and role = 'owner'
  );
end;
$$ language plpgsql security definer;

-- Policies for list_members

-- 1. Users can view members of lists they are a part of
-- 1. Users can view members of lists they are a part of
drop policy if exists "Users can view members of their lists" on public.list_members;
create policy "Users can view members of their lists"
  on public.list_members for select
  using (
    public.is_list_member(list_id)
  );

-- 2. Owners can manage members
-- 2. Owners can manage members
drop policy if exists "Owners can manage members" on public.list_members;
create policy "Owners can manage members"
  on public.list_members for all
  using (
    public.is_list_owner(list_id)
  );

-- Policies for list_items

-- 1. Members can view items
-- 1. Members can view items
drop policy if exists "Members can view list items" on public.list_items;
create policy "Members can view list items"
  on public.list_items for select
  using (
    exists (
      select 1 from public.list_members 
      where list_id = public.list_items.list_id 
      and user_id = auth.uid()
    )
  );

-- 2. Editors and Owners can add/remove items
-- 2. Editors and Owners can manage items
drop policy if exists "Editors and Owners can manage items" on public.list_items;
create policy "Editors and Owners can manage items"
  on public.list_items for all
  using (
    exists (
      select 1 from public.list_members 
      where list_id = public.list_items.list_id 
      and user_id = auth.uid() 
      and role in ('owner', 'editor')
    )
  );

-- Update lists policies
-- We need to update the existing policies on 'lists' table because the logic has changed.
-- Old policies were very open.

drop policy if exists "Public lists are viewable by everyone" on public.lists;
drop policy if exists "Anyone can create a list" on public.lists;

-- New Lists Policies

-- 1. Users can view lists they are a member of
-- 1. Users can view lists they are a member of
drop policy if exists "Users can view their lists" on public.lists;
create policy "Users can view their lists"
  on public.lists for select
  using (
    exists (
      select 1 from public.list_members 
      where list_id = public.lists.id 
      and user_id = auth.uid()
    )
  );

-- 2. Authenticated users can create lists
-- 2. Authenticated users can create lists
drop policy if exists "Authenticated users can create lists" on public.lists;
create policy "Authenticated users can create lists"
  on public.lists for insert
  with check (auth.role() = 'authenticated');

-- 3. Owners can update their lists
-- 3. Owners can update their lists
drop policy if exists "Owners can update their lists" on public.lists;
create policy "Owners can update their lists"
  on public.lists for update
  using (
    exists (
      select 1 from public.list_members 
      where list_id = public.lists.id 
      and user_id = auth.uid() 
      and role = 'owner'
    )
  );

-- 4. Owners can delete their lists
-- 4. Owners can delete their lists
drop policy if exists "Owners can delete their lists" on public.lists;
create policy "Owners can delete their lists"
  on public.lists for delete
  using (
    exists (
      select 1 from public.list_members 
      where list_id = public.lists.id 
      and user_id = auth.uid() 
      and role = 'owner'
    )
  );

-- Trigger to automatically add creator as owner in list_members
create or replace function public.handle_new_list()
returns trigger as $$
begin
  insert into public.list_members (list_id, user_id, role)
  values (new.id, auth.uid(), 'owner');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_list_created on public.lists;
create trigger on_list_created
  after insert on public.lists
  for each row
  execute function public.handle_new_list();
