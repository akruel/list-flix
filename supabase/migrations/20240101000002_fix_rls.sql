-- Fix infinite recursion by using security definer functions

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

-- Update list_members policies
drop policy if exists "Users can view members of their lists" on public.list_members;
create policy "Users can view members of their lists"
  on public.list_members for select
  using (
    public.is_list_member(list_id)
  );

drop policy if exists "Owners can manage members" on public.list_members;
create policy "Owners can manage members"
  on public.list_members for all
  using (
    public.is_list_owner(list_id)
  );

-- Update list_items policies
drop policy if exists "Members can view list items" on public.list_items;
create policy "Members can view list items"
  on public.list_items for select
  using (
    public.is_list_member(list_id)
  );

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
drop policy if exists "Users can view their lists" on public.lists;
create policy "Users can view their lists"
  on public.lists for select
  using (
    public.is_list_member(id)
  );

drop policy if exists "Owners can update their lists" on public.lists;
create policy "Owners can update their lists"
  on public.lists for update
  using (
    public.is_list_owner(id)
  );

drop policy if exists "Owners can delete their lists" on public.lists;
create policy "Owners can delete their lists"
  on public.lists for delete
  using (
    public.is_list_owner(id)
  );
