# BanglaPay Frozen Contracts (Phase 0)

Decisions frozen before implementation begins, per `docs/DEVELOPMENT-WORKFLOW.md`
Phase 0. Route paths, the PostgreSQL function contract, and the core error
codes for `transfer_money` are already frozen in `docs/ARCHITECTURE.md` and are
not repeated here except where extended.

## Environment Variable Names

Values are never committed; only names are frozen here. See `.env.example`.

| Name | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase publishable (anon) key |
| `SUPABASE_SECRET_KEY` | server-only | Elevated Supabase key for repositories/admin routes |
| `APP_SECURITY_PEPPER` | server-only | HMAC pepper for PIN credential derivation and NID fingerprinting |
| `VIRTUAL_SMS_MODE` | server-only | `"true"` routes OTP delivery through the virtual demo SMS inbox instead of a real provider |
| `RECONCILE_ADMIN_TOKEN` | server-only | Bearer token required by `GET /api/admin/reconcile` |

## API Error Codes

All errors use the `AppError` shape from `docs/ARCHITECTURE.md`
(`{ code, message, fieldErrors? }`). Codes below are additive to the
`transfer_money` set already frozen (`INVALID_AMOUNT`, `ACCOUNT_NOT_FOUND`,
`ACCOUNT_INACTIVE`, `SELF_TRANSFER`, `INSUFFICIENT_FUNDS`, `UNVERIFIED_DEVICE`,
`INACTIVE_SESSION`, `DEVICE_REPLACED`).

### Cross-cutting

- `VALIDATION_ERROR` — Zod DTO parsing failed; populates `fieldErrors`.
- `UNAUTHENTICATED` — no valid Supabase session.
- `RATE_LIMITED` — `check_rate_limit` rejected the request.
- `INTERNAL_ERROR` — unexpected failure; no internal details leaked.

### `POST /api/auth/phone/check`

- `PHONE_INVALID` — does not match `01[3-9]XXXXXXXX` / `+8801[3-9]XXXXXXXX`.
- `PHONE_ALREADY_REGISTERED`

### `POST /api/auth/otp/send`

- `OTP_RESEND_TOO_SOON` — inside the 60-second resend window.

### `POST /api/auth/otp/verify`

- `OTP_INVALID`
- `OTP_EXPIRED`
- `OTP_ALREADY_CONSUMED`
- `OTP_ATTEMPTS_EXCEEDED` — five failed attempts reached.

### `POST /api/auth/pin/setup`

- `PIN_WEAK` — repeated digits, ascending/descending run, `2580`/`0852`, or phone's last four digits.
- `PIN_MISMATCH` — confirmation PIN does not match.

### `POST /api/auth/pin/login`

- `PIN_INVALID`
- `PIN_LOCKED` — five failed attempts; 15-minute lock active.
- `DEVICE_UNTRUSTED` — unknown browser; client must fall back to OTP login.

### `POST /api/auth/pin/change`

- `OTP_REQUIRED` / `OTP_INVALID` (reuses OTP verify codes)
- `PIN_REUSED` — matches current or previous three PIN fingerprints.

### `POST /api/kyc/upload-url`

- `FILE_TYPE_INVALID` — not an accepted image type.
- `ACCOUNT_ALREADY_VERIFIED`

### `POST /api/kyc/verify`

- `KYC_FIELDS_INVALID` — normalized NID/DOB/name fail input validation.
- `KYC_NO_MATCH` — no fake-registry record matches.
- `NID_ALREADY_USED` — fingerprint already claimed by another user.
- `KYC_ATTEMPTS_EXCEEDED` — three failed attempts in the current hour.

### `POST /api/requests`

- `INVALID_AMOUNT`, `ACCOUNT_NOT_FOUND`, `SELF_TRANSFER` (shared with transfers)

### `POST /api/requests/[id]/accept`

- `REQUEST_NOT_FOUND`
- `REQUEST_NOT_PENDING`
- `REQUEST_UNAUTHORIZED` — caller is not the designated payer.
- `REQUEST_EXPIRED`
- Plus every `transfer_money` code, since acceptance settles through the same function.

### `POST /api/requests/[id]/decline`

- `REQUEST_NOT_FOUND`, `REQUEST_NOT_PENDING`, `REQUEST_UNAUTHORIZED`

### `GET /api/transactions`

- `CURSOR_INVALID` — opaque cursor failed to decode.

### `GET /api/admin/reconcile`

- `UNAUTHORIZED` — missing/incorrect `RECONCILE_ADMIN_TOKEN`.

## `data-testid` Naming Convention

Pattern: `{feature}-{element}[-{qualifier}]`, all kebab-case, stable across
re-renders. Never derive a test ID from an array index alone when a stable
domain ID (transaction ID, request ID, wallet number) is available.

Examples:

- `auth-phone-input`, `auth-otp-input`, `auth-pin-input`
- `kyc-nid-upload`, `kyc-field-nid-number`, `kyc-confirm-button`
- `dashboard-balance`, `dashboard-send-button`, `dashboard-request-button`
- `send-money-recipient`, `send-money-amount`, `send-money-submit`
- `request-inbox-item-{requestId}`, `request-accept-{requestId}`, `request-decline-{requestId}`
- `history-row-{transactionId}`, `receipt-amount`, `receipt-close`

## Phone and NID Fixtures

Synthetic values only; the registry never contains real identities.

| Fixture | Phone | NID (17-digit synthetic) | DOB | Bangla Name | English Name | Purpose |
|---|---|---|---|---|---|---|
| `FIXTURE_AHSAN` | `+8801711000001` | `19920115123456701` | 1992-01-15 | আহসান হাবিব | Ahsan Habib | Primary demo user |
| `FIXTURE_SAIFUL` | `+8801811000002` | `19930822123456702` | 1993-08-22 | সাইফুল ইসলাম | Md. Saiful Islam | Secondary demo user (receives transfers/requests) |
| `FIXTURE_DUPLICATE_PHONE` | `+8801711000001` | — | — | — | — | Reused to test duplicate-registration rejection |
| `FIXTURE_NID_MISMATCH_DOB` | `+8801911000099` | `19920115123456701` | 1999-01-01 (wrong) | আহসান হাবিব | Ahsan Habib | KYC DOB mismatch case |
| `FIXTURE_NID_MISMATCH_NAME` | `+8801911000098` | `19920115123456701` | 1992-01-15 | ভুল নাম | Wrong Name | KYC name mismatch case |
| `FIXTURE_NID_DUPLICATE_CLAIM` | `+8801911000097` | `19920115123456701` (reused) | 1992-01-15 | আহসান হাবিব | Ahsan Habib | Second user attempting the same NID fingerprint |

Seed `FIXTURE_AHSAN` and `FIXTURE_SAIFUL` as rows in `fake_nid_records`
during Phase 1 seeding. Sample front-of-NID images for OCR testing are
added under `tests/fixtures/nid/` in Phase 5 and are out of scope for
Phase 0.
