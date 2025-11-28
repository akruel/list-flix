-- Add metadata columns to watchlists table
ALTER TABLE watchlists
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS poster_path text,
ADD COLUMN IF NOT EXISTS backdrop_path text,
ADD COLUMN IF NOT EXISTS vote_average numeric,
ADD COLUMN IF NOT EXISTS release_date text,
ADD COLUMN IF NOT EXISTS first_air_date text,
ADD COLUMN IF NOT EXISTS overview text;
