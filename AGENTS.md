# AGENTS.md

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Build (tsc -b && vite build)
npm run lint         # ESLint
npm run lint:fix     # ESLint fix
npm run typecheck    # tsc --noEmit
npm run knip         # Find unused deps, exports, files
npm test             # Unit + UI tests (no Docker)
npm run test:unit-ui # Same as above
npm run test:rls     # RLS tests (requires Docker + Supabase CLI)
npm run test:e2e     # E2E tests (requires Docker + Supabase CLI)
npm run db:migration:new <name>  # Create migration
npm run db:push      # Push to DB
```

## Test Order

Always run `lint -> typecheck -> knip -> test` before submitting.

## Architecture

- **Router**: TanStack Router (not react-router-dom). Auto-generated route tree at `src/routeTree.gen.ts`.
- **State**: Zustand stores in `src/stores/`
- **Backend**: Supabase (auth, DB, RLS policies in `supabase/`)
- **UI**: Radix UI primitives + shadcn patterns (cva, clsx, tailwind-merge)

## Key Conventions

- Mobile-first layout
- After DB changes: always create migration via `npm run db:migration:new`, verify old functions aren't broken
- Run lint + typecheck after every implementation
- Tests: `.test.ts` (unit), `.test.tsx` (ui), `tests/rls/` (RLS), `e2e/` (Playwright)

## Testing Notes

- `npm test` is fast, no Docker required
- RLS and E2E require Docker running + Supabase CLI installed
- E2E tests clean DB automatically before each run
- CI uses Supabase CLI v2.58.5

## Existing Agent Rules

See `.agent/rules/code-style-guide.md` for additional context (triggered always).
