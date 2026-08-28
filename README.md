# PSTU National Hackathon 2026

Starter repository for Ahsan Habib and Md. Saiful Islam. Replace this section with the challenge problem statement when it is announced.

## Stack

- Next.js App Router, TypeScript, and Tailwind CSS v4
- shadcn/ui with the Base UI component library
- Supabase for PostgreSQL, Auth, Storage, and local development
- Vitest for unit tests and Playwright for end-to-end smoke tests
- Vercel for deployment

## Local Setup

1. Install Node.js 24 LTS and Docker Desktop.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and provide the hosted Supabase values.
4. Run `npm run dev` and open `http://localhost:3000`.

## Supabase

Run `npm run db:start` to start the local Supabase stack. Use `npm run db:status` to copy the local API URL and publishable key when needed. Stop the stack with `npm run db:stop`.

Create every database change with `npx supabase migration new <feature-name>`, edit the generated SQL under `supabase/migrations/`, and verify it with `npm run db:reset`. Apply the reviewed migrations to the hosted project before deployment.

After a schema change, regenerate types with `npx supabase gen types typescript --local > lib/supabase/database.types.ts` while the local stack is running. For the hosted database, add `--project-id <project-id>` after linking the CLI.

## Tests

- `npm run lint` checks code quality.
- `npm test` runs Vitest in watch mode.
- `npm run test:run` runs unit tests once.
- `npm run test:e2e` runs Playwright against the local app.
- `npm run test:ci` runs lint, unit tests, and end-to-end tests.

Run `npx playwright install chromium` once on each laptop before the first end-to-end test.

## Team Workflow

Use a short-lived branch for each focused task: `feat/<area>`, `fix/<area>`, or `chore/<area>`. Before beginning, pull `main`, create the branch, and tell the other teammate which files or feature you own. Push small commits, open a pull request, get a quick review, merge, and pull `main` again.

Never work on the same component or page at the same time. If a conflict occurs, resolve it together immediately instead of guessing. Keep `main` deployable at all times.

## Deployment

Link this repository to Vercel. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel for Preview and Production. Do not commit `.env.local` or any service-role key.
