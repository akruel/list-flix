# AGENTS.md

## Commands

```bash
pnpm run dev          # Start dev server
pnpm run build        # Build (tsc -b && vite build)
pnpm run format       # Prettier
pnpm run lint         # ESLint
pnpm run lint:fix     # ESLint fix
pnpm run typecheck    # tsc --noEmit
pnpm run knip         # Find unused deps, exports, files
pnpm test             # Unit + UI tests (no Docker)
pnpm run test:unit-ui # Same as above
pnpm run test:rls     # RLS tests (requires Docker + Supabase CLI)
pnpm run test:e2e     # E2E tests (requires Docker + Supabase CLI)
pnpm run db:migration:new <name>  # Create migration
pnpm run db:push      # Push to DB
```

## Test Order

Always run `format -> lint -> typecheck -> knip -> test` before submitting.

## Architecture

- **Router**: TanStack Router (not react-router-dom). Auto-generated route tree at `src/routeTree.gen.ts`.
- **State**: Zustand stores in `src/stores/`
- **Backend**: Supabase (auth, DB, RLS policies in `supabase/`)
- **UI**: Radix UI primitives + shadcn patterns (cva, clsx, tailwind-merge)

## Key Conventions

- Mobile-first layout
- After DB changes: always create migration via `pnpm run db:migration:new`, verify old functions aren't broken
- Run lint + typecheck after every implementation
- Tests: `.test.ts` (unit), `.test.tsx` (ui), `tests/rls/` (RLS), `e2e/` (Playwright)

## Testing Notes

- `pnpm test` is fast, no Docker required
- RLS and E2E require Docker running + Supabase CLI installed
- E2E tests clean DB automatically before each run
- CI uses Supabase CLI v2.58.5

## Commit Message Convention

Follow the project pattern (Conventional Commits):

```
<type>: <description>
```

**Types**: `fix`, `feat`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`

**Rules**:

- Description in English, starting with capital letter
- Use imperative mood ("Add" not "Added", "Remove" not "Removed")
- Be concise and describe the "why" rather than "what"
- Keep under 72 characters when possible

**Examples from the project**:

- `fix: Remove deprecated baseUrl and fix security vulnerabilities`
- `feat: Add linters and formatter for AI-assisted development robustness`
- `refactor: Add Knip and clean up dead code`
- `chore: Ignore routeTree.gen.ts in Prettier`

## PR Description Convention

When creating pull requests, use bullet points for the description body:

```
- Added X
- Fixed Y
- Changed Z
```

## Squash Merge Convention

When merging a PR via squash merge on GitHub, the title must follow `<type>: <description> (#NN)` — same format as individual commits with the PR number appended. This ensures every commit in `git log --oneline` is directly traceable to its PR.

**Correct**:

```
feat: Add remove action to watchlist and replace confirm with modal (#38)
```

**Incorrect** (missing PR number):

```
feat: Add remove action to watchlist and replace confirm with modal
```

## Existing Agent Rules

- If lint rules or test coverage thresholds fail, refactor the code instead of adding suppressions or ignore comments. The tools exist to enforce quality — work with them, not around them.
