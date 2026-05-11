import type { Page } from "@playwright/test";

export interface MockData {
  subscriptions?: object[];
  messages?: object[];
  settings?: object;
}

const DEFAULT_SETTINGS = {
  dnd_enabled: false,
  dnd_start: "22:00",
  dnd_end: "08:00",
  notification_volume: 80,
  message_retention_days: 30,
  notification_sound: "default",
  startup_run: true,
  minimize_to_tray: true,
};

export async function setupMocks(page: Page, data: MockData = {}) {
  const { subscriptions = [], messages = [], settings = DEFAULT_SETTINGS } = data;

  await page.addInitScript(
    ({ subs, msgs, sets }) => {
      const mockInvoke = (cmd: string, args?: Record<string, unknown>) => {
        switch (cmd) {
          case "list_subscriptions":
            return Promise.resolve(subs);
          case "get_messages":
            return Promise.resolve(msgs);
          case "get_settings":
            return Promise.resolve(sets);
          case "add_subscription":
            return Promise.resolve({ id: 999, url: args?.url, topic: args?.topic, is_active: true, created_at: new Date().toISOString() });
          case "remove_subscription":
            return Promise.resolve();
          case "mark_read":
            return Promise.resolve();
          case "delete_message":
            return Promise.resolve();
          case "update_setting":
            return Promise.resolve();
          default:
            return Promise.reject(new Error(`Unknown Tauri command: ${cmd}`));
        }
      };
      // @ts-ignore
      window.__TAURI_INTERNALS__ = {
        invoke: mockInvoke,
        convertFileSrc: () => "",
        transformCallback: () => 0,
      };
    },
    { subs: subscriptions, msgs: messages, sets: settings }
  );
}

export const DEFAULT_SUBS = [
  {
    id: 1,
    url: "https://ntfy.sh/test",
    topic: "test-channel",
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 2,
    url: "https://ntfy.sh/alerts",
    topic: "alerts",
    is_active: false,
    created_at: "2025-01-01T00:00:00Z",
  },
];

export const DEFAULT_MSGS = [
  {
    id: 1,
    subscription_id: 1,
    title: "Welcome",
    body: "First notification",
    timestamp: "2025-01-01T12:00:00Z",
    received_at: "2025-01-01T12:00:00Z",
    is_read: false,
  },
  {
    id: 2,
    subscription_id: 1,
    title: "Update",
    body: "System updated",
    timestamp: "2025-01-01T13:00:00Z",
    received_at: "2025-01-01T13:00:00Z",
    is_read: true,
  },
  {
    id: 3,
    subscription_id: 1,
    title: "Alert",
    body: "Disk space low",
    timestamp: "2025-01-01T14:00:00Z",
    received_at: "2025-01-01T14:00:00Z",
    is_read: false,
  },
];
