import { expect, test } from "@playwright/test";

test("shows the balance, sidebar, and recent transactions", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-balance")).toHaveText("৳৯৭,৫০০.০০");
  await expect(page.getByText("ড্যাশবোর্ড", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("সাম্প্রতিক লেনদেন")).toBeVisible();
});

test("sends money and updates the balance, toast, and history", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByTestId("send-money-recipient").fill("01911223344");
  await page.getByTestId("send-money-amount").fill("2500.00");
  await page.getByTestId("send-money-submit").click();

  await expect(page.getByTestId("dashboard-balance")).toHaveText("৳৯৫,০০০.০০");
  await expect(page.getByText("৳২,৫০০.০০ পাঠানো হয়েছে")).toBeVisible();
  await expect(page.getByTestId("send-money-recipient")).toHaveValue("");
});

test("rejects an invalid wallet number", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByTestId("send-money-recipient").fill("123");
  await page.getByTestId("send-money-amount").fill("100.00");
  await page.getByTestId("send-money-submit").click();
  await expect(page.getByText("ওয়ালেট নম্বর ১১ সংখ্যার হতে হবে")).toBeVisible();
});

test("rejects sending more than the available balance", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByTestId("send-money-recipient").fill("01911223344");
  await page.getByTestId("send-money-amount").fill("999999.00");
  await page.getByTestId("send-money-submit").click();
  await expect(page.getByText("পর্যাপ্ত ব্যালেন্স নেই")).toBeVisible();
});

test("switches to the request tab and sends a request without changing the balance", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByText("টাকা চান", { exact: true }).click();
  await page.getByTestId("request-money-recipient").fill("01911223344");
  await page.getByTestId("request-money-amount").fill("500.00");
  await page.getByTestId("request-money-submit").click();

  await expect(page.getByTestId("dashboard-balance")).toHaveText("৳৯৭,৫০০.০০");
  await expect(page.getByText("৳৫০০.০০-এর অনুরোধ পাঠানো হয়েছে")).toBeVisible();
});

test("accepts a pending request and settles it into history", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("৩", { exact: true }).first()).toBeVisible();

  const firstRequest = page.locator('[data-testid^="request-inbox-item-"]').first();
  const requestId = await firstRequest.getAttribute("data-testid");
  const id = requestId!.replace("request-inbox-item-", "");

  await page.getByTestId(`request-accept-${id}`).click();
  await expect(page.getByTestId("dashboard-balance")).toHaveText("৳৯৬,৩০০.০০");
  await expect(page.getByTestId(requestId!)).not.toBeVisible();
});

test("declines a pending request without moving money", async ({ page }) => {
  await page.goto("/dashboard");
  const firstRequest = page.locator('[data-testid^="request-inbox-item-"]').first();
  const requestId = await firstRequest.getAttribute("data-testid");
  const id = requestId!.replace("request-inbox-item-", "");

  await page.getByTestId(`request-decline-${id}`).click();
  await expect(page.getByTestId("dashboard-balance")).toHaveText("৳৯৭,৫০০.০০");
  await expect(page.getByTestId(requestId!)).not.toBeVisible();
});

test("switches locale and theme", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("ড্যাশবোর্ড", { exact: true }).first()).toBeVisible();

  await page.getByTestId("locale-en").click();
  await expect(page.getByText("Dashboard", { exact: true }).first()).toBeVisible();

  const root = page.locator(".db-dashboard");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await page.getByTestId("theme-light").click();
  await expect(root).toHaveAttribute("data-theme", "light");
});
