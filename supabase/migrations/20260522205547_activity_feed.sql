-- ============================================================
-- Activity Feed — Phase 1
-- Tracks social interactions between members of shared lists.
-- ============================================================

-- ── 1. Activities table ──────────────────────────────────────

CREATE TABLE activities (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text        NOT NULL CHECK (activity_type IN (
    'episode_watched',
    'movie_watched',
    'item_added',
    'item_removed',
    'member_joined'
  )),
  list_id       uuid        REFERENCES lists(id) ON DELETE CASCADE,
  content_id    integer,
  content_type  text        CHECK (content_type IN ('movie', 'tv')),
  metadata      jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes for query patterns used by get_activity_feed
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_actor_id   ON activities(actor_id);
CREATE INDEX idx_activities_list_id    ON activities(list_id);
CREATE INDEX idx_activities_content    ON activities(content_id, content_type);

-- Enable RLS; all reads go through the SECURITY DEFINER RPC
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Trigger functions (SECURITY DEFINER) may insert directly
-- No direct access for regular users
CREATE POLICY "No direct access" ON activities
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false);

-- ── 2. Add metadata columns to interaction tables ─────────────

ALTER TABLE list_items ADD COLUMN title text;
ALTER TABLE list_items ADD COLUMN poster_path text;

-- ── 3. Helper: get actor metadata ────────────────────────────

CREATE OR REPLACE FUNCTION _get_actor_metadata(p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta jsonb;
BEGIN
  SELECT jsonb_build_object(
    'actor_name',       COALESCE(
                          raw_user_meta_data->>'display_name',
                          raw_user_meta_data->>'full_name',
                          raw_user_meta_data->>'name',
                          split_part(email, '@', 1)
                        ),
    'actor_avatar_url', raw_user_meta_data->>'avatar_url'
  )
  INTO v_meta
  FROM auth.users
  WHERE id = p_actor_id;

  RETURN COALESCE(v_meta, '{}'::jsonb);
END;
$$;

-- ── 4. Trigger: episode_watched ───────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_activity_episode_watched()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_meta   jsonb;
  v_title        text;
  v_poster       text;
BEGIN
  -- Only fire if the show is in a shared list the actor belongs to
  SELECT li.title, li.poster_path
  INTO v_title, v_poster
  FROM list_items li
  JOIN list_members lm ON lm.list_id = li.list_id AND lm.user_id = NEW.user_id
  WHERE li.content_id   = NEW.tmdb_show_id
    AND li.content_type = 'tv'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_actor_meta   := _get_actor_metadata(NEW.user_id);

  INSERT INTO activities (actor_id, activity_type, content_id, content_type, metadata)
  VALUES (
    NEW.user_id,
    'episode_watched',
    NEW.tmdb_show_id,
    'tv',
    v_actor_meta || jsonb_build_object(
      'content_title', v_title,
      'poster_path',   v_poster,
      'season_number',  NEW.season_number,
      'episode_number', NEW.episode_number
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_episode_watched
  AFTER INSERT ON watched_episodes
  FOR EACH ROW EXECUTE FUNCTION trg_fn_activity_episode_watched();

-- ── 5. Trigger: movie_watched ─────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_activity_movie_watched()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_meta   jsonb;
  v_title        text;
  v_poster       text;
BEGIN
  -- Only fire if the movie is in a shared list the actor belongs to
  SELECT li.title, li.poster_path
  INTO v_title, v_poster
  FROM list_items li
  JOIN list_members lm ON lm.list_id = li.list_id AND lm.user_id = NEW.user_id
  WHERE li.content_id   = NEW.tmdb_id
    AND li.content_type = 'movie'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_actor_meta   := _get_actor_metadata(NEW.user_id);

  INSERT INTO activities (actor_id, activity_type, content_id, content_type, metadata)
  VALUES (
    NEW.user_id,
    'movie_watched',
    NEW.tmdb_id,
    'movie',
    v_actor_meta || jsonb_build_object(
      'content_title', v_title,
      'poster_path',   v_poster
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_movie_watched
  AFTER INSERT ON watched_movies
  FOR EACH ROW EXECUTE FUNCTION trg_fn_activity_movie_watched();

-- ── 6. Trigger: item_added ────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_activity_item_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_meta   jsonb;
  v_content_meta jsonb;
  v_list_name    text;
BEGIN
  -- added_by may be null (SET NULL on user delete); skip in that case
  IF NEW.added_by IS NULL THEN
    RETURN NEW;
  END IF;

  v_actor_meta   := _get_actor_metadata(NEW.added_by);
  v_content_meta := jsonb_build_object(
    'content_title', NEW.title,
    'poster_path',   NEW.poster_path
  );

  SELECT name INTO v_list_name FROM lists WHERE id = NEW.list_id;

  INSERT INTO activities (actor_id, activity_type, list_id, content_id, content_type, metadata)
  VALUES (
    NEW.added_by,
    'item_added',
    NEW.list_id,
    NEW.content_id,
    NEW.content_type,
    v_actor_meta || v_content_meta || jsonb_build_object('list_name', v_list_name)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_item_added
  AFTER INSERT ON list_items
  FOR EACH ROW EXECUTE FUNCTION trg_fn_activity_item_added();

-- ── 7. Trigger: item_removed ──────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_activity_item_removed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_meta   jsonb;
  v_content_meta jsonb;
  v_list_name    text;
  v_current_user uuid;
BEGIN
  -- On DELETE, we use the current session user (who issued the DELETE)
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RETURN OLD;
  END IF;

  v_actor_meta   := _get_actor_metadata(v_current_user);
  v_content_meta := jsonb_build_object(
    'content_title', OLD.title,
    'poster_path',   OLD.poster_path
  );

  SELECT name INTO v_list_name FROM lists WHERE id = OLD.list_id;

  INSERT INTO activities (actor_id, activity_type, list_id, content_id, content_type, metadata)
  VALUES (
    v_current_user,
    'item_removed',
    OLD.list_id,
    OLD.content_id,
    OLD.content_type,
    v_actor_meta || v_content_meta || jsonb_build_object('list_name', v_list_name)
  );

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_activity_item_removed
  AFTER DELETE ON list_items
  FOR EACH ROW EXECUTE FUNCTION trg_fn_activity_item_removed();

-- ── 8. Trigger: member_joined ─────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_activity_member_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_meta jsonb;
  v_list_name  text;
BEGIN
  -- Skip owner auto-join (created by the on_list_created trigger)
  IF NEW.role = 'owner' THEN
    RETURN NEW;
  END IF;

  v_actor_meta := _get_actor_metadata(NEW.user_id);

  -- Use member_name if provided, fall back to auth metadata
  IF NEW.member_name IS NOT NULL THEN
    v_actor_meta := v_actor_meta || jsonb_build_object('actor_name', NEW.member_name);
  END IF;

  SELECT name INTO v_list_name FROM lists WHERE id = NEW.list_id;

  INSERT INTO activities (actor_id, activity_type, list_id, metadata)
  VALUES (
    NEW.user_id,
    'member_joined',
    NEW.list_id,
    v_actor_meta || jsonb_build_object(
      'list_name',   v_list_name,
      'member_name', COALESCE(NEW.member_name, v_actor_meta->>'actor_name')
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_member_joined
  AFTER INSERT ON list_members
  FOR EACH ROW EXECUTE FUNCTION trg_fn_activity_member_joined();

-- ── 9. RPC: get_activity_feed ─────────────────────────────────
--
-- Returns activities visible to the current user:
--   - List events (item_added/removed, member_joined) from lists the user belongs to
--   - Watched events from co-members, but ONLY for content in shared lists
-- Excludes the user's own activities.

CREATE OR REPLACE FUNCTION get_activity_feed(
  p_limit  integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS SETOF activities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  WITH
    my_lists AS (
      SELECT lm.list_id
      FROM   list_members lm
      WHERE  lm.user_id = v_user_id
    ),
    shared_content AS (
      SELECT DISTINCT li.content_id, li.content_type
      FROM   list_items li
      WHERE  li.list_id IN (SELECT ml.list_id FROM my_lists ml)
    ),
    co_members AS (
      SELECT DISTINCT lm.user_id
      FROM   list_members lm
      WHERE  lm.list_id IN (SELECT ml.list_id FROM my_lists ml)
        AND  lm.user_id <> v_user_id
    )
  SELECT a.*
  FROM   activities a
  WHERE  a.actor_id <> v_user_id
    AND (
      -- List-level events: item added/removed or member joined one of my lists
      (
        a.activity_type IN ('item_added', 'item_removed', 'member_joined')
        AND a.list_id IN (SELECT ml.list_id FROM my_lists ml)
      )
      OR
      -- Watch events: actor is a co-member AND content is in a list we share
      (
        a.activity_type IN ('episode_watched', 'movie_watched')
        AND a.actor_id IN (SELECT cm.user_id FROM co_members cm)
        AND EXISTS (
          SELECT 1 FROM shared_content sc
          WHERE  sc.content_id   = a.content_id
            AND  sc.content_type = a.content_type
        )
      )
    )
  ORDER BY a.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;


-- ── 11. 7-day retention via pg_cron ──────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE OR REPLACE FUNCTION cleanup_old_activities()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM activities WHERE created_at < now() - interval '7 days';
$$;

SELECT cron.schedule(
  'cleanup-old-activities',
  '0 3 * * *',
  'SELECT cleanup_old_activities()'
);
