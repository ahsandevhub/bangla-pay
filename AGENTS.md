<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project workflow

- Use the root-level `app/`, `components/`, `lib/`, and `tests/` directories. Do not create a `src/` directory.
- Keep the Next.js App Router and Server Components as the default. Add `"use client"` only when browser APIs, event handlers, or client-only libraries require it.
- Before introducing or changing an integration, verify its current official documentation and prefer the installed latest-compatible package configuration.
- Use shadcn/ui components from `components/ui/`. This project uses the Base UI preset and Tailwind CSS v4; add components with `npx shadcn@latest add <component>`.
- Use `@/` imports for project modules. The alias resolves to the repository root.

## Supabase

- Use `@/lib/supabase/client` in Client Components and `@/lib/supabase/server` in Server Components, Server Actions, and Route Handlers.
- Keep schema changes as SQL migrations under `supabase/migrations/`; do not make untracked dashboard-only schema changes.
- Regenerate `lib/supabase/database.types.ts` after schema changes and keep row-level security enabled for user data.
- Never commit `.env.local`, service-role keys, passwords, or other credentials.

## Quality and collaboration

- Run `npm run lint`, `npm run test:run`, and `npm run build` after meaningful changes. Run `npm run test:e2e` for user-facing flow changes.
- Keep commits small and focused. Work from `feat/<area>`, `fix/<area>`, or `chore/<area>` branches, and do not modify another teammate's claimed files without coordination.
- Update `README.md` when setup commands, environment variables, deployment, or the team workflow changes.
