# BanglaPay Post-v1.0 Roadmap

This is forward planning only. **Do not start any work in this document
until the Phase 8 exit gate in `docs/DEVELOPMENT-WORKFLOW.md` passes and
v1.0 ships** (`main` clean, deployed, hosted smoke test green). As of this
writing the project is mid-**Phase 6**. This doc exists so the next release
has a ready plan instead of a blank page, and so no scope creeps into the
current phases while `docs/DEVELOPMENT-WORKFLOW.md`'s exit gates are still
open.

Every phase below inherits the non-negotiable rules in
`docs/ARCHITECTURE.md`'s Architecture Contract (integer poisha, PostgreSQL
owns money correctness, append-only ledger, modular monolith boundaries,
`Result<T, AppError>`, RLS + grants, no cached balances) and the naming
conventions in `docs/CONTRACTS.md` (error codes, `data-testid` pattern).
New error codes and test IDs proposed here are **additive drafts** — freeze
them the same way Phase 0 did, at the start of whichever release picks this
up.

## Backlog Source

Captured from a handwritten planning note (2026-08-29), confirmed in scope
in full:

1. Notifications (SMS + Browser)
2. Payment, Pay Bill and Mobile Recharge entry points — **UI only, not
   functional** in this pass
3. Limits and Charges

## Sequencing

**Payment/Bill/Recharge UI → Limits & Charges → Notifications.**

- Payment/Bill/Recharge is explicitly UI-only and touches no money
  functions, so it's the cheapest, lowest-risk slice — ship it first as a
  visible release headline with near-zero correctness risk.
- Limits & Charges changes `transfer_money` itself (the most sensitive
  function in the system) and must land, get concurrency-tested, and
  stabilize *before* Notifications starts depending on its events (e.g. a
  "limit exceeded" notification needs the limit check to exist first).
- Notifications is a cross-cutting layer over transfer/request/device/KYC
  events that are already stable by v1.0, plus whatever Limits & Charges
  adds. Doing it last means it can notify on the full event set in one
  pass instead of being revisited.

Each phase below is written in the same Ahsan/Saiful task-split format as
`docs/DEVELOPMENT-WORKFLOW.md` for consistency, but — per
`user-role-solo-hackathon` — both roles are currently the same person.
Keep the split anyway: it separates "build it" from "prove it," which
matters more for Limits & Charges than for the hackathon itself.

---

## Phase 9 — Payment, Pay Bill and Mobile Recharge (UI Shell)

**Depends on:** v1.0 shipped. No backend/data-model dependency.

### Goal

Give the dashboard visible "Payment," "Pay Bill," and "Mobile Recharge"
entry points so the product surface area looks complete, without moving
any real money. Matches the note's own scope: "only UI options, not
functional."

### Non-goals

- No new PostgreSQL function, no new `transactions`/`ledger_entries` rows.
- No biller or telecom operator integration of any kind.
- No local/optimistic balance mutation to *simulate* success — the
  Architecture Contract's "TypeScript must never read a balance, decide
  whether it is sufficient, and then write a new balance" applies even to
  a fake flow, because a fake success state is easy to mistake for a real
  one later. Submitting shows a "Coming soon" state; no state changes.

### Ahsan

- [ ] Add dashboard entry points: `components/money/pay-bill-form.tsx`,
      `components/money/mobile-recharge-form.tsx`, with static biller list
      (electricity, gas, water, internet) and operator list (GP, Robi,
      Banglalink, Teletalk).
- [ ] Reuse the existing Money formatting boundary for amount display only
      (no bigint arithmetic needed since nothing is submitted).
- [ ] Submitting either form shows a disabled/"Coming soon" confirmation —
      no `fetch` call, no route handler, no idempotency key.
- [ ] Add `data-testid`s per the `docs/CONTRACTS.md` `{feature}-{element}`
      convention: `pay-bill-biller-select`, `pay-bill-amount`,
      `pay-bill-submit`, `recharge-operator-select`,
      `recharge-number-input`, `recharge-amount`, `recharge-submit`.
- [ ] Bangla-first bilingual labels, matching the rest of the dashboard.

### Saiful

- [ ] Verify no network request fires on submit (network tab / route
      handler assertion).
- [ ] Verify mobile viewport layout and Bangla/English labels.
- [ ] Confirm balance is unchanged before/after interacting with both
      forms.

### Exit Gate

- [ ] `npm run lint`, `npm run test:run`, `npm run build` green.
- [ ] `npm run test:e2e` covers both forms rendering and the "coming soon"
      state, asserting zero balance/history change.
- [ ] Commit: `feat: add payment, bill pay and recharge UI shell`.

---

## Phase 10 — Limits and Charges

**Depends on:** Phase 9 not required as a hard dependency, but land it
first per sequencing above. Touches `transfer_money`.

### Goal

Enforce per-transaction and rolling daily send limits, and apply a
transfer fee/charge, without breaking any of the four concurrency defenses
`transfer_money` already implements.

### Architecture touchpoints

- Limit checks and charge deduction **must** happen inside the same
  `SECURITY DEFINER` PL/pgSQL transaction as the debit/credit — checking a
  limit in TypeScript, then calling `transfer_money` separately, reopens
  exactly the check-then-write race Phase 1–2 already closed once.
- A charge is itself money movement: it needs its own balanced ledger
  entries (debit sender, credit a system "fee revenue" account), following
  the same double-entry pattern `activate_account_after_kyc` uses for the
  hidden funding account — never a silent adjustment to
  `balance_poisha`.
- Daily/monthly usage tracking should reuse the fixed-window counter shape
  `check_rate_limit` already established (`INSERT ... ON CONFLICT DO
  UPDATE`), rather than inventing a second pattern.

### Data model (draft)

- `account_limits`: per-account (or global-default) `per_txn_max_poisha`,
  `daily_max_poisha`.
- `limit_usage`: `(account_id, window_start)` cumulative sent-today
  counter, mirroring `rate_limits`' shape.
- `fee_rules`: simple fixed + percentage fee definition (flat hackathon-
  scale config is enough; no need for a rules engine).
- Extend `transactions` (or add a child row) to record the charge amount
  separately from the principal, so receipts/history can show both.

### Ahsan

- [ ] Add migrations for the tables above, RLS'd read-only to the owning
      user, no direct writes from `anon`/`authenticated`.
- [ ] Extend `transfer_money` to check per-transaction and daily limits
      and compute+apply the charge atomically, before the existing debit
      write.
- [ ] New error codes (additive to `docs/CONTRACTS.md`):
      `LIMIT_EXCEEDED_PER_TRANSACTION`, `LIMIT_EXCEEDED_DAILY`.
- [ ] Update `verify_ledger_integrity` / reconciliation to account for fee
      ledger entries.
- [ ] Surface remaining daily allowance and the fee preview on the send-
      money form before confirm; show the charge line item on the receipt.

### Saiful

- [ ] Reuse the Phase 2 concurrency pattern: N concurrent transfers against
      a daily limit must yield exactly the allowed count of successes.
- [ ] Test per-transaction limit boundary (exact max succeeds, max+1
      fails) and daily limit reset at the window boundary.
- [ ] Confirm reconciliation stays `ok=true` with fee entries included.
- [ ] Confirm existing Phase 2 and Phase 6 transfer/request tests still
      pass unmodified (no regression in the base transfer path).

### Exit Gate

- [ ] Concurrency integration suite (existing + new limit tests) passes
      twice consecutively.
- [ ] Reconciliation `ok=true` including all fee-revenue entries.
- [ ] Commit: `feat: add transfer limits and charges`.

---

## Phase 11 — Notifications (SMS + Browser)

**Depends on:** Phase 10 landed, so limit-exceeded events exist to notify
on. Otherwise depends only on the transfer/request/device/KYC flows that
are already stable by v1.0.

### Goal

Notify users of key account events through the existing virtual SMS
channel and through browser notifications, plus an in-app notification
list.

### Architecture touchpoints

- Reuse the existing virtual SMS demo inbox / `VIRTUAL_SMS_MODE` channel
  (`/api/demo/sms`) rather than adding a second delivery mechanism — the
  system is an intentionally closed simulation per `docs/ARCHITECTURE.md`'s
  opening statement.
- Notification rows are **not** financial data — no ledger/`bigint`
  involvement — so they can be written from the service layer after a
  successful operation rather than inside the PL/pgSQL function itself.
  Treat this as fire-and-forget best-effort delivery: a notification that
  fails to write must never roll back or block the underlying
  transfer/request/KYC/device operation that triggered it.
- Notification bodies follow the same redaction discipline as
  `security_events`: no raw PIN, OTP, NID, device token, or full account
  number.

### Data model (draft)

- `notifications`: `user_id`, `type`, `title`, `body`, `related_entity_id`,
  `read_at`, `created_at`. RLS: owner-only read, no client write access.

### Trigger events (draft)

- Money received / money sent confirmation.
- Request created / accepted / declined / expired.
- New-device login (already an audited security event — mirror it here).
- PIN changed, KYC status change.
- `LIMIT_EXCEEDED_*` from Phase 10, if the user hits it repeatedly.

### Ahsan

- [ ] Migration for `notifications` with RLS.
- [ ] `GET /api/notifications`, `POST /api/notifications/[id]/read`
      following the existing route handler → service → repository shape.
- [ ] Emit notification rows from existing service-layer call sites after
      each triggering event succeeds (no changes to PL/pgSQL functions).
- [ ] Browser notifications via the Web Notifications API with an explicit
      permission prompt; in-app bell/dropdown as the fallback when
      permission is denied or unsupported.
- [ ] `data-testid`s: `notification-bell`, `notification-item-{id}`,
      `notification-mark-read-{id}`.

### Saiful

- [ ] Verify a notification row is created after each triggering event and
      is visible only to its owning user.
- [ ] Verify no notification body contains PIN/OTP/NID/token/full account
      number.
- [ ] Verify a failed notification write never blocks or rolls back the
      underlying operation (e.g. simulate a notification insert failure
      and confirm the transfer still succeeds).
- [ ] Verify browser-notification-denied fallback still shows the in-app
      list.

### Exit Gate

- [ ] Every trigger event above produces a visible notification in
      integration/e2e tests.
- [ ] No PII/secret leakage in notification content (grep-based check,
      mirroring the Phase 7 secret-leak sweep).
- [ ] Commit: `feat: add SMS and browser notifications`.

---

## Open Questions to Resolve Before Starting

- Whether `fee_rules` needs to vary by transaction type (transfer vs. the
  future functional Pay Bill/Recharge) or can stay a single flat rule for
  v1.1.
- Whether browser notifications need a service worker (true push, works
  when the tab is closed) or an in-tab-only `Notification` API is
  sufficient for this project's scope.
- Whether Payment/Pay Bill/Recharge becoming *functional* is itself a
  future phase (Phase 12+) once Limits & Charges exists to rate/fee them —
  not scoped here since the note marked this pass UI-only.
