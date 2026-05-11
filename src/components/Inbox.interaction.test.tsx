import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useStore } from "../store";
import Inbox from "./Inbox";
import type { Message } from "../types";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

function seedMessages(): Message[] {
  return [
    { id: 1, subscription_id: 1, title: "Alpha", body: "Body A", timestamp: null, received_at: "2025-01-01T00:00:00Z", is_read: false },
    { id: 2, subscription_id: 1, title: "Beta", body: "Body B", timestamp: null, received_at: "2025-01-01T01:00:00Z", is_read: true },
    { id: 3, subscription_id: 1, title: "Gamma", body: "Body C", timestamp: null, received_at: "2025-01-01T02:00:00Z", is_read: false },
  ];
}

beforeEach(() => {
  invokeMock.mockReset();
  useStore.setState({
    subscriptions: [{ id: 1, url: "https://ntfy.sh/test", topic: "test", is_active: true, created_at: "" }],
    messages: seedMessages(),
    selectedSubscriptionId: 1,
    activeTab: "inbox",
    error: null,
  });
  cleanup();
});

describe("Inbox interaction flow", () => {
  it("renders message list from store", () => {
    render(<Inbox />);
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByText("Beta")).toBeDefined();
    expect(screen.getByText("Gamma")).toBeDefined();
  });

  it("selecting an unread message shows detail and calls markRead", () => {
    invokeMock.mockResolvedValue(undefined);
    render(<Inbox />);
    fireEvent.click(screen.getByText("Alpha"));
    // "Received:" appears only in the detail panel, not in the list preview
    expect(screen.getByText(/^Received:/)).toBeDefined();
    expect(invokeMock).toHaveBeenCalledWith("mark_read", { id: 1 });
  });

  it("selecting a read message shows detail without calling markRead", () => {
    render(<Inbox />);
    fireEvent.click(screen.getByText("Beta"));
    expect(screen.getByText(/^Received:/)).toBeDefined();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("deleting selected message removes it from list and clears detail", () => {
    invokeMock.mockResolvedValue(undefined);
    render(<Inbox />);
    fireEvent.click(screen.getByText("Alpha"));
    expect(screen.getByText(/^Received:/)).toBeDefined();
    fireEvent.click(screen.getByText("Delete"));
    expect(invokeMock).toHaveBeenCalledWith("delete_message", { id: 1 });
    expect(screen.queryByText("Alpha")).toBeNull();
    expect(screen.getByText("Select a message to view details.")).toBeDefined();
  });

  it("shows empty state when no subscription selected", () => {
    useStore.setState({ selectedSubscriptionId: null, messages: [] });
    render(<Inbox />);
    expect(screen.getByText("Select a subscription to view messages.")).toBeDefined();
  });

  it("shows empty state when subscription has no messages", () => {
    useStore.setState({ messages: [], selectedSubscriptionId: 1 });
    render(<Inbox />);
    expect(screen.getByText("No messages for this subscription.")).toBeDefined();
  });
});
