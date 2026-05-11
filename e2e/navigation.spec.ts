import { test, expect } from "@playwright/test";
import { setupMocks, DEFAULT_SUBS } from "./mock-invoke";

test.describe("App navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, { subscriptions: DEFAULT_SUBS });
    await page.goto("/");
  });

  test("renders header with app name", async ({ page }) => {
    await expect(page.locator("header")).toContainText("ntfy desk");
  });

  test("renders sidebar with subscriptions", async ({ page }) => {
    await expect(page.locator("aside")).toContainText("test-channel");
    await expect(page.locator("aside")).toContainText("alerts");
    // Check connection dots
    const greenDots = page.locator("aside .bg-\\[\\#107c10\\]");
    const redDots = page.locator("aside .bg-\\[\\#c50f1f\\]");
    await expect(greenDots.first()).toBeVisible();
    await expect(redDots.first()).toBeVisible();
  });

  test("switches between Inbox and Settings tabs", async ({ page }) => {
    // Default: Inbox tab
    await expect(page.locator("main")).toContainText("Select a subscription to view messages.");

    // Click Settings in sidebar
    await page.locator("aside button:has-text('Settings')").click();
    await expect(page.locator("main")).toContainText("Do Not Disturb");

    // Click back to Inbox
    await page.locator("aside button:has-text('Inbox')").click();
    await expect(page.locator("main")).toContainText("Select a subscription to view messages.");
  });

  test("shows empty sidebar state when no subscriptions", async ({ page }) => {
    await setupMocks(page, { subscriptions: [] });
    await page.goto("/");
    await expect(page.locator("aside")).toContainText("No subscriptions yet");
  });
});
