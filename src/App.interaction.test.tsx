import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useStore } from "./store";
import App from "./App";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

beforeEach(() => {
  invokeMock.mockReset();
  // App calls loadSubscriptions, loadSettings, and loadMessages on mount
  invokeMock.mockResolvedValueOnce([]); // list_subscriptions
  invokeMock.mockResolvedValueOnce({    // get_settings
    dnd_enabled: false, dnd_start: "22:00", dnd_end: "08:00",
    notification_volume: 80, message_retention_days: 30,
    notification_sound: "default", startup_run: true, minimize_to_tray: true,
  });
  invokeMock.mockResolvedValueOnce([]); // get_messages (mount-time, no subscription selected)
  invokeMock.mockResolvedValueOnce([]); // get_messages (tab switch back to Inbox)
  useStore.setState({
    subscriptions: [
      { id: 1, url: "https://ntfy.sh/test", topic: "test", is_active: true, created_at: "" },
    ],
    messages: [],
    selectedSubscriptionId: null,
    activeTab: "inbox",
    error: null,
  });
  cleanup();
});

describe("App layout navigation", () => {
  it("renders header with app name", () => {
    render(<App />);
    expect(screen.getByText("ntfy desk")).toBeDefined();
  });

  it("renders sidebar with subscription list", () => {
    render(<App />);
    expect(screen.getByText("test")).toBeDefined();
    expect(screen.getByText("https://ntfy.sh/test")).toBeDefined();
  });

  it("switches to Settings tab and back to Inbox via sidebar nav", () => {
    render(<App />);
    // Default: Inbox tab
    expect(screen.getByText("Select a subscription to view messages.")).toBeDefined();

    // Click Settings nav button
    const settingsBtns = screen.getAllByText("Settings");
    fireEvent.click(settingsBtns[0]); // sidebar nav
    expect(screen.getByText("Do Not Disturb")).toBeDefined();

    // Click Inbox nav button
    const inboxBtns = screen.getAllByText("Inbox");
    fireEvent.click(inboxBtns[0]);
    expect(screen.getByText("Select a subscription to view messages.")).toBeDefined();
  });

  it("shows error banner when store has error", () => {
    render(<App />);
    act(() => { useStore.setState({ error: "Something went wrong" }); });
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("renders empty subscription sidebar state", () => {
    useStore.setState({ subscriptions: [] });
    render(<App />);
    expect(screen.getByText("No subscriptions yet. Add one in Settings.")).toBeDefined();
  });

  it("selecting a subscription triggers loadMessages", () => {
    const msgs = [
      { id: 1, subscription_id: 1, title: "Hello", body: null, timestamp: null, received_at: "", is_read: false },
    ];
    invokeMock.mockResolvedValueOnce(msgs); // for loadMessages triggered by select
    render(<App />);
    fireEvent.click(screen.getByText("test"));
    expect(invokeMock).toHaveBeenCalledWith("get_messages", { subscriptionId: 1 });
  });
});
