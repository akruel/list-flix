#!/usr/bin/env bash
set -euo pipefail

# Creates one git worktree per vertical phase so each phase can be developed
# in parallel in a separate Cursor window without touching the main repo.
#
# Run from any directory inside the list-flix repo, *after* the Enabler PR
# (feat/enabler-react-query) is merged into origin/main.

cd "$(git rev-parse --show-toplevel)"

git fetch origin

declare -a phases=(
  "A:feat/details-watchlist-vertical"
  "B:feat/lists-vertical"
  "C:feat/home-taste-vertical"
  "D:feat/this-week-vertical"
  "E:feat/activity-vertical"
  "F:feat/cleanup-self-healing"
)

for entry in "${phases[@]}"; do
  letter="${entry%%:*}"
  branch="${entry##*:}"
  path="../list-flix-phase-${letter}"

  if [ -d "$path" ]; then
    echo "[skip] $path already exists."
    continue
  fi

  if git show-ref --verify --quiet "refs/heads/${branch}"; then
    git worktree add "$path" "$branch"
  else
    git worktree add -b "$branch" "$path" origin/main
  fi
  echo "[ok] $path -> $branch"
done

echo
echo "Next steps:"
echo "  1. cd into each worktree and run 'pnpm install' (each worktree needs its own node_modules)."
echo "  2. Open each worktree in a separate Cursor window."
echo "  3. Click 'Build in new agent' on the matching todo in each window."
