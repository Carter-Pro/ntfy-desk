import { describe, it, expect } from "vitest";
import { useStore } from "./index";

describe("useStore", () => {
  it("has correct default state", () => {
    const state = useStore.getState();
    expect(state.subscriptions).toEqual([]);
    expect(state.messages).toEqual([]);
    expect(state.settings).toEqual({
      dnd_enabled: false,
      dnd_start: "22:00",
      dnd_end: "08:00",
      notification_volume: 80,
      message_retention_days: 30,
      startup_run: true,
      minimize_to_tray: true,
    });
    expect(state.selectedSubscriptionId).toBeNull();
    expect(state.activeTab).toBe("inbox");
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("has expected action functions", () => {
    const state = useStore.getState();
    expect(typeof state.loadSubscriptions).toBe("function");
    expect(typeof state.addSubscription).toBe("function");
    expect(typeof state.removeSubscription).toBe("function");
    expect(typeof state.loadMessages).toBe("function");
    expect(typeof state.markRead).toBe("function");
    expect(typeof state.deleteMessage).toBe("function");
    expect(typeof state.loadSettings).toBe("function");
    expect(typeof state.updateSetting).toBe("function");
    expect(typeof state.selectSubscription).toBe("function");
    expect(typeof state.setActiveTab).toBe("function");
  });

  it("selectSubscription updates selectedSubscriptionId", () => {
    useStore.getState().selectSubscription(42);
    expect(useStore.getState().selectedSubscriptionId).toBe(42);
    useStore.getState().selectSubscription(null);
    expect(useStore.getState().selectedSubscriptionId).toBeNull();
  });

  it("setActiveTab switches tabs", () => {
    useStore.getState().setActiveTab("settings");
    expect(useStore.getState().activeTab).toBe("settings");
    useStore.getState().setActiveTab("inbox");
    expect(useStore.getState().activeTab).toBe("inbox");
  });

  it("deleteMessage optimistically removes from local state", () => {
    useStore.setState({
      messages: [
        { id: 1, subscription_id: 1, title: "t1", body: null, timestamp: null, received_at: "", is_read: false },
        { id: 2, subscription_id: 1, title: "t2", body: null, timestamp: null, received_at: "", is_read: false },
      ],
    });
    useStore.getState().deleteMessage(1);
    expect(useStore.getState().messages).toHaveLength(1);
    expect(useStore.getState().messages[0].id).toBe(2);
  });
});
