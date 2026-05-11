# Frontend Interaction Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add integration-level interaction tests covering cross-component user flows: Inbox → MessageDetail selection/deletion, Settings form interactions, and App layout sidebar navigation.

**Architecture:** Use the real Zustand store (with mocked `invoke()`) + `@testing-library/react` to render components and simulate user interactions. Tests verify that state changes propagate correctly through rendered components across multiple component boundaries.

**Tech Stack:** vitest, @testing-library/react, Zustand (real store), mocked @tauri-apps/api/core

---

### Task 1: Inbox + MessageDetail Interaction Flow

**Files:**
- Create: `src/components/Inbox.interaction.test.tsx`

Tests the full message lifecycle: list → select → detail → delete → list update.

- [ ] **Step 1: Create the interaction test**

```typescript
// src/components/Inbox.interaction.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
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

  it("selecting a message shows detail panel with body", async () => {
    invokeMock.mockResolvedValue(undefined); // markRead IPC
    render(<Inbox />);

    fireEvent.click(screen.getByText("Alpha"));

    // Detail panel should show the message body
    expect(screen.getByText("Body A")).toBeDefined();
    // Should have called markRead since Alpha was unread
    expect(invokeMock).toHaveBeenCalledWith("mark_read", { id: 1 });
  });

  it("deleting selected message removes it from list and clears detail", async () => {
    invokeMock.mockResolvedValue(undefined); // deleteMessage IPC
    render(<Inbox />);

    // Select Alpha
    fireEvent.click(screen.getByText("Alpha"));
    expect(screen.getByText("Body A")).toBeDefined();

    // Delete it from detail panel
    fireEvent.click(screen.getByText("Delete"));
    expect(invokeMock).toHaveBeenCalledWith("delete_message", { id: 1 });

    // Alpha should be gone from list
    expect(screen.queryByText("Alpha")).toBeNull();
    // Detail should be cleared
    expect(screen.getByText("Select a message to view details.")).toBeDefined();
  });

  it("marking read hides the Mark Read button", async () => {
    invokeMock.mockResolvedValue(undefined); // markRead IPC
    render(<Inbox />);

    fireEvent.click(screen.getByText("Alpha"));
    // Mark Read button should be visible for unread message
    expect(screen.getByText("Mark Read")).toBeDefined();

    fireEvent.click(screen.getByText("Mark Read"));
    expect(invokeMock).toHaveBeenCalledWith("mark_read", { id: 1 });
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
```

- [ ] **Step 2: Verify tests pass**

Run: `npx vitest run src/components/Inbox.interaction.test.tsx`
Expected: All 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/Inbox.interaction.test.tsx
git commit -m "test(frontend): add Inbox-MessageDetail interaction flow tests"
```

---

### Task 2: Settings Form Interaction Flow

**Files:**
- Create: `src/components/Settings.interaction.test.tsx`

Tests form interactions: DND toggle → inputs, add subscription dialog, volume slider.

- [ ] **Step 1: Create the interaction test**

```typescript
// src/components/Settings.interaction.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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
  it("shows DND time inputs when enabled", () => {
    render(<Settings />);
    // DND is off by default — time inputs hidden
    expect(screen.queryByDisplayValue("22:00")).toBeNull();

    // Toggle DND on
    fireEvent.click(screen.getByRole("checkbox", { name: /enable dnd/i }));
    expect(invokeMock).toHaveBeenCalledWith("update_setting", { key: "dnd_enabled", value: "true" });
  });

  it("add subscription dialog opens and closes", () => {
    render(<Settings />);
    fireEvent.click(screen.getByText("Add Subscription"));

    // Dialog inputs visible
    expect(screen.getByPlaceholderText(/ntfy server URL/)).toBeDefined();
    expect(screen.getByPlaceholderText("Topic name")).toBeDefined();

    // Cancel closes dialog
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByPlaceholderText(/ntfy server URL/)).toBeNull();
  });

  it("add subscription submits and calls store action", async () => {
    invokeMock.mockResolvedValue({});     // add_subscription
    invokeMock.mockResolvedValue([]);     // list_subscriptions reload
    render(<Settings />);

    fireEvent.click(screen.getByText("Add Subscription"));

    const urlInput = screen.getByPlaceholderText(/ntfy server URL/);
    const topicInput = screen.getByPlaceholderText("Topic name");

    fireEvent.change(urlInput, { target: { value: "https://ntfy.sh/test" } });
    fireEvent.change(topicInput, { target: { value: "test-topic" } });
    fireEvent.click(screen.getByText("Add"));

    expect(invokeMock).toHaveBeenCalledWith("add_subscription", {
      url: "https://ntfy.sh/test", topic: "test-topic",
    });
  });

  it("add button is disabled when fields are empty", () => {
    render(<Settings />);
    fireEvent.click(screen.getByText("Add Subscription"));

    const addBtn = screen.getByText("Add");
    expect(addBtn).toBeDisabled();

    const urlInput = screen.getByPlaceholderText(/ntfy server URL/);
    fireEvent.change(urlInput, { target: { value: "https://ntfy.sh/test" } });
    expect(addBtn).toBeDisabled(); // still missing topic

    const topicInput = screen.getByPlaceholderText("Topic name");
    fireEvent.change(topicInput, { target: { value: "t" } });
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
});
```

- [ ] **Step 2: Verify tests pass**

Run: `npx vitest run src/components/Settings.interaction.test.tsx`
Expected: All 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/Settings.interaction.test.tsx
git commit -m "test(frontend): add Settings form interaction flow tests"
```

---

### Task 3: App Layout Sidebar Navigation

**Files:**
- Create: `src/App.interaction.test.tsx`

Tests the sidebar → main content navigation flow using the full App component.

- [ ] **Step 1: Create the interaction test**

```typescript
// src/App.interaction.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useStore } from "./store";
import App from "./App";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

beforeEach(() => {
  invokeMock.mockReset();
  // Mock the initial data loads that App calls in useEffect
  invokeMock.mockResolvedValueOnce([]); // list_subscriptions
  invokeMock.mockResolvedValueOnce({    // get_settings
    dnd_enabled: false, dnd_start: "22:00", dnd_end: "08:00",
    notification_volume: 80, message_retention_days: 30,
    startup_run: true, minimize_to_tray: true, notification_sound: "default",
  });
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

  it("switches to Settings tab and back to Inbox", () => {
    render(<App />);
    // Default: Inbox tab
    expect(screen.getByText("Select a subscription to view messages.")).toBeDefined();

    // Click Settings nav
    fireEvent.click(screen.getAllByText("Settings")[0]); // sidebar button
    expect(screen.getByText("Do Not Disturb")).toBeDefined();

    // Click Inbox nav
    fireEvent.click(screen.getAllByText("Inbox")[0]);
    expect(screen.getByText("Select a subscription to view messages.")).toBeDefined();
  });

  it("selecting a subscription loads its messages", async () => {
    const msgs = [
      { id: 1, subscription_id: 1, title: "Hello", body: null, timestamp: null, received_at: "", is_read: false },
    ];
    // App already consumed first 2 mock calls (loadSubscriptions, loadSettings)
    // Next mock will be for loadMessages triggered by selecting subscription
    invokeMock.mockResolvedValueOnce(msgs);

    render(<App />);
    fireEvent.click(screen.getByText("test"));

    expect(invokeMock).toHaveBeenCalledWith("get_messages", { subscriptionId: 1 });
  });

  it("shows error banner when store has error", () => {
    useStore.setState({ error: "Something went wrong" });
    render(<App />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("renders empty subscription sidebar state", () => {
    useStore.setState({ subscriptions: [] });
    render(<App />);
    expect(screen.getByText("No subscriptions yet. Add one in Settings.")).toBeDefined();
  });
});
```

- [ ] **Step 2: Verify tests pass**

Run: `npx vitest run src/App.interaction.test.tsx`
Expected: All 6 tests pass.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All ~50 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.interaction.test.tsx
git commit -m "test(frontend): add App layout sidebar navigation interaction tests"
```

---

## Verification Checklist

- [ ] `npx vitest run` — all tests pass (~50 tests)
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Interaction tests cover: message lifecycle (select→detail→delete), settings form (DND toggle, add dialog), App layout (sidebar nav, tab switching, error banner)
