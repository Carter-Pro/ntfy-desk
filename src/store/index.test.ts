import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStore } from "./index";
import type { Subscription, Message, AppSettings } from "../types";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

const TEST_SETTINGS: AppSettings = {
  dnd_enabled: false, dnd_start: "22:00", dnd_end: "08:00",
  notification_volume: 80, message_retention_days: 30,
  startup_run: true, minimize_to_tray: true, notification_sound: "default",
};

beforeEach(() => {
  invokeMock.mockReset();
  useStore.setState({
    subscriptions: [],
    messages: [],
    settings: { ...TEST_SETTINGS },
    selectedSubscriptionId: null,
    activeTab: "inbox",
    error: null,
  });
});

// ── Default state ──

describe("default state", () => {
  it("has correct initial values", () => {
    const s = useStore.getState();
    expect(s.subscriptions).toEqual([]);
    expect(s.messages).toEqual([]);
    expect(s.selectedSubscriptionId).toBeNull();
    expect(s.activeTab).toBe("inbox");
    expect(s.error).toBeNull();
  });

  it("selectSubscription and setActiveTab work synchronously", () => {
    useStore.getState().selectSubscription(42);
    expect(useStore.getState().selectedSubscriptionId).toBe(42);
    useStore.getState().setActiveTab("settings");
    expect(useStore.getState().activeTab).toBe("settings");
  });
});

// ── loadSubscriptions ──

describe("loadSubscriptions", () => {
  it("fetches and stores subscriptions on success", async () => {
    const subs: Subscription[] = [
      { id: 1, url: "https://ntfy.sh/a", topic: "a", is_active: true, created_at: "" },
      { id: 2, url: "https://ntfy.sh/b", topic: "b", is_active: false, created_at: "" },
    ];
    invokeMock.mockResolvedValueOnce(subs);
    await useStore.getState().loadSubscriptions();
    expect(invokeMock).toHaveBeenCalledWith("list_subscriptions");
    expect(useStore.getState().subscriptions).toEqual(subs);
    expect(useStore.getState().error).toBeNull();
  });

  it("sets error on failure", async () => {
    invokeMock.mockRejectedValueOnce(new Error("network error"));
    await useStore.getState().loadSubscriptions();
    expect(useStore.getState().error).toBe("Error: network error");
  });
});

// ── loadMessages ──

describe("loadMessages", () => {
  it("fetches messages for selected subscription", async () => {
    const msgs: Message[] = [
      { id: 1, subscription_id: 5, title: "t", body: null, timestamp: null, received_at: "", is_read: false },
    ];
    useStore.setState({ selectedSubscriptionId: 5 });
    invokeMock.mockResolvedValueOnce(msgs);
    await useStore.getState().loadMessages();
    expect(invokeMock).toHaveBeenCalledWith("get_messages", { subscriptionId: 5 });
    expect(useStore.getState().messages).toEqual(msgs);
  });

  it("fetches all messages when no subscription selected", async () => {
    invokeMock.mockResolvedValueOnce([]);
    await useStore.getState().loadMessages();
    expect(invokeMock).toHaveBeenCalledWith("get_messages", {});
  });

  it("sets error on failure", async () => {
    invokeMock.mockRejectedValueOnce(new Error("db error"));
    await useStore.getState().loadMessages();
    expect(useStore.getState().error).toBe("Error: db error");
  });
});

// ── loadSettings ──

describe("loadSettings", () => {
  it("fetches and stores settings", async () => {
    const settings: AppSettings = {
      dnd_enabled: true, dnd_start: "21:00", dnd_end: "07:00",
      notification_volume: 50, message_retention_days: 7,
      startup_run: false, minimize_to_tray: false, notification_sound: "chime",
    };
    invokeMock.mockResolvedValueOnce(settings);
    await useStore.getState().loadSettings();
    expect(invokeMock).toHaveBeenCalledWith("get_settings");
    expect(useStore.getState().settings).toEqual(settings);
  });
});

// ── addSubscription ──

describe("addSubscription", () => {
  it("adds subscription then reloads list", async () => {
    const existing: Subscription[] = [
      { id: 1, url: "https://ntfy.sh/old", topic: "old", is_active: true, created_at: "" },
    ];
    useStore.setState({ subscriptions: existing });
    invokeMock.mockResolvedValueOnce({}); // add_subscription
    const updated: Subscription[] = [
      ...existing,
      { id: 2, url: "https://ntfy.sh/new", topic: "new", is_active: true, created_at: "" },
    ];
    invokeMock.mockResolvedValueOnce(updated); // list_subscriptions reload
    await useStore.getState().addSubscription("https://ntfy.sh/new", "new");
    expect(invokeMock).toHaveBeenNthCalledWith(1, "add_subscription", { url: "https://ntfy.sh/new", topic: "new" });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "list_subscriptions");
    expect(useStore.getState().subscriptions).toEqual(updated);
  });

  it("sets error on failure", async () => {
    invokeMock.mockRejectedValueOnce(new Error("duplicate URL"));
    await useStore.getState().addSubscription("url", "topic");
    expect(useStore.getState().error).toBe("Error: duplicate URL");
  });
});
