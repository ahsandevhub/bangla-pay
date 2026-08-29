# BanglaPay Development Workflow Checklist

This checklist targets the six-hour event: approximately four hours of feature construction followed by two hours of integration, testing, deployment, and demo preparation.

## Team Contract

### Ahsan Habib — Application Owner

- [ ] Own migrations, SQL functions, application layers, API routes, UI, environment configuration, deployment and documentation.
- [ ] Work only on short-lived `feat/*`, `fix/*`, or `chore/*` branches.
- [ ] Push at every phase boundary so Saiful can test current behavior.
- [ ] Provide stable test IDs, synthetic fixtures, error codes and reset commands.
- [ ] Fix defects by severity: financial correctness, authorization, blocked user flow, presentation.

### Md. Saiful Islam — Test Owner

- [ ] Own files under `tests/`, exploratory test notes and defect reports.
- [ ] Start test design before implementation is complete.
- [ ] Pull each feature checkpoint, run the narrowest relevant suite, then run regression.
- [ ] Report exact reproduction steps, expected/actual behavior, logs and severity.
- [ ] Do not modify migrations or production modules without coordinating with Ahsan.

## Phase 0 — Freeze Decisions and Prepare

**Target: 9:00–9:15**

### Ahsan

- [ ] Pull `main`; confirm a clean working tree and local Supabase status.
- [ ] Read `AGENTS.md`, `docs/ARCHITECTURE.md`, and relevant installed Next.js 16 documentation.
- [ ] Create `feat/auth-kyc-core`.
- [ ] Add only required dependencies: Zod and Tesseract.js.
- [ ] Define environment names without committing values: Supabase secret key, application pepper, virtual SMS switch, and reconciliation token.
- [ ] Freeze API error codes, test IDs, phone/NID fixture values and route contracts.

### Saiful

- [ ] Create `test/auth-kyc-core` from the same `main` commit.
- [ ] Convert the acceptance criteria into unit, integration, E2E and manual test cases.
- [ ] Confirm Playwright Chromium and the local Supabase stack run.
- [ ] Record baseline results for lint, unit tests and production build.

### Exit Gate

- [ ] Both teammates agree on fixture phones, OTP access, sample NID images, error codes and branch ownership.
- [ ] Commit: `chore: define BanglaPay architecture and contracts`.

## Phase 1 — Database Foundation First

**Target: 9:15–10:00**

### Ahsan

- [ ] Create enum/check definitions and identity, device, OTP, KYC, account, transaction, ledger, request, rate-limit and audit tables.
- [ ] Add all uniqueness, foreign-key, check and append-only protections.
- [ ] Seed the hidden system funding account and synthetic NID fixtures.
- [ ] Enable RLS and define active-user plus active-session read policies.
- [ ] Revoke direct financial writes from `anon` and `authenticated`.
- [ ] Implement active-device/session assertion helpers.
- [ ] Implement `activate_account_after_kyc`, `transfer_money`, request settlement/decline, rate limiting and ledger reconciliation.
- [ ] Comment why each of the four transfer concurrency defenses exists.
- [ ] Reset local Supabase and regenerate database types.

### Saiful

- [ ] Add integration helpers that create UUID-suffixed users/accounts and clean them in `afterAll`.
- [ ] Test migration reset from an empty database.
- [ ] Test uniqueness and check constraints directly against real PostgreSQL.
- [ ] Confirm authenticated roles cannot insert/update/delete accounts, transactions or ledger entries.

### Exit Gate

- [ ] `npm run db:reset` succeeds from a clean state.
- [ ] Initial funding creates one transaction and balanced ledger entries.
- [ ] Reconciliation reports `ok=true` for seeded accounts.
- [ ] Commit: `feat: add secure wallet schema and money functions`.

## Phase 2 — Concurrency Integration Tests Before UI

**Target: 10:00–10:30**

### Saiful

- [ ] Happy path moves money and writes exactly one debit and one credit.
- [ ] Overdraft fails without changing either balance.
- [ ] Reusing an idempotency key returns the same transaction with one debit.
- [ ] Twenty concurrent ৳500 attempts from a ৳500 balance yield exactly one success and a zero final balance.
- [ ] Thirty bidirectional concurrent transfers complete without deadlock errors.
- [ ] Ledger reconciliation remains true after every race test.
- [ ] Tests use real local PostgreSQL and no database mocks.

### Ahsan

- [ ] Fix SQL behavior rather than compensating in TypeScript.
- [ ] Verify raised SQL codes map deterministically to domain errors.
- [ ] Keep all race-test fixtures isolated and repeatable.

### Exit Gate

- [ ] Financial integration suite passes twice consecutively.
- [ ] Commit: `test: verify transfer concurrency and ledger integrity`.

## Phase 3 — Shared Domain and Application Layers

**Target: 10:30–11:00**

### Ahsan

- [ ] Implement the Money value object using `bigint` only.
- [ ] Parse decimal strings with at most two decimal places; reject exponent notation, zero and negatives.
- [ ] Implement `Result<T, AppError>` and central error-to-HTTP mapping.
- [ ] Implement Zod DTO schemas at route boundaries.
- [ ] Add repository interfaces and concrete Supabase repositories.
- [ ] Add service orchestration without database calls outside repositories.
- [ ] Add shared auth, active-device and rate-limit wrappers.

### Saiful

- [ ] Unit-test Money parsing, formatting and no-float-drift cases.
- [ ] Unit-test every Zod schema and error/status mapping.
- [ ] Unit-test services against small hand-written fake repository implementations.
- [ ] Verify routes/components contain no direct database calls through static searches.

### Exit Gate

- [ ] Unit tests pass without network, filesystem or database access.
- [ ] Routes can consume services without knowing Supabase details.
- [ ] Commit: `feat: add modular money application layers`.

## Phase 4 — Phone, OTP, PIN and Single Device

**Target: 11:00–11:40**

### Ahsan

- [ ] Implement Bangladesh phone normalization and duplicate detection.
- [ ] Implement virtual OTP send, inbox, verification, expiry, attempts and resend throttling.
- [ ] Implement four-digit PIN validation, HMAC credential derivation and PIN history.
- [ ] Implement registration device trust and Supabase cookie session creation.
- [ ] Implement trusted-device phone/PIN login.
- [ ] Implement new-device OTP → PIN login, old-device revocation and active-session rotation.
- [ ] Implement OTP-protected PIN change and last-three-PIN rejection.
- [ ] Add audit events without phone, OTP, PIN, token or secret leakage.

### Saiful

- [ ] Test duplicate phone, invalid Bangladesh phone and normalized equivalents.
- [ ] Test wrong, expired, consumed and over-attempted OTPs.
- [ ] Test weak PINs, PIN lockout and successful counter reset.
- [ ] Use two Playwright browser contexts to prove the old device is blocked immediately.
- [ ] Test current and previous-three PIN reuse prevention.

### Exit Gate

- [ ] Registration reaches `PENDING_KYC` with one trusted device.
- [ ] Unknown devices cannot reach PIN login without OTP.
- [ ] Replaced devices receive `DEVICE_REPLACED` on protected reads and writes.
- [ ] Commit: `feat: add phone PIN and trusted device authentication`.

## Phase 5 — OCR and KYC Activation

**Target: 11:40–12:20**

### Ahsan

- [ ] Bundle Bengali and English OCR language assets to avoid hackathon network dependency.
- [ ] Implement image preview, preprocessing, progress and field extraction.
- [ ] Let the user correct extracted values before verification.
- [ ] Generate user-scoped signed upload URLs for the private KYC bucket.
- [ ] Implement fake registry verification without returning registry records.
- [ ] Enforce one verified user per NID fingerprint under concurrency.
- [ ] Call account activation and balanced ৳100,000 funding only after successful KYC.
- [ ] Redirect verified users to the dashboard and incomplete users back to KYC.

### Saiful

- [ ] Test supplied fixture images and manually corrected OCR values.
- [ ] Test wrong number, birth date, name and unsupported image inputs.
- [ ] Test duplicate NID attempts from two users, including concurrent submissions.
- [ ] Confirm failed KYC creates no account or initial funding transaction.
- [ ] Confirm private images cannot be listed or read by another user.

### Exit Gate

- [ ] One complete phone → OTP → PIN → OCR → KYC → funded-wallet flow succeeds.
- [ ] Reconciliation remains true immediately after account activation.
- [ ] Commit: `feat: add OCR KYC and verified wallet activation`.

## Phase 6 — Transfers, Requests and Dashboard

**Target: 12:20–1:10**

### Ahsan

- [ ] Implement account summary and uncached balance endpoint.
- [ ] Implement transfer endpoint requiring a UUID `Idempotency-Key`.
- [ ] Implement request create, accept and decline endpoints.
- [ ] Implement cursor transaction history; never use offset pagination.
- [ ] Build Bangla-first bilingual dashboard, balance, send, request, inbox, history and receipt UI.
- [ ] Add confirmation dialogs and disable duplicate form submission while pending.
- [ ] Add stable `data-testid` attributes to every interactive control and result.
- [ ] Ensure all displayed money is formatted from `bigint` at the UI boundary.

### Saiful

- [ ] Test send success, self-transfer, invalid amount, unknown recipient and insufficient balance.
- [ ] Test browser retries/double-clicks using the same idempotency key.
- [ ] Test request create, unauthorized response, decline, accept once and expired request behavior.
- [ ] Verify dashboard, receipt and history values against database state.
- [ ] Verify mobile viewport layout and Bangla/English labels.

### Exit Gate

- [ ] Both users see correct balances and history after transfer and request settlement.
- [ ] No route or component performs direct financial writes.
- [ ] Commit: `feat: add BanglaPay money movement experience`.

## Phase 7 — Full Regression and Judge Demo

**Target: 1:10–2:10**

### Saiful

- [ ] Run lint, unit, integration, Playwright and production build checks.
- [ ] Keep the required single Playwright money smoke spec: login → send ৳2,500 → balance change → history row.
- [ ] Run exploratory registration, KYC, device replacement, PIN change, transfer and request tests.
- [ ] Re-run all P0/P1 defect reproductions after fixes.

### Ahsan

- [ ] Implement `scripts/concurrency-demo.ts` for the 20-way race and reconciliation output.
- [ ] Add secure reconciliation endpoint for demo/admin use.
- [ ] Add four concise ADRs and README architecture/scaling sections.
- [ ] Remove debug output and verify secrets never enter client bundles or logs.
- [ ] Freeze features; fix only correctness, security, blocked flow and severe presentation defects.

### Exit Gate

- [ ] `npm run lint` passes.
- [ ] `npm run test:run` passes.
- [ ] Integration suite passes against local Supabase.
- [ ] `npm run test:e2e` passes.
- [ ] `npm run build` passes.
- [ ] Concurrency demo prints one success, nineteen safe failures, zero negative balance and reconciliation `ok=true`.

## Phase 8 — Hosted Deployment and Rehearsal

**Target: 2:10–3:00**

### Ahsan

- [ ] Link the hosted Supabase project and apply reviewed migrations.
- [ ] Regenerate hosted database types and confirm no unintended schema drift.
- [ ] Configure Vercel Preview and Production environment variables.
- [ ] Deploy and run hosted smoke checks for auth, KYC, balance, transfer and history.
- [ ] Tag the final deploy commit mentally as the rollback point; do not make unreviewed schema changes afterward.

### Saiful

- [ ] Execute the production smoke test from a clean browser profile.
- [ ] Test the replacement-device flow from a second browser.
- [ ] Confirm demo NID fixtures and virtual SMS work in production.
- [ ] Record the final known-good URLs, users, balances and expected demo outputs.

### Demo Sequence

- [ ] Register Ahsan with virtual OTP, secure PIN and OCR KYC.
- [ ] Show automatic ৳100,000 funding and its balanced ledger transaction.
- [ ] Send Saiful ৳2,500 and show both receipts/balances.
- [ ] Create and accept a ৳1,200 request.
- [ ] Replace a trusted device and show the old browser being blocked.
- [ ] Run the live 20-way concurrency race.
- [ ] Show reconciliation `ok=true` and explain the four concurrency defenses.
- [ ] Explain modular monolith scaling without claiming production banking readiness.

## Defect Severity and Handoff

- **P0:** money created/lost, negative balance, duplicate charge, ledger mismatch, unauthorized transfer, NID reuse, or bypassed device control. Stop all other work.
- **P1:** registration/KYC/login/send/request flow blocked. Fix before presentation work.
- **P2:** wrong validation, history inconsistency, broken mobile layout, unclear error. Fix after core regression.
- **P3:** cosmetic polish. Fix only if the release is already green.

Each defect report contains branch/commit, environment, fixture user, exact steps, expected result, actual result, screenshot/log, and severity.

## Git Checkpoint Routine

- [ ] Pull `main` and create one focused branch.
- [ ] Claim files and expected interface changes in team chat.
- [ ] Commit small logical changes using `feat:`, `fix:`, `test:`, `docs:`, or `chore:`.
- [ ] Push frequently and open a PR at each phase gate.
- [ ] The other teammate performs a quick diff and smoke review.
- [ ] Merge only when the phase exit gate passes.
- [ ] Both teammates pull `main` immediately after merge.
- [ ] Never force-push `main`, rewrite shared history, or resolve financial logic conflicts alone.

## Final Release Checklist

- [ ] All migrations are committed and reproducible with `npm run db:reset`.
- [ ] Generated types match the deployed schema.
- [ ] No raw PIN, OTP, NID, device token, service key or application pepper appears in logs or Git.
- [ ] RLS is enabled and financial DML grants are revoked.
- [ ] Balance endpoints are uncached and authenticated routes are not statically cached.
- [ ] Unit, integration, E2E, lint and build checks are green.
- [ ] Reconciliation passes locally and on the hosted project.
- [ ] Vercel production smoke test passes from clean browser sessions.
- [ ] README, ADRs, architecture and workflow documentation match the implemented behavior.
- [ ] `main` is clean, pushed and deployable before code freeze.
