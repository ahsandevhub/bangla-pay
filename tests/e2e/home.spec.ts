import { expect, test } from "@playwright/test";

test("shows the BanglaPay landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hero-title")).toBeVisible();
  await expect(page.getByTestId("nav-signup-link")).toBeVisible();
});

test("switches locale between Bangla and English", async ({ page }) => {
  await page.goto("/");
  const heroTitle = page.getByTestId("hero-title");

  await expect(heroTitle).toContainText("সেকেন্ডে");
  await page.getByTestId("locale-toggle-en").click();
  await expect(heroTitle).toContainText("seconds");
  await page.getByTestId("locale-toggle-bn").click();
  await expect(heroTitle).toContainText("সেকেন্ডে");
});

test("toggles between dark and light theme", async ({ page }) => {
  await page.goto("/");
  const root = page.locator(".bp-landing");

  await expect(root).toHaveAttribute("data-theme", "dark");
  await page.getByTestId("theme-toggle").click();
  await expect(root).toHaveAttribute("data-theme", "light");
});
