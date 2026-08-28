import { expect, test } from "@playwright/test";

test("shows the hackathon starter", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "PSTU National Hackathon 2026" }),
  ).toBeVisible();
});
