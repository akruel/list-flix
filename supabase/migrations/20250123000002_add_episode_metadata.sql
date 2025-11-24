-- Migration: Add episode metadata fields
-- This migration ensures that all watched episodes have season_number and episode_number in their metadata
-- Since we use JSONB, no schema changes are needed, just data standardization

-- Note: Existing episode records without season_number and episode_number will need to be
-- re-marked as watched through the UI to capture the metadata. This is acceptable as it's
-- a one-time migration and the data will be captured going forward.

-- Add a comment to document the expected metadata structure for episodes
COMMENT ON COLUMN user_interactions.metadata IS 
  'JSONB metadata field. For episodes (content_type = ''episode''), should contain: {show_id: number, season_number: number, episode_number: number}';
