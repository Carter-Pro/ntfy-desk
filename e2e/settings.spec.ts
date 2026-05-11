import { test, expect } from "@playwright/test";
import { setupMocks, DEFAULT_SUBS } from "./mock-invoke";

test.describe("Settings interaction", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, { subscriptions: DEFAULT_SUBS });
    await page.goto("/");
    await page.locator("aside button:has-text('Settings')").click();
  });

  test("renders subscription list in settings", async ({ page }) => {
    await expect(page.locator("main")).toContainText("test-channel");
    await expect(page.locator("main")).toContainText("alerts");
  });

  test("add subscription dialog opens and closes", async ({ page }) => {
    await page.locator("button:has-text('Add Subscription')").click();
    await expect(page.locator("input[placeholder*='ntfy server URL']")).toBeVisible();

    await page.locator("button:has-text('Cancel')").click();
    await expect(page.locator("input[placeholder*='ntfy server URL']")).not.toBeVisible();
  });

  test("add subscription form validates inputs", async ({ page }) => {
    await page.locator("button:has-text('Add Subscription')").click();

    const addBtn = page.getByRole("button", { name: "Add", exact: true });
    await expect(addBtn).toBeDisabled();

    await page.fill("input[placeholder*='ntfy server URL']", "https://ntfy.sh/new");
    await page.fill("input[placeholder='Topic name']", "new-topic");
    await expect(addBtn).not.toBeDisabled();
  });

  test("shows Do Not Disturb section", async ({ page }) => {
    await expect(page.locator("main")).toContainText("Enable DND");
  });
});
