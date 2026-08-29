import { expect, test } from "@playwright/test";

const VALID_PHONE = "01711000001";
const DEMO_OTP = ["1", "2", "3", "4", "5", "6"];

async function fillOtp(page: import("@playwright/test").Page, digits: string[]) {
  for (let i = 0; i < digits.length; i++) {
    await page.getByTestId(`auth-otp-input-${i}`).fill(digits[i]);
  }
}

async function pressPin(page: import("@playwright/test").Page, pin: string) {
  for (const digit of pin) {
    await page.getByTestId(`auth-pin-key-${digit}`).click();
  }
}

test("rejects an invalid phone number", async ({ page }) => {
  await page.goto("/register");
  await page.getByTestId("auth-phone-input").fill("12345");
  await page.getByTestId("auth-phone-submit").click();
  await expect(page.getByText("সঠিক ১১ সংখ্যার নম্বর দিন")).toBeVisible();
});

test("completes signup with the demo OTP and a strong PIN", async ({ page }) => {
  await page.goto("/register");

  await page.getByTestId("auth-phone-input").fill(VALID_PHONE);
  await page.getByTestId("auth-phone-submit").click();
  await expect(page.getByTestId("auth-otp-input-0")).toBeVisible();

  await fillOtp(page, DEMO_OTP);
  await expect(page.getByTestId("auth-pin-key-1")).toBeVisible();

  await pressPin(page, "7392");
  await expect(page.getByRole("heading", { name: "পিন আবার দিন" })).toBeVisible();
  await pressPin(page, "7392");

  await expect(page.getByTestId("auth-go-dashboard")).toBeVisible();
});

test("rejects a weak PIN during signup", async ({ page }) => {
  await page.goto("/register");
  await page.getByTestId("auth-phone-input").fill(VALID_PHONE);
  await page.getByTestId("auth-phone-submit").click();
  await fillOtp(page, DEMO_OTP);

  await pressPin(page, "1234");
  await expect(page.getByText("এই পিন সহজে অনুমানযোগ্য")).toBeVisible();
});

test("logs in with phone and PIN only, skipping OTP", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("auth-phone-input").fill(VALID_PHONE);
  await page.getByTestId("auth-phone-submit").click();

  await expect(page.getByTestId("auth-pin-key-1")).toBeVisible();
  await pressPin(page, "7392");

  await expect(page.getByTestId("auth-go-dashboard")).toBeVisible();
});

test("switching tabs navigates between /login and /register", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByTestId("auth-tab-signup").click();
  await expect(page).toHaveURL(/\/register$/);

  await page.getByTestId("auth-tab-login").click();
  await expect(page).toHaveURL(/\/login$/);
});
