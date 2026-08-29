import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { registerActiveUser, randomTestPhone } from "./helpers";

// Real integration against the live backend, not the old client-side
// simulation: every user here is a genuine ACTIVE, ৳100,000-funded account
// (registerActiveUser skips the OCR UI and clears KYC directly against a
// freshly seeded fake_nid_records row, since that flow is already covered
// in depth by kyc.spec.ts) and every send/request/accept/decline goes
// through the real /api/transfers, /api/requests* routes.

const INITIAL_FUNDING_BDT = "৳100,000.00";

/** Navigates to the dashboard and switches to English so assertions can use plain ASCII amounts -- the app defaults to Bangla. */
async function gotoDashboardEn(page: Page) {
  await page.goto("/dashboard");
  await page.getByTestId("locale-en").click();
}

test("renders the balance and wallet number for the logged-in user", async ({ page }) => {
  const phone = randomTestPhone();
  const walletNumber = await registerActiveUser(page.context().request, phone);

  await gotoDashboardEn(page);

  await expect(page.getByTestId("dashboard-balance")).toHaveText(INITIAL_FUNDING_BDT);
  await expect(page.getByTestId("dashboard-wallet-number")).toHaveText(walletNumber);
});

test("switches locale and theme", async ({ page }) => {
  const phone = randomTestPhone();
  await registerActiveUser(page.context().request, phone);
  await page.goto("/dashboard");

  await expect(page.locator('[data-el="htitle"] h1')).toHaveText("ড্যাশবোর্ড");
  await page.getByTestId("locale-en").click();
  await expect(page.locator('[data-el="htitle"] h1')).toHaveText("Dashboard");

  const root = page.locator(".db-dashboard");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await page.getByTestId("theme-light").click();
  await expect(root).toHaveAttribute("data-theme", "light");
});

test("rejects a malformed wallet number before calling the API", async ({ page }) => {
  const phone = randomTestPhone();
  await registerActiveUser(page.context().request, phone);
  await gotoDashboardEn(page);

  await page.getByTestId("send-money-recipient").fill("123");
  await page.getByTestId("send-money-amount").fill("500");
  await page.getByTestId("send-money-submit").click();

  await expect(page.getByText("Wallet number must be a valid Bangladeshi mobile number")).toBeVisible();
  await expect(page.getByTestId("confirm-dialog")).not.toBeVisible();
});

test("sends money to another user through the confirm dialog and shows a receipt", async ({ page, browser }) => {
  const senderPhone = randomTestPhone();
  const senderWallet = await registerActiveUser(page.context().request, senderPhone);

  const recipientContext = await browser.newContext();
  const recipientWallet = await registerActiveUser(recipientContext.request, randomTestPhone());
  await recipientContext.close();

  await gotoDashboardEn(page);
  await expect(page.getByTestId("dashboard-balance")).toHaveText(INITIAL_FUNDING_BDT);

  await page.getByTestId("send-money-recipient").fill(recipientWallet);
  await page.getByTestId("send-money-amount").fill("2500");
  await page.getByTestId("send-money-note").fill("lunch");
  await page.getByTestId("send-money-submit").click();

  await expect(page.getByTestId("confirm-dialog")).toBeVisible();
  await expect(page.getByTestId("confirm-dialog")).toContainText(recipientWallet);
  await page.getByTestId("confirm-yes").click();

  await expect(page.getByTestId("receipt")).toBeVisible();
  await expect(page.getByTestId("receipt-amount")).toHaveText("৳2,500.00");
  await expect(page.getByTestId("receipt")).toContainText(recipientWallet);
  await page.getByTestId("receipt-close").click();
  await expect(page.getByTestId("receipt")).not.toBeVisible();

  await expect(page.getByTestId("dashboard-balance")).toHaveText("৳97,500.00");
  await expect(page.getByTestId(`history-row-${await lastTransactionId(page)}`)).toBeVisible();

  const senderAccount = await accountSummary(page.context().request);
  expect(senderAccount.walletNumber).toBe(senderWallet);
  expect(senderAccount.balancePoisha).toBe("9750000");
});

test("shows a server error for an unknown recipient wallet", async ({ page }) => {
  const phone = randomTestPhone();
  await registerActiveUser(page.context().request, phone);
  await gotoDashboardEn(page);

  await page.getByTestId("send-money-recipient").fill("01999999998");
  await page.getByTestId("send-money-amount").fill("100");
  await page.getByTestId("send-money-submit").click();
  await page.getByTestId("confirm-yes").click();

  await expect(page.getByText("No active account was found for that wallet number.")).toBeVisible();
});

test("rejects a self-transfer", async ({ page }) => {
  const phone = randomTestPhone();
  const walletNumber = await registerActiveUser(page.context().request, phone);
  await gotoDashboardEn(page);

  await page.getByTestId("send-money-recipient").fill(walletNumber);
  await page.getByTestId("send-money-amount").fill("100");
  await page.getByTestId("send-money-submit").click();
  await page.getByTestId("confirm-yes").click();

  await expect(page.getByText("You can't send money to your own wallet.")).toBeVisible();
});

test("rejects a transfer larger than the available balance", async ({ page, browser }) => {
  const phone = randomTestPhone();
  await registerActiveUser(page.context().request, phone);

  const recipientContext = await browser.newContext();
  const recipientWallet = await registerActiveUser(recipientContext.request, randomTestPhone());
  await recipientContext.close();

  await gotoDashboardEn(page);
  await page.getByTestId("send-money-recipient").fill(recipientWallet);
  await page.getByTestId("send-money-amount").fill("999999");
  await page.getByTestId("send-money-submit").click();
  await page.getByTestId("confirm-yes").click();

  await expect(page.getByText(/INSUFFICIENT_FUNDS/)).toBeVisible();
  await expect(page.getByTestId("dashboard-balance")).toHaveText(INITIAL_FUNDING_BDT);
});

test("creates a request, and the payer can accept it from their own dashboard", async ({ page, browser }) => {
  const requesterPhone = randomTestPhone();
  const requesterWallet = await registerActiveUser(page.context().request, requesterPhone);

  const payerContext = await browser.newContext();
  const payerPage = await payerContext.newPage();
  const payerWallet = await registerActiveUser(payerContext.request, randomTestPhone());

  await gotoDashboardEn(page);
  await page.getByTestId("dashboard-request-button").click();
  await page.getByTestId("request-money-recipient").fill(payerWallet);
  await page.getByTestId("request-money-amount").fill("1200");
  await page.getByTestId("request-money-submit").click();

  await expect(page.getByText("Request for ৳1,200.00 sent")).toBeVisible();
  // Requests don't move money or need confirmation -- no dialog for this tab.
  await expect(page.getByTestId("confirm-dialog")).not.toBeVisible();

  await gotoDashboardEn(payerPage);
  const inboxItem = payerPage.locator('[data-testid^="request-inbox-item-"]').first();
  await expect(inboxItem).toBeVisible();
  await expect(inboxItem).toContainText(requesterWallet);
  await expect(inboxItem).toContainText("৳1,200.00");

  const requestId = (await inboxItem.getAttribute("data-testid"))!.replace("request-inbox-item-", "");
  await payerPage.getByTestId(`request-accept-${requestId}`).click();
  await expect(payerPage.getByTestId("confirm-dialog")).toBeVisible();
  await payerPage.getByTestId("confirm-yes").click();

  await expect(payerPage.getByTestId("receipt")).toBeVisible();
  await expect(payerPage.getByTestId("receipt-amount")).toHaveText("৳1,200.00");
  await payerPage.getByTestId("receipt-close").click();

  await expect(payerPage.getByTestId("dashboard-balance")).toHaveText("৳98,800.00");
  await expect(payerPage.getByTestId(`request-inbox-item-${requestId}`)).not.toBeVisible();

  const requesterAccount = await accountSummary(page.context().request);
  expect(requesterAccount.balancePoisha).toBe("10120000");

  await payerContext.close();
});

test("declines a request without moving money", async ({ page, browser }) => {
  const requesterPhone = randomTestPhone();
  await registerActiveUser(page.context().request, requesterPhone);

  const payerContext = await browser.newContext();
  const payerPage = await payerContext.newPage();
  const payerWallet = await registerActiveUser(payerContext.request, randomTestPhone());

  await gotoDashboardEn(page);
  await page.getByTestId("dashboard-request-button").click();
  await page.getByTestId("request-money-recipient").fill(payerWallet);
  await page.getByTestId("request-money-amount").fill("300");
  await page.getByTestId("request-money-submit").click();
  await expect(page.getByText("Request for ৳300.00 sent")).toBeVisible();

  await gotoDashboardEn(payerPage);
  const inboxItem = payerPage.locator('[data-testid^="request-inbox-item-"]').first();
  const requestId = (await inboxItem.getAttribute("data-testid"))!.replace("request-inbox-item-", "");
  await payerPage.getByTestId(`request-decline-${requestId}`).click();

  await expect(payerPage.getByText("Request declined")).toBeVisible();
  await expect(payerPage.getByTestId(`request-inbox-item-${requestId}`)).not.toBeVisible();
  await expect(payerPage.getByTestId("dashboard-balance")).toHaveText(INITIAL_FUNDING_BDT);

  await payerContext.close();
});

test("paginates transaction history with Load older", async ({ page, browser }) => {
  test.setTimeout(60_000);
  const phone = randomTestPhone();
  const historyOwnerWallet = await registerActiveUser(page.context().request, phone);

  // /api/transfers rate-limits at 10/minute *per user* (docs/ARCHITECTURE.md),
  // so 20+ rapid transfers can't come from one sender. Spreading them across
  // several senders -- each well under that per-user cap -- still piles up
  // 21 CREDIT entries on the receiving side, which is what's under test here.
  const senderContexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  await Promise.all(senderContexts.map((ctx) => registerActiveUser(ctx.request, randomTestPhone())));

  // The initial funding row is already 1 entry; 21 more credits push the
  // account past HISTORY_PAGE_SIZE (20), forcing a real second page.
  for (let i = 0; i < 21; i += 1) {
    const senderContext = senderContexts[i % senderContexts.length];
    const res = await senderContext.request.post("/api/transfers", {
      headers: { "Idempotency-Key": crypto.randomUUID() },
      data: { destinationWallet: historyOwnerWallet, amount: "10.00" },
    });
    expect(res.ok()).toBe(true);
  }
  await Promise.all(senderContexts.map((ctx) => ctx.close()));

  await page.goto("/dashboard");
  const historyRows = page.locator('[data-testid^="history-row-"]');
  // The first page loads asynchronously after navigation -- wait for the
  // real count rather than reading .count() immediately, which races ahead
  // of the fetch.
  await expect(historyRows).toHaveCount(20);

  await page.getByTestId("history-load-older").click();
  await expect(historyRows).toHaveCount(22);

  await expect(page.getByTestId("history-load-older")).toBeDisabled();
});

async function accountSummary(request: APIRequestContext) {
  // Observed occasionally under heavy parallel-worker load against `next
  // dev` (not a real API/app failure -- the same call succeeds reliably in
  // isolation): a plain ECONNRESET on this GET. One retry is enough to ride
  // out that class of transient dev-server connection drop.
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await request.get("/api/accounts/me");
      const { data } = await res.json();
      return data as { walletNumber: string; balancePoisha: string; status: string };
    } catch (error) {
      if (attempt >= 2) throw error;
    }
  }
}

async function lastTransactionId(page: Page): Promise<string> {
  const first = page.locator('[data-testid^="history-row-"]').first();
  const testId = await first.getAttribute("data-testid");
  return testId!.replace("history-row-", "");
}
