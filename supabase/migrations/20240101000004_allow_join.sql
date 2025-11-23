-- Allow users to join lists (insert themselves into list_members)
create policy "Users can join lists"
  on public.list_members for insert
  with check (
    auth.uid() = user_id
  );
