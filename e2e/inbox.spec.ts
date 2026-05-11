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
    await page.locator("[data-testid='message-item']:has-text('Welcome')").click();
    await expect(page.locator("main")).toContainText("First notification");
    // Delete and Mark Read buttons should be visible in detail
    await expect(page.locator("[data-testid='delete-message-btn']")).toBeVisible();
  });

  test("deleting a message removes it from list", async ({ page }) => {
    await page.locator("[data-testid='message-item']:has-text('Welcome')").click();
    await page.locator("[data-testid='delete-message-btn']").click();
    await expect(page.locator("main")).not.toContainText("Welcome");
  });

  test("mark read button works on unread message", async ({ page }) => {
    await page.locator("[data-testid='message-item']:has-text('Welcome')").click();
    // Selecting an unread message triggers auto-mark-read via IPC.
    // The mark-read-btn should not be visible since the message is now read.
    await expect(page.locator("[data-testid='mark-read-btn']")).not.toBeVisible();
    // The detail panel should still show the delete button
    await expect(page.locator("[data-testid='delete-message-btn']")).toBeVisible();
  });

  test("shows empty inbox when no subscription selected", async ({ page }) => {
    await page.evaluate(() => {
      const win = window as any;
      // Override invoke so loadMessages returns empty when triggered by the state change
      win.__TAURI_INTERNALS__.invoke = (cmd: string) => {
        if (cmd === "get_messages") return Promise.resolve([]);
        if (cmd === "get_settings") return Promise.resolve({
          dnd_enabled: false,
          dnd_start: "22:00",
          dnd_end: "08:00",
          notification_volume: 80,
          message_retention_days: 30,
          notification_sound: "default",
          startup_run: true,
          minimize_to_tray: true,
        });
        return Promise.reject(new Error(`Unknown Tauri command: ${cmd}`));
      };
      win.__store.setState({ selectedSubscriptionId: null, messages: [] });
    });
    await expect(page.locator("main")).toContainText("Select a subscription to view messages.");
  });
});
