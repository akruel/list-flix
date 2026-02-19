#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to run RLS tests." >&2
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required to run RLS tests." >&2
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

export SUPABASE_URL="${API_URL:-http://127.0.0.1:54321}"
export SUPABASE_ANON_KEY="${ANON_KEY:-}"
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-}"

if [[ -z "${SUPABASE_ANON_KEY}" || -z "${SUPABASE_SERVICE_ROLE_KEY}" ]]; then
  echo "Missing Supabase keys from local status output." >&2
  exit 1
fi

echo "Resetting local database to current migrations (no seed)..."
supabase db reset --local --no-seed --yes >/dev/null

npx vitest run --project rls "$@"
