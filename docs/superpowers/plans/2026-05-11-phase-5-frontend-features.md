# Phase 5: Frontend Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all 4 frontend feature components: Subscription Manager, Inbox, Message Detail, and Settings panel.

**Architecture:** Settings holds subscription management (add form + list) plus all app settings. Inbox uses a split-pane layout with message list on the left and MessageDetail on the right. Components read/write state via the Zustand store (`src/store/index.ts`). Local React state for UI-only concerns (selected message, dialog open/close).

**Tech Stack:** React 19, TypeScript 5.8, Zustand 5, Tailwind CSS v4, lucide-react

---

### Task 1: Settings Component

**Files:**
- Create: `src/components/Settings.tsx`
- Test: `src/components/Settings.test.tsx`
- Modify: `src/App.tsx` (wire Settings component)

Four sections per UI_DESIGN.md §5.6:
1. **Subscriptions** — add dialog (URL + topic inputs), list with delete button per item, connection dot
2. **Do Not Disturb** — enable toggle, start/end time inputs
3. **Notifications** — volume slider (0-100)
4. **Application** — message retention days, startup run, minimize to tray

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/Settings.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStore } from "../store";

// Reset store before each test
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

// Must render inside a simple wrapper since Settings doesn't need special providers
import Settings from "./Settings";

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
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDefined();
  });

  it("shows volume slider", () => {
    render(<Settings />);
    const slider = screen.getByRole("slider");
    expect(slider).toBeDefined();
  });

  it("shows Add Subscription button and opens dialog", () => {
    render(<Settings />);
    const addBtn = screen.getByText("Add Subscription");
    expect(addBtn).toBeDefined();
    fireEvent.click(addBtn);
    expect(screen.getByPlaceholderText("ntfy server URL (e.g. https://ntfy.sh/mytopic)")).toBeDefined();
    expect(screen.getByPlaceholderText("Topic name")).toBeDefined();
  });

  it("renders subscription list items with delete buttons", () => {
    useStore.setState({
      subscriptions: [
        { id: 1, url: "https://ntfy.sh/test", topic: "test", is_active: true, created_at: "" },
        { id: 2, url: "https://ntfy.sh/alerts", topic: "alerts", is_active: false, created_at: "" },
      ],
    });
    render(<Settings />);
    expect(screen.getByText("test")).toBeDefined();
    expect(screen.getByText("alerts")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Settings.test.tsx 2>&1`
Expected: FAIL — "Settings is not defined" or equivalent.

- [ ] **Step 3: Write Settings component**

```tsx
// src/components/Settings.tsx
import { useState } from "react";
import { Trash2, Plus, X } from "lucide-react";
import { useStore } from "../store";

function Settings() {
  const {
    subscriptions, settings, addSubscription, removeSubscription,
    updateSetting, loadSubscriptions, loadSettings,
  } = useStore();
  const [showDialog, setShowDialog] = useState(false);
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");

  const handleAdd = async () => {
    if (!url.trim() || !topic.trim()) return;
    await addSubscription(url.trim(), topic.trim());
    setUrl("");
    setTopic("");
    setShowDialog(false);
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Section: Subscriptions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold">Subscriptions</h2>
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#005a9e] text-white text-[13px] rounded-lg transition-colors"
          >
            <Plus size={14} />
            Add Subscription
          </button>
        </div>

        {/* Subscription list */}
        <div className="space-y-2">
          {subscriptions.length === 0 ? (
            <p className="text-[13px] text-[#999] py-4">No subscriptions configured.</p>
          ) : (
            subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${sub.is_active ? "bg-[#107c10]" : "bg-[#c50f1f]"}`} />
                    <span className="text-[14px] font-medium truncate">{sub.topic}</span>
                  </div>
                  <p className="text-[12px] text-[#999] truncate mt-0.5 pl-4">{sub.url}</p>
                </div>
                <button
                  onClick={() => sub.id !== null && removeSubscription(sub.id)}
                  className="p-2 hover:bg-[#c50f1f]/20 text-[#999] hover:text-[#c50f1f] rounded transition-colors shrink-0 ml-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Subscription Dialog */}
        {showDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#2d2d2d] border border-white/[0.08] rounded-lg p-6 w-96 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-semibold">Add Subscription</h3>
                <button onClick={() => setShowDialog(false)} className="p-1 hover:bg-white/[0.08] rounded transition-colors">
                  <X size={16} />
                </button>
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="ntfy server URL (e.g. https://ntfy.sh/mytopic)"
                className="w-full px-3 py-2 bg-[#202020] border border-white/[0.08] rounded-lg text-white text-[13px] placeholder-[#999] focus:border-[#0078d4] outline-none mb-3"
              />
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Topic name"
                className="w-full px-3 py-2 bg-[#202020] border border-white/[0.08] rounded-lg text-white text-[13px] placeholder-[#999] focus:border-[#0078d4] outline-none mb-6"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!url.trim() || !topic.trim()}
                  className="flex-1 px-4 py-2 bg-[#0078d4] hover:bg-[#005a9e] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-medium transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowDialog(false)}
                  className="flex-1 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg text-[13px] font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section: Do Not Disturb */}
      <section>
        <h2 className="text-[16px] font-semibold mb-4">Do Not Disturb</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg cursor-pointer">
            <span className="text-[14px]">Enable DND</span>
            <input
              type="checkbox"
              checked={settings.dnd_enabled}
              onChange={(e) => updateSetting("dnd_enabled", String(e.target.checked))}
              className="w-4 h-4 cursor-pointer accent-[#0078d4]"
            />
          </label>
          {settings.dnd_enabled && (
            <div className="grid grid-cols-2 gap-3 px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg">
              <div>
                <label className="text-[12px] text-[#999] block mb-1">Start</label>
                <input
                  type="time"
                  value={settings.dnd_start}
                  onChange={(e) => updateSetting("dnd_start", e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#202020] border border-white/[0.08] rounded text-white text-[13px] focus:border-[#0078d4] outline-none"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#999] block mb-1">End</label>
                <input
                  type="time"
                  value={settings.dnd_end}
                  onChange={(e) => updateSetting("dnd_end", e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#202020] border border-white/[0.08] rounded text-white text-[13px] focus:border-[#0078d4] outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section: Notifications */}
      <section>
        <h2 className="text-[16px] font-semibold mb-4">Notifications</h2>
        <div className="px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg">
          <label className="text-[14px] block mb-2">
            Volume ({settings.notification_volume}%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.notification_volume}
            onChange={(e) => updateSetting("notification_volume", e.target.value)}
            className="w-full h-1 bg-white/[0.12] rounded-lg appearance-none cursor-pointer accent-[#0078d4]"
          />
        </div>
      </section>

      {/* Section: Application */}
      <section>
        <h2 className="text-[16px] font-semibold mb-4">Application</h2>
        <div className="space-y-3">
          <div className="px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg">
            <label className="text-[14px] block mb-2">
              Message retention ({settings.message_retention_days} days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.message_retention_days}
              onChange={(e) => updateSetting("message_retention_days", e.target.value)}
              className="w-24 px-3 py-1.5 bg-[#202020] border border-white/[0.08] rounded text-white text-[13px] focus:border-[#0078d4] outline-none"
            />
          </div>
          <label className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg cursor-pointer">
            <span className="text-[14px]">Run on startup</span>
            <input
              type="checkbox"
              checked={settings.startup_run}
              onChange={(e) => updateSetting("startup_run", String(e.target.checked))}
              className="w-4 h-4 cursor-pointer accent-[#0078d4]"
            />
          </label>
          <label className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg cursor-pointer">
            <span className="text-[14px]">Minimize to tray</span>
            <input
              type="checkbox"
              checked={settings.minimize_to_tray}
              onChange={(e) => updateSetting("minimize_to_tray", String(e.target.checked))}
              className="w-4 h-4 cursor-pointer accent-[#0078d4]"
            />
          </label>
        </div>
      </section>
    </div>
  );
}

export default Settings;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Settings.test.tsx 2>&1`
Expected: 5/5 tests pass.

- [ ] **Step 5: Wire into App.tsx**

Replace the placeholder Settings tab in App.tsx:

```tsx
import Settings from "./components/Settings";

// In main content area, replace:
{activeTab === "settings" && (
  <section>
    <h2 className="text-[20px] font-semibold mb-4">Settings</h2>
    <p className="text-[13px] text-[#999999]">Settings panel coming in Phase 5.</p>
  </section>
)}
// With:
{activeTab === "settings" && <Settings />}
```

- [ ] **Step 6: Verify build and commit**

Run: `npx tsc --noEmit && npm run build && npx vitest run`
Expected: All pass.

```bash
git add src/components/Settings.tsx src/components/Settings.test.tsx src/App.tsx
git commit -m "feat(frontend): add Settings component with subscription management"
```

---

### Task 2: Inbox Component

**Files:**
- Create: `src/components/Inbox.tsx`
- Test: `src/components/Inbox.test.tsx`
- Modify: `src/App.tsx` (wire Inbox component)

Split-pane: message list (left) + MessageDetail placeholder (right). Message selection via local state.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/Inbox.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStore } from "../store";
import Inbox from "./Inbox";

beforeEach(() => {
  vi.stubGlobal("__TAURI_INTERNALS__", { invoke: vi.fn() });
  useStore.setState({
    messages: [
      { id: 1, subscription_id: 1, title: "Test Message", body: "Hello world",
        timestamp: "2025-01-01T00:00:00Z", received_at: "2025-01-01T00:00:00Z", is_read: false },
      { id: 2, subscription_id: 1, title: "Another", body: null,
        timestamp: null, received_at: "2025-01-01T01:00:00Z", is_read: true },
    ],
    selectedSubscriptionId: 1,
    activeTab: "inbox",
  });
});

describe("Inbox", () => {
  it("renders message list", () => {
    render(<Inbox />);
    expect(screen.getByText("Test Message")).toBeDefined();
    expect(screen.getByText("Another")).toBeDefined();
  });

  it("shows empty state when no subscription selected", () => {
    useStore.setState({ selectedSubscriptionId: null, messages: [] });
    render(<Inbox />);
    expect(screen.getByText("Select a subscription to view messages.")).toBeDefined();
  });

  it("shows empty state for subscription with no messages", () => {
    useStore.setState({ messages: [], selectedSubscriptionId: 1 });
    render(<Inbox />);
    expect(screen.getByText("No messages for this subscription.")).toBeDefined();
  });

  it("selects a message on click", () => {
    render(<Inbox />);
    fireEvent.click(screen.getByText("Test Message"));
    expect(screen.getByText("Hello world")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Inbox.test.tsx 2>&1`
Expected: FAIL.

- [ ] **Step 3: Write Inbox component**

```tsx
// src/components/Inbox.tsx
import { useState } from "react";
import { Inbox as InboxIcon } from "lucide-react";
import { useStore } from "../store";
import MessageDetail from "./MessageDetail";

function formatTime(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}

function Inbox() {
  const { messages, selectedSubscriptionId, markRead, deleteMessage } = useStore();
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);

  const selectedMsg = selectedMessageId !== null
    ? messages.find((m) => m.id === selectedMessageId) ?? null
    : null;

  const handleSelect = (msg: typeof messages[0]) => {
    setSelectedMessageId(msg.id);
    if (!msg.is_read && msg.id !== null) {
      markRead(msg.id);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteMessage(id);
    if (selectedMessageId === id) {
      setSelectedMessageId(null);
    }
  };

  const handleMarkRead = async (id: number) => {
    await markRead(id);
  };

  return (
    <div className="flex h-full gap-0">
      {/* Message List */}
      <div className="w-1/2 border-r border-white/[0.08] overflow-y-auto">
        <h2 className="text-[16px] font-semibold px-4 py-3 border-b border-white/[0.08]">Inbox</h2>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <InboxIcon size={32} className="text-[#999] mb-3" />
            <p className="text-[13px] text-[#999]">
              {selectedSubscriptionId === null
                ? "Select a subscription to view messages."
                : "No messages for this subscription."}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => handleSelect(msg)}
              className={`w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                selectedMessageId === msg.id ? "bg-white/[0.06]" : ""
              } ${!msg.is_read ? "border-l-2 border-l-[#0078d4]" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`text-[14px] ${msg.is_read ? "text-[#999]" : "text-white font-medium"} line-clamp-1`}>
                  {msg.title || "(no title)"}
                </span>
                <time className="text-[11px] text-[#999] whitespace-nowrap shrink-0">
                  {formatTime(msg.received_at)}
                </time>
              </div>
              {msg.body && (
                <p className="text-[12px] text-[#999] mt-0.5 line-clamp-1">{msg.body}</p>
              )}
            </button>
          ))
        )}
      </div>

      {/* Message Detail Panel */}
      <div className="w-1/2 overflow-y-auto">
        {selectedMsg ? (
          <MessageDetail
            message={selectedMsg}
            onDelete={() => selectedMsg.id !== null && handleDelete(selectedMsg.id)}
            onMarkRead={() => selectedMsg.id !== null && handleMarkRead(selectedMsg.id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <InboxIcon size={32} className="text-[#999] mb-3" />
            <p className="text-[13px] text-[#999]">Select a message to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inbox;
```

- [ ] **Step 4: Wire into App.tsx**

Replace the inline inbox code with:
```tsx
import Inbox from "./components/Inbox";

// In main content, replace the inbox section with:
{activeTab === "inbox" && <Inbox />}
```

- [ ] **Step 5: Run tests and commit**

Run: `npx vitest run`
Expected: All pass.

Run: `npx tsc --noEmit && npm run build`
Expected: Build succeeds.

```bash
git add src/components/Inbox.tsx src/components/Inbox.test.tsx src/App.tsx
git commit -m "feat(frontend): add Inbox component with split-pane layout"
```

---

### Task 3: MessageDetail Component

**Files:**
- Create: `src/components/MessageDetail.tsx`
- Test: `src/components/MessageDetail.test.tsx`

Shows full message body with delete and mark-read actions.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/MessageDetail.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MessageDetail from "./MessageDetail";
import type { Message } from "../types";

const msg: Message = {
  id: 1,
  subscription_id: 1,
  title: "Test Title",
  body: "Test body content",
  timestamp: "2025-01-01T00:00:00Z",
  received_at: "2025-01-01T00:00:00Z",
  is_read: false,
};

describe("MessageDetail", () => {
  it("renders message title and body", () => {
    render(<MessageDetail message={msg} onDelete={vi.fn()} onMarkRead={vi.fn()} />);
    expect(screen.getByText("Test Title")).toBeDefined();
    expect(screen.getByText("Test body content")).toBeDefined();
  });

  it("renders (no title) when title is null", () => {
    const noTitle = { ...msg, title: null };
    render(<MessageDetail message={noTitle} onDelete={vi.fn()} onMarkRead={vi.fn()} />);
    expect(screen.getByText("(no title)")).toBeDefined();
  });

  it("calls onDelete when Delete button clicked", () => {
    const onDelete = vi.fn();
    render(<MessageDetail message={msg} onDelete={onDelete} onMarkRead={vi.fn()} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("calls onMarkRead when Mark Read button clicked", () => {
    const onMarkRead = vi.fn();
    render(<MessageDetail message={msg} onDelete={vi.fn()} onMarkRead={onMarkRead} />);
    fireEvent.click(screen.getByText("Mark Read"));
    expect(onMarkRead).toHaveBeenCalledOnce();
  });

  it("hides Mark Read button when message is already read", () => {
    render(<MessageDetail message={{ ...msg, is_read: true }} onDelete={vi.fn()} onMarkRead={vi.fn()} />);
    expect(screen.queryByText("Mark Read")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/MessageDetail.test.tsx 2>&1`
Expected: FAIL.

- [ ] **Step 3: Write MessageDetail component**

```tsx
// src/components/MessageDetail.tsx
import { Trash2, CheckCircle } from "lucide-react";
import type { Message } from "../types";

interface Props {
  message: Message;
  onDelete: () => void;
  onMarkRead: () => void;
}

function MessageDetail({ message, onDelete, onMarkRead }: Props) {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-[18px] font-semibold mb-1">
          {message.title || "(no title)"}
        </h2>
        {message.timestamp && (
          <p className="text-[12px] text-[#999]">
            {new Date(message.timestamp).toLocaleString()}
          </p>
        )}
        <p className="text-[12px] text-[#999]">
          Received: {new Date(message.received_at).toLocaleString()}
        </p>
      </div>

      {message.body && (
        <div className="py-2">
          <p className="text-[14px] text-[#e0e0e0] whitespace-pre-wrap leading-relaxed">
            {message.body}
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t border-white/[0.08]">
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#c50f1f] hover:bg-[#a00d1a] text-white text-[13px] rounded-lg transition-colors"
        >
          <Trash2 size={14} />
          Delete
        </button>
        {!message.is_read && (
          <button
            onClick={onMarkRead}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white text-[13px] rounded-lg transition-colors"
          >
            <CheckCircle size={14} />
            Mark Read
          </button>
        )}
      </div>
    </div>
  );
}

export default MessageDetail;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/MessageDetail.test.tsx 2>&1`
Expected: 5/5 pass.

- [ ] **Step 5: Verify full build and commit**

Run: `npx tsc --noEmit && npm run build && npx vitest run`
Expected: All pass.

```bash
git add src/components/MessageDetail.tsx src/components/MessageDetail.test.tsx
git commit -m "feat(frontend): add MessageDetail component"
```

---

### Task 4: Final Integration & Verification

**Files:**
- Modify: `src/App.tsx` (clean up, wire all components)

- [ ] **Step 1: Final App.tsx cleanup**

Replace the remaining inline Inbox content and ensure App.tsx imports only the components:

```tsx
import { useEffect } from "react";
import { useStore } from "./store";
import Inbox from "./components/Inbox";
import Settings from "./components/Settings";

function App() {
  const {
    subscriptions,
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
      <header className="h-[52px] flex items-center px-4 bg-[#202020]/80 backdrop-blur border-b border-white/[0.08] shrink-0">
        <h1 className="text-[16px] font-semibold">ntfy desk</h1>
        <span className="ml-auto text-[12px] text-[#999]">v0.1.0</span>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-[280px] flex flex-col border-r border-white/[0.08] shrink-0">
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <h2 className="text-[13px] font-semibold text-[#e0e0e0] uppercase tracking-wide">
              Subscriptions
              {subscriptions.length > 0 && (
                <span className="text-[#999] font-normal normal-case ml-1">({subscriptions.length})</span>
              )}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {subscriptions.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-[#999]">No subscriptions yet. Add one in Settings.</p>
            ) : (
              subscriptions.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => selectSubscription(sub.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/[0.05] transition-colors ${
                    selectedSubscriptionId === sub.id ? "bg-white/[0.08]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${sub.is_active ? "bg-[#107c10]" : "bg-[#c50f1f]"}`} />
                    <span className="text-[14px] font-medium truncate">{sub.topic}</span>
                  </div>
                  <span className="block text-[12px] text-[#999] mt-1 truncate pl-4">{sub.url}</span>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-white/[0.08] p-2 flex flex-col gap-1">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`w-full text-left px-3 py-2 rounded text-[14px] transition-colors ${
                activeTab === "inbox" ? "bg-white/[0.08] text-white" : "text-[#e0e0e0] hover:bg-white/[0.05]"
              }`}
            >
              Inbox
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full text-left px-3 py-2 rounded text-[14px] transition-colors ${
                activeTab === "settings" ? "bg-white/[0.08] text-white" : "text-[#e0e0e0] hover:bg-white/[0.05]"
              }`}
            >
              Settings
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {error && (
            <div className="mx-4 mt-4 px-4 py-3 bg-[#c50f1f]/20 border border-[#c50f1f]/40 rounded text-[13px] text-[#e0e0e0]">
              {error}
            </div>
          )}
          {activeTab === "inbox" && <Inbox />}
          {activeTab === "settings" && (
            <div className="overflow-y-auto h-full p-6">
              <Settings />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Final verification**

Run: `npx tsc --noEmit && npm run build && npx vitest run`
Expected: TypeScript clean, Vite build succeeds, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(frontend): Phase 5 complete — Settings, Inbox, MessageDetail components"
```

---

## Verification Checklist

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — Vite production build succeeds
- [ ] `npx vitest run` — Settings (5), Inbox (4), MessageDetail (5), Store (4) = 18 tests pass
- [ ] Settings: 4 sections render, add dialog opens/closes, DND toggle, volume slider, retention input
- [ ] Inbox: split-pane layout, message selection, empty states
- [ ] MessageDetail: title/body display, Delete button, Mark Read button (hidden when read)
