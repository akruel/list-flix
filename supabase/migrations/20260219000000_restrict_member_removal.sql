-- Restrict member management so owners cannot be removed and join cannot create owners.

-- Replace the broad member-management policy with operation-specific policies.
drop policy if exists "Owners can manage members" on public.list_members;

drop policy if exists "Owners can update members" on public.list_members;
create policy "Owners can update members"
  on public.list_members for update
  using (
    public.is_list_owner(list_id)
    and role in ('editor', 'viewer')
  )
  with check (
    public.is_list_owner(list_id)
    and role in ('editor', 'viewer')
  );

drop policy if exists "Owners can remove non-owner members" on public.list_members;
create policy "Owners can remove non-owner members"
  on public.list_members for delete
  using (
    public.is_list_owner(list_id)
    and role in ('editor', 'viewer')
  );

-- Harden join policy to prevent self-assigning the owner role.
drop policy if exists "Users can join lists" on public.list_members;
create policy "Users can join lists"
  on public.list_members for insert
  with check (
    auth.uid() = user_id
    and role in ('editor', 'viewer')
  );
