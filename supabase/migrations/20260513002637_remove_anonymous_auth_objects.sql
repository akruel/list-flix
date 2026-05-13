-- 1. Delete data from tables without ON DELETE CASCADE (blocks auth.users deletion)
delete from public.push_subscriptions
where user_id in (select id from auth.users where is_anonymous = true);

delete from public.watchlists
where user_id in (select id from auth.users where is_anonymous = true);

delete from public.watched_movies
where user_id in (select id from auth.users where is_anonymous = true);

delete from public.watched_episodes
where user_id in (select id from auth.users where is_anonymous = true);

-- 2. Delete anonymous auth users
--    CASCADE handles: lists (owner_id), list_members
--    SET NULL handles: list_items (added_by)
delete from auth.users
where is_anonymous = true;

-- 3. Remove migrate_user_data RPC (no longer used, user_profiles was already dropped)
drop function if exists public.migrate_user_data;
