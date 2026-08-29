# BanglaPay (বাংলা-পে)

BanglaPay is a simulated mobile financial service built for the PSTU National Hackathon 2026. It demonstrates trustworthy money movement through mobile registration, virtual OTP, secure PIN authentication, OCR-assisted NID KYC, one active device, fake BDT wallets, transfers, payment requests, receipts, and an append-only double-entry ledger.

This is an educational closed ecosystem. It does not process real money or connect to real NID, banking, card, mobile operator, or payment services.

## Team

- **Ahsan Habib:** application, architecture, database, UI, deployment, and documentation
- **Md. Saiful Islam:** automated testing, manual regression, production smoke testing, and defect reporting

## Architecture

```text
Next.js route
    -> service
        -> repository
            -> PostgreSQL RPC
                -> accounts + append-only double-entry ledger
```

Money is stored as `bigint` poisha, financial writes execute atomically in PostgreSQL, and cached account balances must always reconcile with the ledger. Read the complete [architecture contract](docs/ARCHITECTURE.md) before changing application behavior.

The full six-hour build order, team handoffs, phase gates, test matrix, deployment checks, and demo sequence are in the [development workflow checklist](docs/DEVELOPMENT-WORKFLOW.md).

## Stack

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS v4
- shadcn/ui with the Base UI preset
- Supabase PostgreSQL, Auth, Storage, CLI, and local Docker stack
- Vitest for unit and integration tests
- Playwright for the critical browser workflow
- Vercel for deployment

## Local Setup

1. Install Node.js 24 LTS, Git, Docker Desktop, and Playwright Chromium.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add local or hosted Supabase values.
4. Start Supabase with `npm run db:start`.
5. Rebuild the database with `npm run db:reset`.
6. Start Next.js with `npm run dev` and open `http://localhost:3000`.

Never commit `.env.local`, Supabase secret/service-role keys, the application pepper, reconciliation token, OTPs, PINs, device tokens, or NID data.

## Supabase Workflow

Create each database change with `npx supabase migration new <feature-name>`, edit the generated SQL, and verify the complete history with `npm run db:reset`.

After schema changes, regenerate types:

```bash
npx supabase gen types typescript --local > lib/supabase/database.types.ts
```

Use `npm run db:status` to inspect local URLs and keys and `npm run db:stop` when finished. Apply only reviewed migrations to the hosted project.

## Verification

```bash
npm run lint
npm run test:run
npm run test:e2e
npm run build
```

Financial integration tests must use the real local PostgreSQL database. Database mocks cannot verify locks, constraints, idempotency, or concurrent updates.

## Collaboration

Use short-lived branches such as `feat/auth-kyc`, `feat/wallet-core`, `test/wallet-concurrency`, or `fix/device-replacement`. Push and merge at the phase gates defined in the workflow checklist, then both teammates pull `main` immediately.

Keep files small and explain why security and concurrency decisions exist. Prefer readable, defensible code over feature count.

## Scaling Path

1. Transaction-mode connection pooling for Vercel traffic
2. Read replicas for transaction history, never balance authorization
3. Monthly partitioning for `ledger_entries`
4. Hash sharding by account when one PostgreSQL cluster becomes the limit

The modular monolith remains the correct starting point because a transfer touches two accounts and should complete as one local ACID transaction.
