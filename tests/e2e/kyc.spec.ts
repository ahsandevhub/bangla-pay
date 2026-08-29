import { expect, test, type Page } from "@playwright/test";

// 1x1 red pixel PNG, used as a stand-in NID image for upload tests.
const PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function uploadNidImage(page: Page) {
  await page.getByTestId("upload-nid-image").click();
  await page.getByTestId("nid-file-input").setInputFiles({
    name: "nid.png",
    mimeType: "image/png",
    buffer: PNG_BUFFER,
  });
}

async function runOcrToReview(page: Page) {
  await page.getByTestId("start-ocr").click();
  await expect(page.getByTestId("nid-number")).toBeVisible({ timeout: 8000 });
}

test("shows the intro screen with the KYC step highlighted", async ({ page }) => {
  await page.goto("/kyc");
  await expect(page.getByTestId("kyc-intro")).toBeVisible();
  await expect(page.getByTestId("start-nid-scan")).toBeVisible();
  await expect(page.getByTestId("upload-nid-image")).toBeVisible();
});

test("completes the full verification flow to success", async ({ page }) => {
  await page.goto("/kyc");
  await uploadNidImage(page);
  await expect(page.getByTestId("nid-preview")).toBeVisible();

  await runOcrToReview(page);
  await expect(page.getByTestId("nid-number")).toHaveValue("1000000001");

  await page.getByTestId("nid-consent").check();
  await page.getByTestId("verify-nid").click();

  await expect(page.getByTestId("kyc-success")).toBeVisible({ timeout: 6000 });
  await expect(page.getByTestId("wallet-number")).toHaveText("01711-000000");
  await expect(page.getByTestId("go-dashboard")).toBeVisible();
});

test("requires an image before reading information", async ({ page }) => {
  await page.goto("/kyc");
  await page.getByTestId("start-nid-scan").click();
  await page.getByTestId("start-ocr").click();
  await expect(page.getByText("আগে NID-এর একটি ছবি দিন")).toBeVisible();
});

test("requires consent before verifying", async ({ page }) => {
  await page.goto("/kyc");
  await uploadNidImage(page);
  await runOcrToReview(page);
  await page.getByTestId("verify-nid").click();
  await expect(page.getByText("এগিয়ে যাওয়ার আগে তথ্য মিলে যাওয়ার নিশ্চয়তা দিন")).toBeVisible();
});

test("rejects an invalid NID number", async ({ page }) => {
  await page.goto("/kyc");
  await uploadNidImage(page);
  await runOcrToReview(page);
  await page.getByTestId("nid-number").fill("123");
  await page.getByTestId("nid-consent").check();
  await page.getByTestId("verify-nid").click();
  await expect(page.getByText("NID নম্বর ১০ সংখ্যার হতে হবে")).toBeVisible();
});

test("shows the unclear-image demo state right after OCR", async ({ page }) => {
  // resultMode=unclear fails during OCR itself, before the review step.
  await page.goto("/kyc?result=unclear");
  await uploadNidImage(page);
  await page.getByTestId("start-ocr").click();

  await expect(page.getByTestId("kyc-error")).toBeVisible({ timeout: 8000 });
  await expect(page.getByTestId("error-new-image")).toBeVisible();
});

test("shows the mismatch demo state after verifying", async ({ page }) => {
  await page.goto("/kyc?result=mismatch");
  await uploadNidImage(page);
  await runOcrToReview(page);
  await page.getByTestId("nid-consent").check();
  await page.getByTestId("verify-nid").click();

  await expect(page.getByTestId("kyc-error")).toBeVisible({ timeout: 6000 });
  await expect(page.getByTestId("error-fix")).toBeVisible();
  await expect(page.getByTestId("error-new-image")).toBeVisible();
});

test("shows the duplicate-NID demo state after verifying", async ({ page }) => {
  await page.goto("/kyc?result=duplicate");
  await uploadNidImage(page);
  await runOcrToReview(page);
  await page.getByTestId("nid-consent").check();
  await page.getByTestId("verify-nid").click();

  await expect(page.getByTestId("kyc-error")).toBeVisible({ timeout: 6000 });
  await expect(page.getByTestId("error-new-image")).toBeVisible();
});

test("rate-limited demo shows a countdown before allowing retry", async ({ page }) => {
  await page.goto("/kyc?result=rate-limited");
  await uploadNidImage(page);
  await runOcrToReview(page);
  await page.getByTestId("nid-consent").check();
  await page.getByTestId("verify-nid").click();

  await expect(page.getByTestId("kyc-error")).toBeVisible({ timeout: 6000 });
  await expect(page.getByTestId("rate-limit-countdown")).toBeVisible();
  await expect(page.getByTestId("error-retry")).toContainText("অনেকবার চেষ্টা হয়েছে");
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
