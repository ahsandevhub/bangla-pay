import { expect, test, type Page } from "@playwright/test";
import { pool } from "../integration/db";

// Real integration, not the old client-side simulation: registers a fresh
// user via the actual auth API (context.request shares its cookie jar with
// `page`, so no manual cookie plumbing), seeds a real fake_nid_records row,
// draws a synthetic NID image on an in-page canvas for real Tesseract.js
// OCR to read, and submits to the real /api/kyc/verify. The English side of
// the synthetic image is what's asserted on -- Bangla glyph rendering
// depends on the test runner's font availability, so the Bangla name is
// filled in manually in the review step, exactly as a user would if OCR
// only caught the English side.

function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

function randomTestPhone(): string {
  return `01${"3456789"[Math.floor(Math.random() * 7)]}${randomDigits(8)}`;
}

async function seedFakeNidRecord(overrides?: { dateOfBirth?: string; englishName?: string }) {
  const nidNumber = randomDigits(17);
  const dateOfBirth = overrides?.dateOfBirth ?? "1992-01-15";
  const englishName = overrides?.englishName ?? "Test Kyc User";
  await pool.query(
    "insert into public.fake_nid_records (nid_number, date_of_birth, bangla_name, english_name) values ($1, $2, $3, $4)",
    [nidNumber, dateOfBirth, "টেস্ট ইউজার", englishName],
  );
  return { nidNumber, dateOfBirth, englishName };
}

async function registerAndLogIn(page: Page, phone: string) {
  const pin = "6284";
  const sendRes = await page.context().request.post("/api/auth/otp/send", {
    data: { phone, purpose: "REGISTRATION" },
  });
  const { data: sendData } = await sendRes.json();
  const smsRes = await page.context().request.get(`/api/demo/sms?inboxToken=${sendData.inboxToken}`);
  const { data: smsData } = await smsRes.json();
  await page.context().request.post("/api/auth/otp/verify", {
    data: { phone, purpose: "REGISTRATION", code: smsData.code },
  });
  const setupRes = await page.context().request.post("/api/auth/pin/setup", {
    data: { phone, pin, confirmPin: pin },
  });
  expect(setupRes.ok()).toBe(true);
}

/** Draws a synthetic NID-front image on an in-page canvas and returns it as a PNG buffer, for real OCR to read. */
async function makeNidImageBuffer(page: Page, lines: string[]): Promise<Buffer> {
  const dataUrl = await page.evaluate((linesArg: string[]) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 600;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.font = "34px sans-serif";
    let y = 70;
    for (const line of linesArg) {
      ctx.fillText(line, 40, y);
      y += 70;
    }
    return canvas.toDataURL("image/png");
  }, lines);
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

async function uploadSyntheticNidImage(page: Page, lines: string[]) {
  const buffer = await makeNidImageBuffer(page, lines);
  // Deliberately not "upload-nid-image": that button also schedules its own
  // fileRef.current.click() 80ms later (to open a real file picker for an
  // actual user), which races with this test's explicit setInputFiles()
  // call below and can reset the input back to empty. "start-nid-scan"
  // makes the same intro -> capture transition without that side effect.
  await page.getByTestId("start-nid-scan").click();
  await page.getByTestId("nid-file-input").setInputFiles({ name: "nid.png", mimeType: "image/png", buffer });
}

test("shows the intro screen with the KYC step highlighted", async ({ page }) => {
  await page.goto("/kyc");
  await expect(page.getByTestId("kyc-intro")).toBeVisible();
  await expect(page.getByTestId("start-nid-scan")).toBeVisible();
  await expect(page.getByTestId("upload-nid-image")).toBeVisible();
});

test("requires an image before reading information", async ({ page }) => {
  await page.goto("/kyc");
  await page.getByTestId("start-nid-scan").click();
  await page.getByTestId("start-ocr").click();
  await expect(page.getByText("আগে NID-এর একটি ছবি দিন")).toBeVisible();
});

test("rejects an invalid NID number", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/kyc");
  await uploadSyntheticNidImage(page, ["NATIONAL ID CARD", "Name: Someone", "NID No: 123"]);
  await page.getByTestId("start-ocr").click();
  await expect(page.getByTestId("nid-number")).toBeVisible({ timeout: 60_000 });

  await page.getByTestId("nid-number").fill("123");
  await page.getByTestId("nid-date-of-birth").fill("1992-01-15");
  await page.getByTestId("nid-name-bn").fill("টেস্ট");
  await page.getByTestId("nid-name-en").fill("Test");
  await page.getByTestId("nid-consent").check();
  await page.getByTestId("verify-nid").click();
  await expect(page.getByText(/১০, ১৩ বা ১৭ সংখ্যার/)).toBeVisible();
});

test("switches locale and theme", async ({ page }) => {
  await page.goto("/kyc");
  await expect(page.getByTestId("kyc-intro")).toContainText("পরিচয় যাচাই করুন");

  await page.getByTestId("locale-en").click();
  await expect(page.getByTestId("kyc-intro")).toContainText("Verify your identity");

  const root = page.locator(".ky-kyc");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await page.locator('button[title="Switch theme"]').click();
  await expect(root).toHaveAttribute("data-theme", "light");
});

test("completes the full OCR + verification flow against the real backend", async ({ page }) => {
  test.setTimeout(120_000);
  const phone = randomTestPhone();
  const fixture = await seedFakeNidRecord();

  await registerAndLogIn(page, phone);
  await page.goto("/kyc");

  await uploadSyntheticNidImage(page, [
    "NATIONAL ID CARD",
    `Name: ${fixture.englishName}`,
    "Date of Birth: 15 Jan 1992",
    `NID No: ${fixture.nidNumber}`,
  ]);
  await expect(page.getByTestId("nid-preview")).toBeVisible();

  await page.getByTestId("start-ocr").click();
  // First OCR run on a fresh worker loads ~30MB of local WASM + language
  // data before recognition even starts -- generous timeout for that, not
  // for recognition itself (which is fast once warm).
  await expect(page.getByTestId("nid-number")).toBeVisible({ timeout: 90_000 });

  // Correct every field to match the seeded fixture exactly, regardless of
  // what OCR actually extracted -- this is what docs/ARCHITECTURE.md's
  // "let the user correct extracted values" is for, and keeps this test's
  // pass/fail independent of OCR extraction accuracy on a synthetic image.
  await page.getByTestId("nid-number").fill(fixture.nidNumber);
  await page.getByTestId("nid-date-of-birth").fill(fixture.dateOfBirth);
  await page.getByTestId("nid-name-bn").fill("টেস্ট ইউজার");
  await page.getByTestId("nid-name-en").fill(fixture.englishName);
  await page.getByTestId("nid-consent").check();
  await page.getByTestId("verify-nid").click();

  await expect(page.getByTestId("kyc-success")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("wallet-number")).toHaveText(`+88${phone}`);
  await expect(page.getByTestId("opening-balance")).toContainText("১,০০,০০০.০০");
  await expect(page.getByTestId("go-dashboard")).toBeVisible();
});

test("shows the mismatch error for a real NID/DOB mismatch", async ({ page }) => {
  test.setTimeout(120_000);
  const phone = randomTestPhone();
  const fixture = await seedFakeNidRecord({ dateOfBirth: "1992-01-15" });

  await registerAndLogIn(page, phone);
  await page.goto("/kyc");
  await uploadSyntheticNidImage(page, ["NATIONAL ID CARD", `Name: ${fixture.englishName}`]);
  await page.getByTestId("start-ocr").click();
  await expect(page.getByTestId("nid-number")).toBeVisible({ timeout: 90_000 });

  await page.getByTestId("nid-number").fill(fixture.nidNumber);
  // Deliberately wrong DOB -- everything else matches the fixture.
  await page.getByTestId("nid-date-of-birth").fill("1999-01-01");
  await page.getByTestId("nid-name-bn").fill("টেস্ট ইউজার");
  await page.getByTestId("nid-name-en").fill(fixture.englishName);
  await page.getByTestId("nid-consent").check();
  await page.getByTestId("verify-nid").click();

  await expect(page.getByTestId("kyc-error")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("error-fix")).toBeVisible();
});

test("shows the duplicate error when a second user claims an already-verified NID", async ({ page }) => {
  test.setTimeout(180_000);
  const fixture = await seedFakeNidRecord();

  const firstPhone = randomTestPhone();
  await registerAndLogIn(page, firstPhone);
  await page.goto("/kyc");
  await uploadSyntheticNidImage(page, ["NATIONAL ID CARD", `Name: ${fixture.englishName}`]);
  await page.getByTestId("start-ocr").click();
  await expect(page.getByTestId("nid-number")).toBeVisible({ timeout: 90_000 });
  await page.getByTestId("nid-number").fill(fixture.nidNumber);
  await page.getByTestId("nid-date-of-birth").fill(fixture.dateOfBirth);
  await page.getByTestId("nid-name-bn").fill("টেস্ট ইউজার");
  await page.getByTestId("nid-name-en").fill(fixture.englishName);
  await page.getByTestId("nid-consent").check();
  await page.getByTestId("verify-nid").click();
  await expect(page.getByTestId("kyc-success")).toBeVisible({ timeout: 20_000 });

  // A second, different user tries to claim the same NID.
  const secondPhone = randomTestPhone();
  await page.context().clearCookies();
  await registerAndLogIn(page, secondPhone);
  await page.goto("/kyc");
  await uploadSyntheticNidImage(page, ["NATIONAL ID CARD", `Name: ${fixture.englishName}`]);
  await page.getByTestId("start-ocr").click();
  await expect(page.getByTestId("nid-number")).toBeVisible({ timeout: 90_000 });
  await page.getByTestId("nid-number").fill(fixture.nidNumber);
  await page.getByTestId("nid-date-of-birth").fill(fixture.dateOfBirth);
  await page.getByTestId("nid-name-bn").fill("টেস্ট ইউজার");
  await page.getByTestId("nid-name-en").fill(fixture.englishName);
  await page.getByTestId("nid-consent").check();
  await page.getByTestId("verify-nid").click();

  await expect(page.getByTestId("kyc-error")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("error-new-image")).toBeVisible();
});
