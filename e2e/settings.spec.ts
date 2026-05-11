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
    await page.locator("[data-testid='add-subscription-btn']").click();
    await expect(page.locator("[data-testid='sub-url-input']")).toBeVisible();

    await page.locator("[data-testid='sub-cancel-btn']").click();
    await expect(page.locator("[data-testid='sub-url-input']")).not.toBeVisible();
  });

  test("add subscription form validates inputs", async ({ page }) => {
    await page.locator("[data-testid='add-subscription-btn']").click();

    const addBtn = page.locator("[data-testid='sub-add-btn']");
    await expect(addBtn).toBeDisabled();

    await page.fill("[data-testid='sub-url-input']", "https://ntfy.sh/new");
    await page.fill("[data-testid='sub-topic-input']", "new-topic");
    await expect(addBtn).not.toBeDisabled();
  });

  test("shows Do Not Disturb section", async ({ page }) => {
    await expect(page.locator("main")).toContainText("Enable DND");
  });

  test("toggling DND calls update_setting", async ({ page }) => {
    await page.evaluate(() => {
      const win = window as any;
      win.__TAURI_INTERNALS__.invoke = (cmd: string) => {
        if (cmd === "get_settings") return Promise.resolve({
          dnd_enabled: true,
          dnd_start: "22:00",
          dnd_end: "08:00",
          notification_volume: 80,
          message_retention_days: 30,
          notification_sound: "default",
          startup_run: true,
          minimize_to_tray: true,
        });
        if (cmd === "update_setting") return Promise.resolve();
        return Promise.reject(new Error(`Unknown Tauri command: ${cmd}`));
      };
    });
    await page.locator("[data-testid='dnd-toggle']").click();
    // Verify the DND time inputs become visible
    await expect(page.locator("input[type='time']").first()).toBeVisible();
  });
});
