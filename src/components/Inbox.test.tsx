import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useStore } from "../store";
import Inbox from "./Inbox";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

beforeEach(() => {
  useStore.setState({
    messages: [],
    selectedSubscriptionId: 1,
    activeTab: "inbox",
  });
});

afterEach(() => {
  cleanup();
});

describe("Inbox", () => {
  it("renders message list with titles", () => {
    useStore.setState({
      messages: [
        {
          id: 1,
          subscription_id: 1,
          title: "Test Message",
          body: "Hello world",
          timestamp: null,
          received_at: "2025-01-01T00:00:00Z",
          is_read: false,
        },
        {
          id: 2,
          subscription_id: 1,
          title: "Another",
          body: null,
          timestamp: null,
          received_at: "2025-01-01T01:00:00Z",
          is_read: true,
        },
      ],
    });
    render(<Inbox />);
    expect(screen.getByText("Test Message")).toBeDefined();
    expect(screen.getByText("Another")).toBeDefined();
  });

  it("shows empty state when no subscription selected", () => {
    useStore.setState({ selectedSubscriptionId: null });
    render(<Inbox />);
    expect(
      screen.getByText("Select a subscription to view messages."),
    ).toBeDefined();
  });

  it("shows empty state for subscription with no messages", () => {
    render(<Inbox />);
    expect(
      screen.getByText("No messages for this subscription."),
    ).toBeDefined();
  });

  it("shows detail panel when a message is selected", () => {
    useStore.setState({
      messages: [
        {
          id: 1,
          subscription_id: 1,
          title: "Test",
          body: "Body text",
          timestamp: null,
          received_at: "2025-01-01T00:00:00Z",
          is_read: false,
        },
      ],
    });
    render(<Inbox />);
    fireEvent.click(screen.getByText("Test"));
    // The detail panel shows a "Delete" button unique to it
    expect(screen.getByText("Delete")).toBeDefined();
  });
});
