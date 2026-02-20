#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to run E2E tests." >&2
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required to run E2E tests." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker and retry." >&2
  exit 1
fi

if ! supabase status --output env >/dev/null 2>&1; then
  echo "Supabase local stack is not running. Starting containers..."
  supabase start -x studio,imgproxy,storage-api,mailpit,realtime,edge-runtime,logflare,vector,postgres-meta,supavisor
fi

status_output="$(supabase status --output env)"
while IFS= read -r line; do
  if [[ "${line}" =~ ^[A-Z0-9_]+= ]]; then
    key="${line%%=*}"
    value="${line#*=}"
    value="${value#\"}"
    value="${value%\"}"
    export "${key}=${value}"
  fi
done <<< "${status_output}"

export VITE_SUPABASE_URL="${API_URL:-http://127.0.0.1:54321}"
export VITE_SUPABASE_ANON_KEY="${ANON_KEY:-}"
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-}"
export VITE_TMDB_ACCESS_TOKEN="${VITE_TMDB_ACCESS_TOKEN:-test-token}"
export VITE_GEMINI_API_KEY="${VITE_GEMINI_API_KEY:-test-gemini-key}"
export PLAYWRIGHT_TEST_BASE_URL="${PLAYWRIGHT_TEST_BASE_URL:-http://127.0.0.1:4173}"

if [[ -z "${VITE_SUPABASE_ANON_KEY}" ]]; then
  echo "Missing local Supabase anon key from status output." >&2
  exit 1
fi

echo "Running fast E2E DB cleanup (truncate + auth test users)..."
DB_CONTAINER="$(docker ps --format '{{.Names}}' | awk '/^supabase_db_/ {print; exit}')"
if [[ -z "${DB_CONTAINER}" ]]; then
  echo "Could not find Supabase DB container (expected name starting with supabase_db_)." >&2
  exit 1
fi

if ! docker exec -i "${DB_CONTAINER}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  _table_list text;
BEGIN
  WITH target_tables(table_ref) AS (
    VALUES
      ('public.list_items'),
      ('public.list_members'),
      ('public.lists'),
      ('public.watchlists'),
      ('public.watched_movies'),
      ('public.watched_episodes'),
      ('public.series_cache'),
      ('public.user_profiles'),
      ('public.user_interactions')
  ),
  existing_tables AS (
    SELECT string_agg(
      format(
        '%I.%I',
        split_part(table_ref, '.', 1),
        split_part(table_ref, '.', 2)
      ),
      ', '
    ) AS table_list
    FROM target_tables
    WHERE to_regclass(table_ref) IS NOT NULL
  )
  SELECT table_list INTO _table_list FROM existing_tables;

  IF _table_list IS NULL OR length(_table_list) = 0 THEN
    RAISE EXCEPTION 'No target tables found for E2E cleanup';
  END IF;

  EXECUTE format('TRUNCATE TABLE %s RESTART IDENTITY CASCADE', _table_list);
END
$$;

DO $$
DECLARE
  has_is_anonymous boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'users'
      AND column_name = 'is_anonymous'
  ) INTO has_is_anonymous;

  IF has_is_anonymous THEN
    DELETE FROM auth.users
    WHERE is_anonymous IS TRUE
      OR email LIKE '%@example.com';
  ELSE
    DELETE FROM auth.users
    WHERE email LIKE '%@example.com';
  END IF;
END
$$;
SQL
then
  echo "E2E DB fast cleanup failed. Aborting test suite." >&2
  exit 1
fi

echo "Ensuring Playwright Chromium is installed..."
npx playwright install chromium >/dev/null

npx playwright test "$@"
