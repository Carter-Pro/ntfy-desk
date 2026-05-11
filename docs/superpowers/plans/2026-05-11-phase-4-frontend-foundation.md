# Phase 4: Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend foundation: TypeScript types, Zustand store, IPC hooks, and app layout shell with sidebar + content area + glass header.

**Architecture:** Types mirror the Rust models from `src-tauri/src/models.rs`. Zustand store manages subscriptions, messages, and settings state. IPC hooks wrap Tauri `invoke()` calls. App shell uses the Fluent Dark layout from UI_DESIGN.md — 52px glass header, 280px sidebar, flexible main content area.

**Tech Stack:** React 19, TypeScript 5.8, Zustand 5, Tailwind CSS v4, Tauri v2 IPC

---

### Task 1: TypeScript Type Definitions

**Files:**
- Create: `src/types/index.ts`

Types must match the Rust structs in `src-tauri/src/models.rs`. Serde serializes `Option<T>` as nullable JSON.

- [ ] **Step 1: Write types file**

```typescript
export interface Subscription {
  id: number | null;
  url: string;
  topic: string;
  is_active: boolean;
  created_at: string;
}

export interface Message {
  id: number | null;
  subscription_id: number;
  title: string | null;
  body: string | null;
  timestamp: string | null;
  received_at: string;
  is_read: boolean;
}

export interface AppSettings {
  dnd_enabled: boolean;
  dnd_start: string;
  dnd_end: string;
  notification_volume: number;
  message_retention_days: number;
  startup_run: boolean;
  minimize_to_tray: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  dnd_enabled: false,
  dnd_start: "22:00",
  dnd_end: "08:00",
  notification_volume: 80,
  message_retention_days: 30,
  startup_run: true,
  minimize_to_tray: true,
};
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(frontend): add TypeScript type definitions"
```

---

### Task 2: Zustand Store

**Files:**
- Create: `src/store/index.ts`

Single Zustand store managing subscriptions, messages, settings, and UI state. Actions call Tauri IPC commands.

- [ ] **Step 1: Write the store**

```typescript
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { AppSettings, Message, Subscription } from "../types";
import { DEFAULT_SETTINGS } from "../types";

interface Store {
  subscriptions: Subscription[];
  messages: Message[];
  settings: AppSettings;
  selectedSubscriptionId: number | null;
  activeTab: "inbox" | "settings";
  loading: boolean;
  error: string | null;

  loadSubscriptions: () => Promise<void>;
  addSubscription: (url: string, topic: string) => Promise<void>;
  removeSubscription: (id: number) => Promise<void>;
  loadMessages: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  deleteMessage: (id: number) => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  selectSubscription: (id: number | null) => void;
  setActiveTab: (tab: "inbox" | "settings") => void;
}

export const useStore = create<Store>((set, get) => ({
  subscriptions: [],
  messages: [],
  settings: DEFAULT_SETTINGS,
  selectedSubscriptionId: null,
  activeTab: "inbox",
  loading: false,
  error: null,

  loadSubscriptions: async () => {
    set({ loading: true, error: null });
    try {
      const subs = await invoke<Subscription[]>("list_subscriptions");
      set({ subscriptions: subs });
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ loading: false });
    }
  },

  addSubscription: async (url, topic) => {
    set({ error: null });
    try {
      await invoke("add_subscription", { url, topic });
      await get().loadSubscriptions();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  removeSubscription: async (id) => {
    set({ error: null });
    try {
      await invoke("remove_subscription", { id });
      if (get().selectedSubscriptionId === id) {
        set({ selectedSubscriptionId: null, messages: [] });
      }
      await get().loadSubscriptions();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadMessages: async () => {
    set({ loading: true, error: null });
    try {
      const { selectedSubscriptionId } = get();
      const msgs = await invoke<Message[]>("get_messages", {
        subscriptionId: selectedSubscriptionId,
        limit: 50,
        offset: 0,
      });
      set({ messages: msgs });
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ loading: false });
    }
  },

  markRead: async (id) => {
    try {
      await invoke("mark_read", { id });
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === id ? { ...m, is_read: true } : m
        ),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteMessage: async (id) => {
    try {
      await invoke("delete_message", { id });
      set((s) => ({
        messages: s.messages.filter((m) => m.id !== id),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadSettings: async () => {
    try {
      const settings = await invoke<AppSettings>("get_settings");
      set({ settings });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  updateSetting: async (key, value) => {
    try {
      await invoke("update_setting", { key, value });
      await get().loadSettings();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  selectSubscription: (id) => set({ selectedSubscriptionId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/index.ts
git commit -m "feat(frontend): add Zustand store with IPC actions"
```

---

### Task 3: App Layout Shell

**Files:**
- Modify: `src/App.tsx`

Build the window layout: glass header (52px) + sidebar (280px) + main content area. Use Tailwind classes and Fluent Dark colors from `src/index.css`. Keep it minimal — content panes are stubs for Phase 5.

- [ ] **Step 1: Write the layout shell**

```typescript
import { useEffect } from "react";
import { useStore } from "./store";

function App() {
  const {
    subscriptions,
    messages,
    settings,
    selectedSubscriptionId,
    activeTab,
    error,
    loadSubscriptions,
    loadMessages,
    loadSettings,
    selectSubscription,
    setActiveTab,
  } = useStore();

  useEffect(() => {
    loadSubscriptions();
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === "inbox") loadMessages();
  }, [selectedSubscriptionId, activeTab]);

  return (
    <div className="h-screen flex flex-col bg-[#202020] text-white">
      {/* Header */}
      <header className="h-[52px] flex items-center justify-between px-6 bg-[#202020]/80 backdrop-blur border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[#e0e0e0]">ntfy desk</h1>
        </div>
        <span className="text-xs text-[#999]">v0.1.0</span>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-[280px] shrink-0 border-r border-white/[0.08] flex flex-col">
          {/* Subscriptions list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-[#999] uppercase tracking-wide">
                Subscriptions
              </span>
              <span className="text-xs text-[#999]">{subscriptions.length}</span>
            </div>
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                onClick={() => selectSubscription(sub.id)}
                className={`px-4 py-3 hover:bg-white/[0.05] cursor-pointer rounded-lg transition ${
                  selectedSubscriptionId === sub.id
                    ? "bg-white/[0.08]"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-[#e0e0e0] truncate">
                    {sub.topic}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      sub.is_active ? "bg-[#107c10]" : "bg-[#c50f1f]"
                    }`}
                  />
                </div>
                <span className="text-xs text-[#999] truncate block mt-0.5">
                  {sub.url}
                </span>
              </div>
            ))}
            {subscriptions.length === 0 && (
              <p className="text-xs text-[#999] px-4 py-8 text-center">
                No subscriptions yet. Add one in Settings.
              </p>
            )}
          </div>

          {/* Bottom nav */}
          <div className="border-t border-white/[0.08] p-3">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`w-full px-4 py-2 text-sm rounded-lg text-left transition ${
                activeTab === "inbox"
                  ? "bg-white/[0.08] text-white"
                  : "text-[#999] hover:bg-white/[0.04]"
              }`}
            >
              Inbox
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full px-4 py-2 text-sm rounded-lg text-left transition mt-1 ${
                activeTab === "settings"
                  ? "bg-white/[0.08] text-white"
                  : "text-[#999] hover:bg-white/[0.04]"
              }`}
            >
              Settings
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 px-4 py-2 bg-[#c50f1f]/20 border border-[#c50f1f]/30 rounded-lg text-sm text-[#c50f1f]">
              {error}
            </div>
          )}

          {activeTab === "inbox" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Inbox</h2>
              {messages.length === 0 ? (
                <p className="text-[#999] text-sm">
                  {selectedSubscriptionId
                    ? "No messages for this subscription yet."
                    : "Select a subscription to view messages."}
                </p>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg border border-white/[0.05] ${
                        msg.is_read ? "bg-transparent" : "bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-sm">
                          {msg.title || "Untitled"}
                        </h3>
                        <span className="text-xs text-[#999] shrink-0 ml-4">
                          {msg.received_at
                            ? new Date(msg.received_at).toLocaleString()
                            : ""}
                        </span>
                      </div>
                      {msg.body && (
                        <p className="text-sm text-[#999] mt-1 line-clamp-2">
                          {msg.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Settings</h2>
              <p className="text-[#999] text-sm">Settings panel coming in Phase 5.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors. Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(frontend): add app layout shell with sidebar and header"
```

---

### Task 4: Wire Up and Verify

**Files:**
- No new files. Verify integration.

- [ ] **Step 1: Verify full build**

Run: `npm run build`
Expected: TypeScript compiles, Vite builds successfully.

- [ ] **Step 2: Verify Rust compiles with no warnings**

Run: `cd src-tauri && cargo clippy -- -D warnings`
Expected: 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(frontend): Phase 4 complete — types, store, layout shell"
```

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` produces `dist/` successfully
- [ ] `cargo clippy -- -D warnings` passes (no backend changes, but verify)
- [ ] Layout renders: header (52px) + sidebar (280px) + main content
- [ ] Sidebar shows subscriptions with connection status dots
- [ ] Tab switching between Inbox and Settings
- [ ] Error state displays in a red banner
- [ ] Empty states show helper text
