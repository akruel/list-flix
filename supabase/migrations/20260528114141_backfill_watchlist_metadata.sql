-- Backfill watchlist metadata
--
-- Context: previously the client used a self-healing read path
-- (`userContentService.getUserContent`) to populate `title`/`name`/poster_path/etc.
-- on legacy rows lazily by calling TMDB. We are removing that self-healing block
-- because all current write paths (`addToWatchlist`, `syncLocalData`) already
-- persist the metadata at insert time.
--
-- This migration ensures the database is in a consistent state going forward:
--
-- 1. Delete any leftover rows that have no usable metadata (no title AND no name).
--    These cannot be rendered by the UI without an external lookup, so dropping
--    them is safe — users can re-add the item from the search flow, which now
--    always persists metadata.
-- 2. Add a CHECK constraint preventing future inserts/updates without at least
--    one of `title` or `name` populated, so the self-healing path can never be
--    needed again.

DELETE FROM public.watchlists
WHERE COALESCE(NULLIF(title, ''), NULLIF(name, '')) IS NULL;

ALTER TABLE public.watchlists
  ADD CONSTRAINT watchlists_metadata_required
  CHECK (COALESCE(NULLIF(title, ''), NULLIF(name, '')) IS NOT NULL);
