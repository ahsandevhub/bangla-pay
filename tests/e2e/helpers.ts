import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { pool } from "../integration/db";

export function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

// Must match ^01[3-9]\d{8}$ -- the local (no +88) form the phone-check/OTP
// routes accept, which normalizePhone() then canonicalizes server-side.
export function randomTestPhone(): string {
  return `01${"3456789"[Math.floor(Math.random() * 7)]}${randomDigits(8)}`;
}

export async function seedFakeNidRecord(overrides?: { dateOfBirth?: string; englishName?: string }) {
  const nidNumber = randomDigits(17);
  const dateOfBirth = overrides?.dateOfBirth ?? "1992-01-15";
  const englishName = overrides?.englishName ?? "Test Kyc User";
  await pool.query(
    "insert into public.fake_nid_records (nid_number, date_of_birth, bangla_name, english_name) values ($1, $2, $3, $4)",
    [nidNumber, dateOfBirth, "টেস্ট ইউজার", englishName],
  );
  return { nidNumber, dateOfBirth, englishName };
}

/**
 * Registers a fresh user through the real HTTP auth flow (OTP send/verify,
 * then PIN setup), against whichever APIRequestContext is passed in --
 * typically `page.context().request` so the resulting session cookies are
 * visible to `page`. Leaves the user PENDING_KYC with no funded account yet.
 */
export async function registerAndLogIn(request: APIRequestContext, phone: string) {
  const pin = "6284";
  // otp/send is rate-limited per IP (docs/ARCHITECTURE.md), and every
  // Playwright request hits 127.0.0.1 directly with no X-Forwarded-For --
  // ipFromRequest() then falls back to the single literal string "unknown",
  // so every test in a run would otherwise share one rate-limit bucket. A
  // synthetic per-registration IP keeps each test's OTP sends independent,
  // matching how a real deployment behind a proxy would naturally see
  // distinct client IPs.
  const sendRes = await request.post("/api/auth/otp/send", {
    // The bucket key only ever hashes this value (check_rate_limit), so it
    // doesn't need to look like a real IP -- just be unique per registration.
    headers: { "x-forwarded-for": randomUUID() },
    data: { phone, purpose: "REGISTRATION" },
  });
  const { data: sendData } = await sendRes.json();
  const smsRes = await request.get(`/api/demo/sms?inboxToken=${sendData.inboxToken}`);
  const { data: smsData } = await smsRes.json();
  await request.post("/api/auth/otp/verify", {
    data: { phone, purpose: "REGISTRATION", code: smsData.code },
  });
  const setupRes = await request.post("/api/auth/pin/setup", {
    data: { phone, pin, confirmPin: pin },
  });
  if (!setupRes.ok()) {
    throw new Error(`pin/setup failed: ${setupRes.status()} ${await setupRes.text()}`);
  }
}

/**
 * Registers a user and immediately clears KYC via the real /api/kyc/verify
 * endpoint against a freshly seeded fake_nid_records row -- skipping the
 * OCR/image-capture UI entirely (kyc.spec.ts already covers that flow in
 * depth; dashboard tests just need a real, ACTIVE, ৳100,000-funded account
 * to exist quickly). documentPath is never read back by activate_account_after_kyc,
 * so a synthetic never-uploaded path is fine here.
 */
export async function registerActiveUser(request: APIRequestContext, phone: string): Promise<string> {
  await registerAndLogIn(request, phone);
  const fixture = await seedFakeNidRecord();
  const verifyRes = await request.post("/api/kyc/verify", {
    data: {
      documentPath: `test/${randomUUID()}.jpg`,
      nidNumber: fixture.nidNumber,
      dateOfBirth: fixture.dateOfBirth,
      englishName: fixture.englishName,
    },
  });
  if (!verifyRes.ok()) {
    throw new Error(`kyc/verify failed: ${verifyRes.status()} ${await verifyRes.text()}`);
  }
  const { data } = await verifyRes.json();
  return data.walletNumber as string;
}
