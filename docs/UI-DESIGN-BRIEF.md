# BanglaPay Claude Design Brief

Use this document as the source of truth when designing BanglaPay (বাংলা-পে) with Claude Design. It defines the intended experience and visual system; `docs/ARCHITECTURE.md` remains authoritative for application behavior and security.

## Claude Design Master Prompt

Copy the following prompt into Claude Design:

```text
Design and implement the responsive UI for BanglaPay (বাংলা-পে), a simulated Bangladesh mobile financial service created for a hackathon.

Use the existing repository and stack exactly as configured:
- Next.js 16 App Router with TypeScript and root-level app/ directory; never create src/
- React 19, Tailwind CSS v4, shadcn/ui v4 with the Base UI preset
- Existing components/ui primitives and Lucide icons
- Server Components by default; use Client Components only for interaction, browser OCR, and browser APIs

This is a UI task. Do not implement or alter database migrations, Supabase functions, authentication rules, API contracts, or financial logic. Build reusable presentational components and route screens around typed demo data and clearly marked integration boundaries. Do not place direct Supabase calls in components.

Brand:
- Product name: বাংলা-পে, with BanglaPay as the English companion name
- Bangla-first bilingual labels: primary Bangla label, concise English helper where useful
- Original visual identity; do not imitate bKash, Nagad, Rocket, or another MFS
- Trustworthy, warm, modern, accessible, and appropriate for financial actions
- Primary emerald #0B6B4F, deep emerald #064E3B, warm accent #E9A23B
- Canvas #F5F8F6, surface #FFFFFF, primary text #17241F, muted text #64726C
- Success #16865C, warning #B7791F, danger #C83A3A, border #DDE6E1
- Use Noto Sans Bengali for Bangla and Geist for English/numbers
- Use tabular numerals for balances, amounts, OTPs, PIN indicators, and references
- Medium corner radius, subtle borders, restrained shadows, generous spacing; no glassmorphism, neon, decorative gradients, excessive motion, or crypto-style visuals

Responsive shell:
- Mobile-first at 360–430px, then tablet and desktop
- Auth/KYC pages use a centered focused card with a supportive illustration/brand panel on wide screens
- Authenticated mobile pages use a bottom navigation: Home, Requests, Activity, Security
- Authenticated desktop pages use a compact left sidebar and a max-width content area
- Keep the balance and primary actions above the fold on common phones

Financial interaction rules:
- Never use optimistic balances
- Always show recipient identity, amount, note, and resulting action in a review step before confirmation
- Disable duplicate submissions and show a clear processing state
- Every successful money action ends with a receipt containing status, amount, counterparty, reference, date/time, and action buttons
- Errors stay near the relevant field and preserve safe user input
- Do not expose internal UUIDs, SQL errors, raw NID data, PINs, OTPs, or device tokens

Create the complete screen set described in docs/UI-DESIGN-BRIEF.md. Include loading, empty, validation, success, locked, expired, offline, and replaced-device states. Add stable data-testid attributes to every interactive element and important result. Use realistic synthetic BanglaPay data only.
```

## Experience Principles

1. **Trust before speed.** Important actions use clear review and receipt steps instead of surprising one-tap completion.
2. **Bangla first, never Bangla only.** Primary task labels are Bangla; concise English support helps judges and less-confident readers.
3. **Money is visually dominant.** Balances and transaction amounts use large tabular numerals with the ৳ symbol and exactly two decimals.
4. **One primary action per state.** Every onboarding screen has one obvious next step and a visible back or cancel path where safe.
5. **Progress is explicit.** Registration shows Phone → OTP → PIN → KYC → Complete without making security feel complicated.
6. **Errors teach recovery.** Explain what happened and what the user can do next without revealing sensitive system details.
7. **Desktop supports demonstration; mobile defines the product.** Judges should be able to follow the flow on a projected desktop while the interface still feels like an MFS wallet.

## Design System

### Typography

- Bangla headings and labels: `Noto Sans Bengali`, 600–700 weight.
- English and numeric content: `Geist`, 400–700 weight.
- Balance: 32–40px mobile and 40–48px desktop, tabular numerals.
- Page heading: 24–30px; card heading: 18–20px; body: 14–16px.
- Never use uppercase for Bangla. Use sentence case for English.

### Components

- Primary buttons use solid emerald; destructive actions use outlined danger styling until final confirmation.
- Inputs are at least 48px high with labels above them; placeholders never replace labels.
- Use segmented OTP inputs and masked four-dot PIN inputs with numeric keyboard hints.
- Cards use a white surface, 1px neutral border, 12–16px radius, and little or no shadow.
- Status chips: pending amber, completed green, declined/failed red, expired neutral.
- Use a bottom sheet for mobile review and a dialog for desktop review.
- Use skeletons for page data, inline spinners for button submissions, and progress for OCR.
- Toasts confirm secondary events; critical success and failure states receive dedicated content.

### Accessibility

- Maintain WCAG AA color contrast and visible keyboard focus.
- Minimum touch target is 44×44px.
- Announce validation, OTP countdown, OCR progress, transaction status, and balance changes through appropriate live regions.
- Do not communicate status by color alone; pair color with icon and text.
- PIN and OTP entry supports paste, backspace navigation, and screen-reader labels without reading secret values aloud.
- Respect reduced-motion settings and avoid automatic carousel or looping motion.

## Navigation and Information Architecture

### Public Routes

- `/` — concise brand introduction with Register and Login actions
- `/register` — phone, OTP, PIN, KYC and completion flow
- `/login` — phone/device check, optional OTP, then PIN

### Authenticated Routes

- `/dashboard` — balance, quick actions, pending requests and recent activity
- `/requests` — incoming and outgoing money requests
- `/history` — complete cursor-paginated transaction activity
- `/transactions/[id]` — receipt/detail page
- `/settings/security` — trusted device, PIN change and sign-out controls

The send-money and request-money flows open from dashboard actions as full-screen mobile sheets and centered desktop dialogs. They may use dedicated routes internally for refresh-safe state.

## Screen Specifications

### 1. Landing

**Purpose:** Explain the simulated product quickly and route users to registration or login.

- Brand mark, `বাংলা-পে` and `BanglaPay`.
- Headline: `নিরাপদ ডিজিটাল লেনদেন` with `Secure simulated money movement` as support.
- Three trust points: verified identity, protected device, reliable transaction history.
- Primary `অ্যাকাউন্ট খুলুন / Register`; secondary `লগ ইন / Login`.
- Small educational disclaimer: simulated funds, no real money.
- Desktop may show a clean phone-shaped dashboard preview; mobile should avoid pushing actions below the fold.

### 2. Registration — Phone

**Purpose:** Start a Bangladesh phone-number account.

- Step indicator: `১ ফোন` active, then `২ OTP`, `৩ PIN`, `৪ KYC`.
- Heading: `মোবাইল নম্বর দিন`; helper explains `01XXXXXXXXX` format.
- Fixed `+880` prefix presentation or automatic normalization.
- Primary `ওটিপি পাঠান / Send OTP`.
- States: invalid number, already registered with login link, rate limited, offline, submitting.
- Test IDs: `register-phone`, `send-registration-otp`, `phone-error`.

### 3. Registration — Virtual OTP

**Purpose:** Verify phone ownership while making the hackathon simulation transparent.

- Masked destination number and change-number action.
- Six segmented OTP cells, two-minute countdown, resend disabled for 60 seconds.
- Primary `যাচাই করুন / Verify`.
- Collapsible `Virtual SMS` demo panel showing the simulated message only for the current challenge.
- States: wrong code with attempts remaining, expired code, consumed code, resend success, attempt lock.
- Test IDs: `registration-otp`, `verify-registration-otp`, `resend-otp`, `virtual-sms-panel`.

### 4. Registration — PIN Setup

**Purpose:** Set a secure four-digit PIN without overwhelming users.

- Four masked PIN slots, confirm-PIN step, numeric keypad on mobile.
- Live checklist: exactly four digits, not repeated/sequential, not phone's final four digits, both entries match.
- Never display the raw PIN after entry.
- Primary `PIN সেট করুন / Set PIN`.
- Show a calm explanation that PIN is required for login and sensitive changes.
- Test IDs: `pin-input`, `confirm-pin-input`, `set-pin`, `pin-rule-*`.

### 5. KYC Introduction

**Purpose:** Explain why identity verification is required before funding the wallet.

- Heading: `পরিচয় যাচাই করুন`.
- Three-step visual: upload front of NID → review extracted data → verify.
- Privacy card explaining private storage and synthetic hackathon registry.
- Primary `NID স্ক্যান করুন`; secondary upload-from-device option.
- Account status chip: `KYC বাকি / Pending KYC`.

### 6. NID Capture and OCR

**Purpose:** Capture a usable front-side NID image and communicate OCR progress.

- Camera/upload drop zone with front-side framing guide.
- Preview controls: replace, rotate, continue.
- Guidance for light, focus, glare and full-card visibility.
- OCR state shows progress percentage and current task without fake instant completion.
- Failure state preserves the image and offers retry or manual entry.
- Test IDs: `nid-file-input`, `nid-preview`, `start-ocr`, `ocr-progress`, `replace-nid`.

### 7. OCR Review and NID Verification

**Purpose:** Let the user correct OCR mistakes before submitting to the fake registry.

- Editable fields: NID number, date of birth, Bangla name, English name.
- Show the NID thumbnail beside or above fields without exposing it elsewhere.
- Mark low-confidence fields with a warning, not an automatic rejection.
- Consent checkbox confirming the information is correct.
- Primary `তথ্য যাচাই করুন / Verify information`.
- States: mismatch, NID already used, rate limited, private upload failure, processing.
- Test IDs: `nid-number`, `nid-dob`, `nid-name-bn`, `nid-name-en`, `verify-nid`.

### 8. KYC Success and Wallet Activation

**Purpose:** Celebrate successful activation while preserving financial clarity.

- Success icon and `অ্যাকাউন্ট প্রস্তুত`.
- Opening balance card: `৳100,000.00` with `Simulated opening balance`.
- Explain that funding was recorded as a transaction and can be viewed in history.
- Primary `ড্যাশবোর্ডে যান / Go to dashboard`.
- Avoid confetti or exaggerated banking claims.

### 9. Login and Device Verification

**Purpose:** Adapt the flow based on whether the browser is trusted.

- Phone entry first.
- Trusted device: transition to four-digit PIN with masked number and `অন্য নম্বর` action.
- New device: explain `নতুন ডিভাইস শনাক্ত হয়েছে`, require OTP, then request PIN.
- Replaced-device state: dedicated blocked screen explaining another device became active and offering `এই ডিভাইস যাচাই করুন`.
- PIN lock state shows remaining lock duration and recovery guidance.
- Test IDs: `login-phone`, `continue-login`, `login-otp`, `login-pin`, `device-replaced`.

### 10. Dashboard

**Purpose:** Make balance and the two challenge actions immediately available.

- Welcome using verified Bangla name; discreet verified badge.
- Balance card with `মোট ব্যালেন্স / Available balance`, hide/show control, and no stale-data timestamp unless it is real.
- Primary quick actions: `সেন্ড মানি` and `মানি রিকোয়েস্ট`.
- Pending request preview with count and highest-priority item.
- Recent activity list with sent/received/request icons, counterparty, time, status and signed amount.
- Small trust strip: verified KYC and current trusted device.
- Empty state guides the user to make the first transaction.
- Test IDs: `available-balance`, `send-money`, `request-money`, `pending-request-card`, `recent-activity`.

### 11. Send Money

**Purpose:** Transfer safely using a verified BanglaPay phone wallet.

**Step 1 — Recipient**
- Bangladesh phone input and continue action.
- Resolve to masked phone, verified name and avatar initials before amount entry.
- Unknown/self recipient errors appear before proceeding.

**Step 2 — Amount**
- Large numeric amount input with ৳ prefix, two-decimal limit, available balance and optional note.
- Quick amount chips are allowed but never preselected.

**Step 3 — Review**
- Recipient, phone, amount, note, and `No fee` summary.
- Warning that the action cannot be casually undone.
- Primary `৳X পাঠান / Send` with processing lock.

**Result**
- Dedicated receipt with completed/failed state, reference, timestamp, amount, recipient and resulting balance.
- Actions: `সম্পন্ন / Done`, `রসিদ দেখুন`, and optional copy reference.
- Test IDs: `recipient-phone`, `resolve-recipient`, `send-amount`, `send-note`, `review-transfer`, `confirm-transfer`, `transfer-reference`.

### 12. Request Money

**Purpose:** Request payment without moving funds until the payer accepts.

- Payer phone resolution, amount and note.
- Review clearly says `No money moves until accepted`.
- Success state shows pending status and seven-day expiry.
- Test IDs mirror send flow with `request-*` prefixes.

### 13. Requests Inbox and Outbox

**Purpose:** Separate actions the user must take from requests they are waiting on.

- Segmented tabs: `আমার কাছে / Incoming` and `আমার পাঠানো / Sent`.
- Incoming cards show requester, amount, note, time and expiry with Accept/Decline.
- Acceptance opens a review sheet with current balance and final amount.
- Outgoing cards show payer and pending/accepted/declined/expired status.
- Empty and pagination/loading states are required.
- Test IDs: `requests-incoming`, `requests-sent`, `accept-request-*`, `decline-request-*`.

### 14. Activity and History

**Purpose:** Make all movement easy to audit without presenting database terminology.

- Filters: All, Sent, Received, Requests, Funding.
- Group rows by date and use keyset `Load more`, not page numbers.
- Each row shows direction, counterparty/type, timestamp, status and signed amount.
- Positive credits use `+৳`; debits use `−৳`; do not rely on color alone.
- Selecting a row opens the receipt/detail page.
- Loading skeleton, no-results filter state and initial empty state.
- Test IDs: `history-filter-*`, `transaction-row-*`, `load-more-history`.

### 15. Transaction Receipt

**Purpose:** Provide trustworthy confirmation and a strong judge-demo artifact.

- Status, large amount, transaction type, sender/recipient, reference, date/time, note, and resulting balance where available.
- Request settlements link back to the originating request context.
- Initial funding is labeled `Opening balance`, never as another user's transfer.
- Copy-reference control and back-to-dashboard action.
- Failed attempts show recovery guidance but must not pretend a transaction exists when PostgreSQL rolled it back.

### 16. Security Settings

**Purpose:** Make device and PIN behavior understandable.

- Current trusted device card with browser, approximate platform, trusted date and `Current` badge.
- Explain that only one device can remain active.
- Change PIN flow: send OTP → verify → new PIN → confirmation.
- Show last-three-PIN rule without revealing previous values.
- Sign out action and warning that replacing a device signs out the previous browser.
- Audit summary may show recent security event labels without sensitive values.
- Test IDs: `trusted-device`, `change-pin`, `security-otp`, `new-pin`, `sign-out`.

## Shared States Claude Must Design

- Full-page initial loading skeleton and section-level refresh skeleton.
- Empty balance/activity/request states with one useful action.
- Inline field validation, form-level recoverable errors and dedicated blocked states.
- Offline/network interruption with safe retry wording.
- Rate-limit countdown for OTP, PIN and KYC.
- Processing states that prevent repeated transfer/request submissions.
- Idempotent replay success that displays the original receipt without alarming the user.
- Session expired, device replaced, account pending KYC and account locked redirects.
- Private-image upload failure and OCR worker/language-load failure.

## Synthetic Demo Context

Use only fictional data in designs and fixtures.

```ts
const demoUsers = {
  ahsan: {
    nameBn: "আহসান হাবিব",
    nameEn: "Ahsan Habib",
    phone: "+880 1700-000001",
    balance: "৳96,300.00",
  },
  saiful: {
    nameBn: "মো. সাইফুল ইসলাম",
    nameEn: "Md. Saiful Islam",
    phone: "+880 1700-000002",
    balance: "৳103,700.00",
  },
};

const demoActivity = [
  { type: "sent", counterparty: "মো. সাইফুল ইসলাম", amount: "−৳2,500.00", status: "Completed" },
  { type: "requestPaid", counterparty: "মো. সাইফুল ইসলাম", amount: "−৳1,200.00", status: "Completed" },
  { type: "opening", counterparty: "BanglaPay", amount: "+৳100,000.00", status: "Completed" },
];
```

Use a synthetic NID number such as `1000000001` and a clearly fictional card image carrying the matching names and date of birth. Never use photographs or identity data belonging to real people.

## Recommended Claude Design Passes

Do not ask Claude Design to create every screen in one uncontrolled pass.

### Pass 1 — Foundation and Onboarding

```text
Using docs/UI-DESIGN-BRIEF.md, create the BanglaPay design tokens, responsive auth shell, landing page, phone registration, virtual OTP, PIN setup, KYC introduction, OCR capture/review, KYC success, and login/device states. Use typed demo data only. Do not touch backend or Supabase modules. Verify mobile 375px and desktop 1440px layouts.
```

### Pass 2 — Wallet Core

```text
Using the established BanglaPay design system and docs/UI-DESIGN-BRIEF.md, create the authenticated responsive shell, dashboard, send-money recipient/amount/review/result flow, request-money flow, and reusable money/receipt components. Preserve review-before-submit behavior and all loading/error states. Do not add direct database calls.
```

### Pass 3 — Requests, History and Security

```text
Complete the BanglaPay UI with incoming/outgoing requests, accept/decline review, activity filters and load-more history, transaction receipts, trusted-device security settings, OTP-protected PIN change, session-expired and device-replaced states. Add stable data-testid attributes and verify keyboard, screen-reader, reduced-motion, mobile, tablet, and desktop behavior.
```

### Pass 4 — Design QA

```text
Audit the implemented BanglaPay UI against docs/UI-DESIGN-BRIEF.md. Fix inconsistent spacing, typography, bilingual labels, focus states, contrast, mobile overflow, missing loading/empty/error states, unstable data-testid values, and any component that bypasses the established design tokens. Do not change business logic or API contracts.
```

## Design Acceptance Checklist

- [ ] Brand reads `বাংলা-পে` with `BanglaPay` support and does not resemble another MFS.
- [ ] Every required screen and shared state exists at mobile and desktop widths.
- [ ] Bangla is primary while critical English helper text remains available.
- [ ] Balance, amount, recipient and status hierarchy is immediately understandable.
- [ ] Transfers and request acceptance always include review and receipt states.
- [ ] KYC explains privacy, supports OCR correction and avoids exposing fake registry data.
- [ ] New-device, replaced-device, OTP, PIN lock and PIN change states are clear.
- [ ] Components use design tokens and existing shadcn/Base UI primitives.
- [ ] Interactive elements meet touch, keyboard, focus, screen-reader and contrast requirements.
- [ ] Stable `data-testid` attributes support Saiful's Playwright tests.
- [ ] No UI component contains direct Supabase or financial mutation logic.
