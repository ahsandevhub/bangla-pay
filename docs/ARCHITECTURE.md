# BanglaPay Architecture

BanglaPay (বাংলা-পে) is a simulated Bangladesh mobile financial service for the PSTU National Hackathon 2026. It supports phone registration, virtual OTP verification, PIN authentication, NID-based KYC, a fake BDT wallet, transfers, payment requests, receipts, and transaction history.

The system is a closed money ecosystem. It does not connect to real banks, mobile operators, government services, or payment networks.

## Architecture Contract

These decisions are non-negotiable during the hackathon.

1. **Money uses integer poisha.** Store amounts as PostgreSQL `bigint` and TypeScript `bigint`. Never use floating-point values or JavaScript `number` for money. Format BDT only at input and presentation boundaries.
2. **PostgreSQL owns money correctness.** All financial mutations run inside hardened `SECURITY DEFINER` PL/pgSQL functions. TypeScript must never read a balance, decide whether it is sufficient, and then write a new balance.
3. **The ledger is authoritative.** `ledger_entries` is append-only and double-entry. `accounts.balance_poisha` is a read-optimized cache that must reconcile with the ledger.
4. **Use a modular monolith.** Requests flow through route handler → service → repository → PostgreSQL function. Components and route handlers never query financial tables directly.
5. **Use only the named patterns.** Repository, Service Layer, Money Value Object, Result type, and Zod DTO boundary are sufficient. Do not add patterns for presentation value.
6. **RLS and grants provide defense in depth.** Enable RLS, revoke direct financial writes from `anon` and `authenticated`, and grant execution only to required RPC functions. Read policies require both the owning user and current active session.
7. **Errors are typed values.** Cross-layer failures use `Result<T, AppError>`. Only the shared HTTP handler maps domain codes to status codes and public messages.
8. **Balances are never cached.** Balance authorization and reads use the primary database. Only static assets and non-sensitive directory lookups may be cached.

## Modular Boundaries

```text
Browser / Server Component
        |
        v
Next.js Route Handler
HTTP parsing, Zod validation, auth/rate-limit wrapper
        |
        v
Service Layer
Use-case orchestration and Result mapping
        |
        v
Repository
The only TypeScript layer allowed to call Supabase/Postgres
        |
        v
PostgreSQL RPC
Transactions, locks, constraints, ledger and balances
```

Target structure:

```text
app/
  api/
    auth/{phone,otp,pin,device}/
    kyc/{upload-url,verify}/
    transfers/route.ts
    requests/route.ts
    requests/[id]/{accept,decline}/route.ts
    accounts/me/route.ts
    transactions/route.ts
    admin/reconcile/route.ts
  (auth)/{login,register}/
  (dashboard)/{page,requests,history,settings/security}/
components/
  ui/
  money/{balance-card,send-money-form,transaction-list,request-inbox}.tsx
  auth/
  kyc/
lib/
  auth/
  kyc/
  money/{money.service,money.repository,money.schema,money.types}.ts
  requests/{request.service,request.repository,request.schema,request.types}.ts
  accounts/{account.service,account.repository,account.schema,account.types}.ts
  shared/domain/money.ts
  shared/errors/app-error.ts
  shared/result.ts
  shared/http/handler.ts
  shared/db/{server,admin}.ts
supabase/migrations/
tests/{unit,integration,e2e}/
scripts/concurrency-demo.ts
docs/adr/
```

Every interactive UI element must have a stable `data-testid`. Client Components are limited to browser APIs, OCR, form interaction, and other genuinely client-side behavior.

## Identity, PIN and Device Security

### Phone and OTP

- Accept Bangladesh mobile numbers matching `01[3-9]XXXXXXXX` or `+8801[3-9]XXXXXXXX` and store only canonical `+8801XXXXXXXXX` values.
- Registration checks the canonical phone for uniqueness before issuing an OTP; the database uniqueness constraint remains the final race-condition defense.
- Virtual OTPs contain six digits, expire after two minutes, permit five verification attempts, and enforce a 60-second resend delay.
- `otp_challenges` stores only a code hash, purpose, expiry, attempt count, and consumption state.
- The demo SMS inbox is tied to a random per-challenge inbox token. Its temporary plaintext message becomes inaccessible after verification or expiry.

### PIN

- PINs contain exactly four ASCII digits.
- Reject repeated digits, ascending/descending sequences, `2580`, `0852`, and the phone number's last four digits.
- Never persist or log a raw PIN.
- Derive the strong internal Supabase phone/password credential with HMAC-SHA256 using server-only `APP_SECURITY_PEPPER` and a domain-separated `auth:` input.
- Store domain-separated HMAC fingerprints for the three most recently used PINs. A PIN update requires OTP verification and must not match any retained fingerprint.
- Five failed PIN attempts lock login for 15 minutes; success resets the counter.

### Single Active Device

- A trusted browser receives a random 32-byte token in an `HttpOnly`, `SameSite=Lax` cookie. Only its SHA-256 hash is stored.
- `security_profiles.active_device_id` identifies the trusted device and `active_session_id` identifies the only authorized Supabase session.
- Registration trusts the browser after PIN setup. A different browser must complete OTP before PIN login.
- After a successful new-device login, rotate the active device/session, revoke the previous device, and call Supabase sign-out with `scope: "others"`.
- RLS and every sensitive RPC compare the JWT `session_id` with `active_session_id`. Money RPCs also validate the server-supplied device token.
- The previous device fails immediately with `DEVICE_REPLACED`, even while its old access token has not expired.
- `proxy.ts` performs optimistic redirects only. Protected layouts, services, repositories, and RPC functions perform authoritative checks.

## KYC and Fake NID Registry

- KYC occurs after phone verification and PIN setup. The account remains `PENDING_KYC` and has no funded wallet until verification succeeds.
- Run Tesseract.js OCR in the browser with bundled Bengali and English language data. Resize and enhance the image before recognition and show progress.
- Extract NID number, date of birth, Bangla name, and English name from one front-side image. Users may correct OCR output before verification.
- Upload the confirmed image through a signed URL to the private `kyc-documents` bucket.
- Store only synthetic NID records and matching sample images. The registry verification endpoint never returns registry data.
- A match requires exact normalized NID number and date of birth plus at least one exact normalized name.
- Store a domain-separated HMAC NID fingerprint with a unique constraint. One NID can activate only one user, including under concurrent submissions.
- Allow three failed KYC verification attempts per hour per user.
- Successful KYC calls `activate_account_after_kyc`, which creates the account and funds it with BDT 100,000 through a balanced `INITIAL_FUNDING` transaction.

The original brief proposed funding from an `auth.users` trigger. BanglaPay intentionally delays account creation and funding until KYC succeeds so unverified identities cannot receive or move money.

## Financial Data Model

### Core Tables

- `profiles`: authenticated user, canonical phone, verified names, account status, timestamps.
- `security_profiles`: PIN failures, lock expiry, active device, active session.
- `trusted_devices`: token hash, browser metadata, trusted/revoked timestamps.
- `pin_history`: latest three domain-separated PIN fingerprints.
- `otp_challenges`: OTP purpose, hash, expiry, attempts, consumption state and rate-limit metadata.
- `fake_nid_records`: private synthetic identity registry.
- `kyc_verifications`: user, document path, normalized fields, unique NID fingerprint and status.
- `accounts`: user wallet or hidden system account, unique phone wallet number, cached `balance_poisha`, status and timestamps.
- `transactions`: idempotency key, type, status, source, destination, amount, note and timestamp.
- `ledger_entries`: immutable debit/credit rows with balance-after snapshots.
- `money_requests`: requester, payer, amount, status, settlement transaction, expiry and note.
- `rate_limits`: fixed-window counters keyed by hashed IP/user/action buckets.
- `security_events`: redacted audit events for OTP, PIN, KYC and device changes.

### Required Constraints and Indexes

- `accounts.user_id`, `accounts.wallet_number`, and verified `kyc_verifications.nid_fingerprint` are unique.
- `accounts.balance_poisha >= 0`; transaction and request amounts are greater than zero.
- `(source_account_id, idempotency_key)` is unique for transactions.
- `(account_id, id DESC)` supports cursor transaction history; never use offset pagination.
- `(payer_account_id, status, created_at DESC)` supports request inbox queries.
- Ledger directions are `DEBIT` or `CREDIT`; ledger rows cannot be updated or deleted by application roles.
- A hidden system funding account supplies the matching debit for each initial-funding credit, preserving double entry.

## PostgreSQL Functions

### `transfer_money`

`transfer_money(destination_wallet, amount_poisha, idempotency_key, note, transaction_type, device_token)` derives the source user/account from `auth.uid()` and returns the completed transaction plus `replayed`.

It must implement and explain all four concurrency defenses:

1. Return an existing transaction for the same source and idempotency key.
2. Lock source and destination accounts in UUID order to avoid A→B/B→A deadlocks.
3. Debit with `UPDATE ... WHERE balance_poisha >= amount RETURNING`, keeping validation inside the atomic write.
4. Catch a unique-index race and return the winning transaction as an idempotent replay.

It rejects `INVALID_AMOUNT`, `ACCOUNT_NOT_FOUND`, `ACCOUNT_INACTIVE`, `SELF_TRANSFER`, `INSUFFICIENT_FUNDS`, `UNVERIFIED_DEVICE`, and `INACTIVE_SESSION`.

### Other Functions

- `activate_account_after_kyc`: lock the KYC row, enforce one-time activation, create the user account, write a balanced initial-funding transaction, and credit exactly `10_000_000` poisha.
- `settle_request`: lock a pending request, validate the payer, call the same transfer implementation, and change status once.
- `decline_request`: atomically change only the designated payer's pending request to declined.
- `check_rate_limit`: increment fixed-window counters with `INSERT ... ON CONFLICT DO UPDATE`; transfers permit 10 attempts per minute per user.
- `expire_money_requests`: mark overdue pending requests expired; schedule it through `pg_cron` after local verification.
- `verify_ledger_integrity`: compare each cached balance with signed ledger totals and return per-account and aggregate status.

Every privileged function sets `search_path = ''`, schema-qualifies every object, validates the authenticated user/session/device explicitly, and grants execution only to the minimum role.

## API Contract

```text
POST /api/auth/phone/check
POST /api/auth/otp/send
POST /api/auth/otp/verify
POST /api/auth/pin/setup
POST /api/auth/pin/login
POST /api/auth/pin/change
POST /api/auth/signout
GET  /api/demo/sms
POST /api/kyc/upload-url
POST /api/kyc/verify

POST /api/transfers                 Idempotency-Key: <uuid>
POST /api/requests
POST /api/requests/[id]/accept      Idempotency-Key: <uuid>
POST /api/requests/[id]/decline
GET  /api/accounts/me
GET  /api/transactions?cursor=<opaque>
GET  /api/admin/reconcile           Authorization: Bearer <RECONCILE_ADMIN_TOKEN>
```

- Route handlers perform HTTP parsing and Zod validation, then call services.
- `withAuth`, `withActiveDevice`, and `withRateLimit` compose in the shared HTTP handler.
- Repositories are the only TypeScript modules that create Supabase clients or invoke RPC/database operations.
- Public errors never include raw PostgreSQL or Supabase messages.

```ts
type Result<T, E extends AppError = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

type AppError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};
```

## Scaling and Operational Decisions

- Use transaction-mode pooling for stateless Vercel traffic.
- Keep balances on the primary; move history reads to replicas only when replication lag is acceptable.
- Use keyset pagination now, monthly ledger partitioning when table size requires it, then hash-shard by account if a single PostgreSQL cluster becomes the limit.
- Do not introduce microservices: one transfer must remain one local ACID transaction. A distributed design would add sagas and reconciliation complexity without hackathon value.
- Reversals create compensating transactions and ledger entries. Existing financial history is never rewritten.

Four short ADRs under `docs/adr/` must document modular monolith, integer poisha, double-entry ledger, and PostgreSQL-owned money mutations.
