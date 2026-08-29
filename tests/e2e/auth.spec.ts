import { expect, test, type Page } from "@playwright/test";
import { registerActiveUser, registerAndLogIn, randomTestPhone } from "./helpers";

// Real integration against the live backend, not the old client-side
// simulation with a hardcoded DEMO_OTP: every phone/OTP/PIN step here goes
// through the actual /api/auth/* routes, reading the real virtual-SMS code
// back off the page exactly as a user would.

const STRONG_PIN = ["7", "3", "9", "2"];
const WEAK_PIN = ["1", "2", "3", "4"];

async function switchToEnglish(page: Page) {
  await page.getByTestId("locale-toggle-en").click();
}

async function readDemoCode(page: Page): Promise<string[]> {
  const badge = page.getByText(/Demo code: \d{6}/);
  await expect(badge).toBeVisible({ timeout: 15_000 });
  const text = await badge.textContent();
  const match = text!.match(/\d{6}/);
  return match![0].split("");
}

async function fillOtp(page: Page, digits: string[]) {
  for (let i = 0; i < 6; i += 1) {
    await page.getByTestId(`auth-otp-input-${i}`).fill(digits[i]);
  }
}

async function pressPin(page: Page, digits: string[]) {
  for (const d of digits) {
    await page.getByTestId(`auth-pin-key-${d}`).click();
  }
}

test("rejects an invalid phone number", async ({ page }) => {
  await page.goto("/register");
  await switchToEnglish(page);
  await page.getByTestId("auth-phone-input").fill("12345");
  await page.getByTestId("auth-phone-submit").click();
  await expect(page.getByText("Enter a valid 11-digit number starting with 01.")).toBeVisible();
});

test("registers with a real OTP, sets a strong PIN, and lands on the KYC step", async ({ page }) => {
  test.setTimeout(60_000);
  const phone = randomTestPhone();

  await page.goto("/register");
  await switchToEnglish(page);
  await page.getByTestId("auth-phone-input").fill(phone);
  await page.getByTestId("auth-phone-submit").click();

  await expect(page.getByTestId("auth-otp-input-0")).toBeVisible();
  const code = await readDemoCode(page);
  await fillOtp(page, code);

  await expect(page.getByTestId("auth-pin-key-1")).toBeVisible();
  await pressPin(page, STRONG_PIN);
  // Confirm step: same PIN again.
  await expect(page.getByText("Confirm your PIN")).toBeVisible();
  await pressPin(page, STRONG_PIN);

  await expect(page.getByTestId("auth-go-dashboard")).toBeVisible();
  await expect(page.getByText("Now verify your NID to activate your wallet.")).toBeVisible();
  await expect(page.getByTestId("auth-go-dashboard")).toHaveAttribute("href", "/kyc");
});

test("rejects a weak PIN during signup", async ({ page }) => {
  test.setTimeout(60_000);
  const phone = randomTestPhone();

  await page.goto("/register");
  await switchToEnglish(page);
  await page.getByTestId("auth-phone-input").fill(phone);
  await page.getByTestId("auth-phone-submit").click();
  await expect(page.getByTestId("auth-otp-input-0")).toBeVisible();
  const code = await readDemoCode(page);
  await fillOtp(page, code);

  await expect(page.getByTestId("auth-pin-key-1")).toBeVisible();
  await pressPin(page, WEAK_PIN);
  await expect(page.getByText("That PIN is too easy to guess — choose another one.")).toBeVisible();
});

test("rejects registering a phone that's already taken", async ({ page }) => {
  const phone = randomTestPhone();
  await registerAndLogIn(page.context().request, phone);
  // registerAndLogIn leaves this context authenticated (registration also
  // signs in) -- proxy.ts correctly bounces an authenticated visit to
  // /register straight to /dashboard, same as real production behavior.
  // Drop just the Supabase session cookie to exercise the page itself.
  await page.context().clearCookies({ name: /^sb-/ });

  await page.goto("/register");
  await switchToEnglish(page);
  await page.getByTestId("auth-phone-input").fill(phone);
  await page.getByTestId("auth-phone-submit").click();
  await expect(page.getByText("This number is already registered — log in instead.")).toBeVisible();
});

test("logs in with phone and PIN on a trusted device, skipping OTP", async ({ page }) => {
  test.setTimeout(60_000);
  // registerActiveUser (register + real /api/kyc/verify) runs entirely
  // through page.context().request, so the resulting bp_device_token cookie
  // lands in this same browser context -- the login UI below is then
  // driven from a browser that's already trusted, for a user who's already
  // ACTIVE (needed so the post-login destination is genuinely /dashboard,
  // not /kyc). Drop just the Supabase session cookie first (registration
  // also signs in, and proxy.ts correctly bounces an authenticated /login
  // visit to /dashboard) -- keeping bp_device_token is what makes this
  // "trusted device, expired session" rather than "brand-new browser".
  const phone = randomTestPhone();
  await registerActiveUser(page.context().request, phone);
  await page.context().clearCookies({ name: /^sb-/ });

  await page.goto("/login");
  await switchToEnglish(page);
  await page.getByTestId("auth-phone-input").fill(phone);
  await page.getByTestId("auth-phone-submit").click();

  await expect(page.getByTestId("auth-pin-key-1")).toBeVisible();
  await pressPin(page, ["6", "2", "8", "4"]); // matches registerAndLogIn's fixed PIN

  await expect(page.getByTestId("auth-go-dashboard")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Your wallet is ready.")).toBeVisible();
  await expect(page.getByTestId("auth-go-dashboard")).toHaveAttribute("href", "/dashboard");
});

test("logs in from a new device, requiring OTP before the PIN is accepted", async ({ page, browser }) => {
  test.setTimeout(60_000);
  const phone = randomTestPhone();
  // Register from an entirely separate context so this test's `page` never
  // holds that registration's bp_device_token cookie -- a genuinely
  // untrusted browser, not just an untrusted-looking one.
  const registrationContext = await browser.newContext();
  await registerAndLogIn(registrationContext.request, phone);
  await registrationContext.close();

  await page.goto("/login");
  await switchToEnglish(page);
  await page.getByTestId("auth-phone-input").fill(phone);
  await page.getByTestId("auth-phone-submit").click();
  await expect(page.getByTestId("auth-pin-key-1")).toBeVisible();
  await pressPin(page, ["6", "2", "8", "4"]);

  // PIN_LOCKED aside, an unrecognized device always needs a DEVICE_LOGIN OTP
  // before the PIN attempt itself is even evaluated (OTP_REQUIRED) -- the UI
  // detours into the OTP step instead of erroring outright.
  await expect(page.getByTestId("auth-otp-input-0")).toBeVisible({ timeout: 10_000 });
  const code = await readDemoCode(page);
  await fillOtp(page, code);

  // Verifying the OTP retries the same PIN login automatically -- no PIN
  // re-entry needed.
  await expect(page.getByTestId("auth-go-dashboard")).toBeVisible({ timeout: 10_000 });
});

test("shows an error for an incorrect PIN", async ({ page }) => {
  const phone = randomTestPhone();
  await registerAndLogIn(page.context().request, phone);
  await page.context().clearCookies({ name: /^sb-/ });

  await page.goto("/login");
  await switchToEnglish(page);
  await page.getByTestId("auth-phone-input").fill(phone);
  await page.getByTestId("auth-phone-submit").click();
  await expect(page.getByTestId("auth-pin-key-1")).toBeVisible();
  await pressPin(page, ["1", "1", "1", "1"]); // wrong -- registerAndLogIn used 6284

  await expect(page.getByText("Incorrect PIN.")).toBeVisible();
});

test("switching tabs navigates between /login and /register", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("auth-phone-input")).toBeVisible();
  await page.getByTestId("auth-tab-signup").click();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByTestId("auth-tab-login").click();
  await expect(page).toHaveURL(/\/login$/);
});
