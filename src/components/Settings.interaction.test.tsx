import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useStore } from "../store";
import Settings from "./Settings";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

beforeEach(() => {
  invokeMock.mockReset();
  useStore.setState({
    subscriptions: [],
    settings: {
      dnd_enabled: false, dnd_start: "22:00", dnd_end: "08:00",
      notification_volume: 80, message_retention_days: 30,
      startup_run: true, minimize_to_tray: true, notification_sound: "default",
    },
    error: null,
  });
  cleanup();
});

describe("Settings interaction flow", () => {
  it("add subscription dialog opens and closes with Cancel", () => {
    render(<Settings />);
    fireEvent.click(screen.getByText("Add Subscription"));
    expect(screen.getByPlaceholderText(/ntfy server URL/)).toBeDefined();
    expect(screen.getByPlaceholderText("Topic name")).toBeDefined();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByPlaceholderText(/ntfy server URL/)).toBeNull();
  });

  it("add subscription submits and calls addSubscription", async () => {
    invokeMock.mockResolvedValue({});  // add_subscription
    invokeMock.mockResolvedValue([]);  // list_subscriptions reload
    render(<Settings />);

    fireEvent.click(screen.getByText("Add Subscription"));
    fireEvent.change(screen.getByPlaceholderText(/ntfy server URL/), { target: { value: "https://ntfy.sh/test" } });
    fireEvent.change(screen.getByPlaceholderText("Topic name"), { target: { value: "test-topic" } });
    fireEvent.click(screen.getByText("Add"));

    expect(invokeMock).toHaveBeenCalledWith("add_subscription", {
      url: "https://ntfy.sh/test", topic: "test-topic",
    });
  });

  it("add button is disabled when URL is empty", () => {
    render(<Settings />);
    fireEvent.click(screen.getByText("Add Subscription"));
    const addBtn = screen.getByText("Add").closest("button")!;
    expect(addBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Topic name"), { target: { value: "t" } });
    expect(addBtn).toBeDisabled(); // URL still empty

    fireEvent.change(screen.getByPlaceholderText(/ntfy server URL/), { target: { value: "https://ntfy.sh/test" } });
    expect(addBtn).not.toBeDisabled();
  });

  it("renders subscription list with delete buttons", () => {
    useStore.setState({
      subscriptions: [
        { id: 1, url: "https://ntfy.sh/a", topic: "alpha", is_active: true, created_at: "" },
        { id: 2, url: "https://ntfy.sh/b", topic: "beta", is_active: false, created_at: "" },
      ],
    });
    render(<Settings />);
    expect(screen.getByText("alpha")).toBeDefined();
    expect(screen.getByText("beta")).toBeDefined();
  });

  it("shows 'No subscriptions configured' when list is empty", () => {
    render(<Settings />);
    expect(screen.getByText("No subscriptions configured.")).toBeDefined();
  });
});
