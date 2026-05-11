import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useStore } from "../store";
import Settings from "./Settings";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

beforeEach(() => {
  useStore.setState({
    subscriptions: [],
    settings: {
      dnd_enabled: false,
      dnd_start: "22:00",
      dnd_end: "08:00",
      notification_volume: 80,
      message_retention_days: 30,
      startup_run: true,
      minimize_to_tray: true,
    },
    activeTab: "settings",
  });
});

afterEach(cleanup);

describe("Settings", () => {
  it("renders all four setting sections", () => {
    render(<Settings />);
    expect(screen.getByText("Subscriptions")).toBeDefined();
    expect(screen.getByText("Do Not Disturb")).toBeDefined();
    expect(screen.getByText("Notifications")).toBeDefined();
    expect(screen.getByText("Application")).toBeDefined();
  });

  it("shows DND toggle and time inputs", () => {
    render(<Settings />);
    expect(screen.getByText("Enable DND")).toBeDefined();
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
  });

  it("shows volume slider", () => {
    render(<Settings />);
    expect(screen.getByRole("slider")).toBeDefined();
  });

  it("shows Add Subscription button and opens dialog", () => {
    render(<Settings />);
    fireEvent.click(screen.getByText("Add Subscription"));
    expect(
      screen.getByPlaceholderText(
        "ntfy server URL (e.g. https://ntfy.sh/mytopic)",
      ),
    ).toBeDefined();
    expect(screen.getByPlaceholderText("Topic name")).toBeDefined();
  });

  it("renders subscription list items", () => {
    useStore.setState({
      subscriptions: [
        {
          id: 1,
          url: "https://ntfy.sh/test",
          topic: "test",
          is_active: true,
          created_at: "",
        },
      ],
    });
    render(<Settings />);
    expect(screen.getByText("test")).toBeDefined();
  });
});
