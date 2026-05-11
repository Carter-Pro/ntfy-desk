import { test, expect } from "@playwright/test";
import { setupMocks, DEFAULT_SUBS, DEFAULT_MSGS } from "./mock-invoke";

test.describe("Inbox message flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, { subscriptions: DEFAULT_SUBS, messages: DEFAULT_MSGS });
    await page.goto("/");
    // Select the first subscription to load messages
    await page.locator("aside button:has-text('test-channel')").click();
  });

  test("shows message list after selecting subscription", async ({ page }) => {
    await expect(page.locator("main")).toContainText("Welcome");
    await expect(page.locator("main")).toContainText("Update");
    await expect(page.locator("main")).toContainText("Alert");
  });

  test("clicking a message shows detail panel with body text", async ({ page }) => {
    await page.locator("button:has-text('Welcome')").click();
    await expect(page.locator("main")).toContainText("First notification");
    // Delete and Mark Read buttons should be visible in detail
    await expect(page.locator("button:has-text('Delete')")).toBeVisible();
  });

  test("deleting a message removes it from list", async ({ page }) => {
    await page.locator("button:has-text('Welcome')").click();
    await page.locator("button:has-text('Delete')").click();
    await expect(page.locator("main")).not.toContainText("Welcome");
  });

  test("shows empty inbox when no subscription selected", async ({ page }) => {
    await setupMocks(page, { subscriptions: DEFAULT_SUBS, messages: [] });
    await page.goto("/");
    await expect(page.locator("main")).toContainText("Select a subscription to view messages.");
  });
});
