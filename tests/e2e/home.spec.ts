import { expect, test } from "@playwright/test";

test("shows the BanglaPay landing card", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "BanglaPay (বাংলা-পে)" }),
  ).toBeVisible();
});
