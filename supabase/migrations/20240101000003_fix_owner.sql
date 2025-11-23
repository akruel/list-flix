-- Trigger to set owner_id before insert
create or replace function public.set_list_owner()
returns trigger as $$
begin
  new.owner_id := auth.uid();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_owner on public.lists;
create trigger set_owner
  before insert on public.lists
  for each row
  execute function public.set_list_owner();

-- Update lists SELECT policy to check owner_id directly
drop policy if exists "Users can view their lists" on public.lists;
create policy "Users can view their lists"
  on public.lists for select
  using (
    owner_id = auth.uid() or public.is_list_member(id)
  );

-- We can also optimize the UPDATE/DELETE policies
drop policy if exists "Owners can update their lists" on public.lists;
create policy "Owners can update their lists"
  on public.lists for update
  using (
    owner_id = auth.uid()
  );

drop policy if exists "Owners can delete their lists" on public.lists;
create policy "Owners can delete their lists"
  on public.lists for delete
  using (
    owner_id = auth.uid()
  );
