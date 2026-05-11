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
    const greenDots = page.locator("[data-testid='connection-dot-online']");
    const redDots = page.locator("[data-testid='connection-dot-offline']");
    await expect(greenDots.first()).toBeVisible();
    await expect(redDots.first()).toBeVisible();
  });

  test("switches between Inbox and Settings tabs", async ({ page }) => {
    // Default: Inbox tab
    await expect(page.locator("main")).toContainText("Select a subscription to view messages.");

    // Click Settings in sidebar
    await page.locator("[data-testid='nav-settings']").click();
    await expect(page.locator("main")).toContainText("Do Not Disturb");

    // Click back to Inbox
    await page.locator("[data-testid='nav-inbox']").click();
    await expect(page.locator("main")).toContainText("Select a subscription to view messages.");
  });

  test("shows empty sidebar state when no subscriptions", async ({ page }) => {
    await page.evaluate(() => {
      const win = window as any;
      win.__TAURI_INTERNALS__.invoke = (cmd: string) => {
        if (cmd === "list_subscriptions") return Promise.resolve([]);
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
      win.__store.getState().loadSubscriptions();
    });
    await expect(page.locator("aside")).toContainText("No subscriptions yet");
  });
});
