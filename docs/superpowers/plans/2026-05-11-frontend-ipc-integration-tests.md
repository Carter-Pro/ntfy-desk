# Frontend IPC Integration Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add integration tests for the Zustand store covering all 8 IPC actions with mocked `invoke()` — happy paths, error handling, and optimistic update rollbacks.

**Architecture:** Mock `@tauri-apps/api/core` with `vi.mock`, replacing `invoke()` with a controllable mock. Each test sets up mock return values, calls store actions, then asserts state changes. Existing 5 unit tests in `index.test.ts` are preserved.

**Tech Stack:** vitest, Zustand, @tauri-apps/api/core (mocked)

---

### Task 1: IPC Integration Tests — Core Actions

**Files:**
- Modify: `src/store/index.test.ts`

Mock `invoke()` at the module level. Test the 4 core read/write actions: `loadSubscriptions`, `loadMessages`, `loadSettings`, `addSubscription`.

- [ ] **Step 1: Rewrite test file with invoke mock**

```typescript
// src/store/index.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStore } from "./index";
import type { Subscription, Message, AppSettings } from "../types";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

beforeEach(() => {
  invokeMock.mockReset();
  useStore.setState({
    subscriptions: [],
    messages: [],
    settings: {
      dnd_enabled: false,
      dnd_start: "22:00",
      dnd_end: "08:00",
      notification_volume: 80,
      message_retention_days: 30,
      startup_run: true,
      minimize_to_tray: true,
      notification_sound: "default",
    },
    selectedSubscriptionId: null,
    activeTab: "inbox",
    error: null,
  });
});

// ── Existing tests (keep, adjust for mock) ──

describe("default state", () => {
  it("has correct initial values", () => {
    const state = useStore.getState();
    expect(state.subscriptions).toEqual([]);
    expect(state.messages).toEqual([]);
    expect(state.selectedSubscriptionId).toBeNull();
    expect(state.activeTab).toBe("inbox");
    expect(state.error).toBeNull();
  });

  it("selectSubscription and setActiveTab work synchronously", () => {
    useStore.getState().selectSubscription(42);
    expect(useStore.getState().selectedSubscriptionId).toBe(42);
    useStore.getState().setActiveTab("settings");
    expect(useStore.getState().activeTab).toBe("settings");
  });
});

// ── IPC integration tests ──

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

    expect(useStore.getState().subscriptions).toEqual([]);
    expect(useStore.getState().error).toBe("Error: network error");
  });
});

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

describe("addSubscription", () => {
  it("adds subscription then reloads list", async () => {
    const existing: Subscription[] = [
      { id: 1, url: "https://ntfy.sh/old", topic: "old", is_active: true, created_at: "" },
    ];
    useStore.setState({ subscriptions: existing });
    // First call: add_subscription
    invokeMock.mockResolvedValueOnce({});
    // Second call: list_subscriptions (from reload)
    const updated: Subscription[] = [
      ...existing,
      { id: 2, url: "https://ntfy.sh/new", topic: "new", is_active: true, created_at: "" },
    ];
    invokeMock.mockResolvedValueOnce(updated);

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
```

- [ ] **Step 2: Verify tests pass**

Run: `npx vitest run src/store/index.test.ts`
Expected: All tests pass (both existing and new IPC tests).

- [ ] **Step 3: Commit**

```bash
git add src/store/index.test.ts
git commit -m "test(frontend): add IPC integration tests for core store actions"
```

---

### Task 2: IPC Integration Tests — Mutations & Optimistic Updates

**Files:**
- Modify: `src/store/index.test.ts` (append)

Test: `removeSubscription`, `deleteMessage`, `markRead`, `updateSetting`.

- [ ] **Step 1: Append tests to index.test.ts**

```typescript
describe("removeSubscription", () => {
  it("removes from list and clears messages if selected", async () => {
    const subs: Subscription[] = [
      { id: 1, url: "a", topic: "a", is_active: true, created_at: "" },
      { id: 2, url: "b", topic: "b", is_active: true, created_at: "" },
    ];
    useStore.setState({ subscriptions: subs, selectedSubscriptionId: 1, messages: [{ id: 1, subscription_id: 1, title: "x", body: null, timestamp: null, received_at: "", is_read: false }] });
    invokeMock.mockResolvedValueOnce(undefined);

    await useStore.getState().removeSubscription(1);

    expect(invokeMock).toHaveBeenCalledWith("remove_subscription", { id: 1 });
    expect(useStore.getState().subscriptions).toHaveLength(1);
    expect(useStore.getState().subscriptions[0].id).toBe(2);
    expect(useStore.getState().selectedSubscriptionId).toBeNull();
    expect(useStore.getState().messages).toEqual([]);
  });

  it("keeps state unchanged if removing non-selected subscription", async () => {
    useStore.setState({
      subscriptions: [{ id: 1, url: "a", topic: "a", is_active: true, created_at: "" }],
      selectedSubscriptionId: 99,
      messages: [{ id: 1, subscription_id: 1, title: "x", body: null, timestamp: null, received_at: "", is_read: false }],
    });
    invokeMock.mockResolvedValueOnce(undefined);

    await useStore.getState().removeSubscription(1);

    // Messages should NOT be cleared if removing a non-selected sub
    expect(useStore.getState().messages).toHaveLength(1);
    expect(useStore.getState().selectedSubscriptionId).toBe(99);
  });

  it("sets error on failure", async () => {
    invokeMock.mockRejectedValueOnce(new Error("not found"));
    await useStore.getState().removeSubscription(1);
    expect(useStore.getState().error).toBe("Error: not found");
  });
});

describe("deleteMessage", () => {
  it("optimistically removes message then confirms", async () => {
    useStore.setState({
      messages: [
        { id: 1, subscription_id: 1, title: "a", body: null, timestamp: null, received_at: "", is_read: false },
        { id: 2, subscription_id: 1, title: "b", body: null, timestamp: null, received_at: "", is_read: false },
      ],
    });
    invokeMock.mockResolvedValueOnce(undefined);

    await useStore.getState().deleteMessage(1);

    expect(invokeMock).toHaveBeenCalledWith("delete_message", { id: 1 });
    expect(useStore.getState().messages).toHaveLength(1);
    expect(useStore.getState().messages[0].id).toBe(2);
    expect(useStore.getState().error).toBeNull();
  });

  it("rolls back on error", async () => {
    useStore.setState({
      messages: [{ id: 1, subscription_id: 1, title: "a", body: null, timestamp: null, received_at: "", is_read: false }],
    });
    invokeMock.mockRejectedValueOnce(new Error("delete failed"));

    await useStore.getState().deleteMessage(1);

    // Should roll back — message reappears
    expect(useStore.getState().messages).toHaveLength(1);
    expect(useStore.getState().messages[0].id).toBe(1);
    expect(useStore.getState().error).toBe("Error: delete failed");
  });
});

describe("markRead", () => {
  it("optimistically marks read then confirms", async () => {
    useStore.setState({
      messages: [{ id: 1, subscription_id: 1, title: "a", body: null, timestamp: null, received_at: "", is_read: false }],
    });
    invokeMock.mockResolvedValueOnce(undefined);

    await useStore.getState().markRead(1);

    expect(invokeMock).toHaveBeenCalledWith("mark_read", { id: 1 });
    expect(useStore.getState().messages[0].is_read).toBe(true);
    expect(useStore.getState().error).toBeNull();
  });

  it("rolls back on error", async () => {
    useStore.setState({
      messages: [{ id: 1, subscription_id: 1, title: "a", body: null, timestamp: null, received_at: "", is_read: false }],
    });
    invokeMock.mockRejectedValueOnce(new Error("mark failed"));

    await useStore.getState().markRead(1);

    expect(useStore.getState().messages[0].is_read).toBe(false); // rolled back
    expect(useStore.getState().error).toBe("Error: mark failed");
  });
});

describe("updateSetting", () => {
  it("calls invoke then reloads settings", async () => {
    const updated: AppSettings = {
      dnd_enabled: true, dnd_start: "20:00", dnd_end: "06:00",
      notification_volume: 90, message_retention_days: 14,
      startup_run: true, minimize_to_tray: true, notification_sound: "default",
    };
    // First: update_setting
    invokeMock.mockResolvedValueOnce(undefined);
    // Second: get_settings (reload)
    invokeMock.mockResolvedValueOnce(updated);

    await useStore.getState().updateSetting("dnd_enabled", "true");

    expect(invokeMock).toHaveBeenNthCalledWith(1, "update_setting", { key: "dnd_enabled", value: "true" });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "get_settings");
    expect(useStore.getState().settings.dnd_enabled).toBe(true);
  });

  it("sets error on failure", async () => {
    invokeMock.mockRejectedValueOnce(new Error("invalid key"));
    await useStore.getState().updateSetting("bad", "v");
    expect(useStore.getState().error).toBe("Error: invalid key");
  });
});
```

- [ ] **Step 2: Verify all tests pass**

Run: `npx vitest run src/store/index.test.ts`
Expected: ~25 tests pass (existing 2 + Task 1 ~9 + Task 2 ~10).

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All ~40 tests pass across 5 files.

- [ ] **Step 4: Commit**

```bash
git add src/store/index.test.ts
git commit -m "test(frontend): add IPC integration tests for mutations and optimistic updates"
```

---

## Verification Checklist

- [ ] `npx vitest run` — all tests pass (5 files, ~40 tests)
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — succeeds
- [ ] Tests cover all 8 IPC actions: loadSubscriptions, addSubscription, removeSubscription, loadMessages, markRead, deleteMessage, loadSettings, updateSetting
- [ ] Error path tests for 6 actions
- [ ] Optimistic update + rollback tests for markRead, deleteMessage
