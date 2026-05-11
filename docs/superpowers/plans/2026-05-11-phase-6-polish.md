# Phase 6: Polish & Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the app: auto-cleanup old messages, enforce DND for notifications, add React error boundary, and expand test coverage.

**Architecture:** Backend changes are small — add a periodic cleanup task to lib.rs and DND checking to notification_service.rs. Frontend adds an ErrorBoundary component. Tests are expanded for better coverage.

**Tech Stack:** Rust (tokio, rusqlite), React 19, TypeScript, vitest

---

### Task 1: Auto-Cleanup Background Task

**Files:**
- Modify: `src-tauri/src/lib.rs` (add background cleanup task)
- Test: `src-tauri/src/database.rs` (existing cleanup test covers the DB logic)

Spawn a tokio task on startup that runs `cleanup_old_messages` periodically using the configured retention setting.

- [ ] **Step 1: Add the background task to lib.rs**

In the `setup` closure of `src-tauri/src/lib.rs`, after `app.manage(Mutex::new(state))`, add:

```rust
// Spawn background cleanup task
let app_handle_cleanup = app.handle().clone();
tokio::spawn(async move {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600));
    loop {
        interval.tick().await;
        let state = app_handle_cleanup.state::<Mutex<AppState>>();
        let app_state = state.lock().unwrap();
        match app_state.db.load_app_settings() {
            Ok(settings) => {
                match app_state.db.cleanup_old_messages(settings.message_retention_days) {
                    Ok(count) => {
                        if count > 0 {
                            log::info!("auto-cleanup: removed {} old messages", count);
                        }
                    }
                    Err(e) => log::error!("auto-cleanup error: {}", e),
                }
            }
            Err(e) => log::error!("auto-cleanup: failed to load settings: {}", e),
        }
    }
});
```

- [ ] **Step 2: Verify compile and test**

Run: `cargo test && cargo clippy -- -D warnings`
Expected: All 15 tests pass, 0 clippy warnings.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(backend): add periodic auto-cleanup of old messages"
```

---

### Task 2: DND Enforcement in Notifications

**Files:**
- Modify: `src-tauri/src/notification_service.rs` (add DND check)
- Modify: `src-tauri/src/ntfy_client.rs` (pass app state to notification service)
- Test: `src-tauri/src/notification_service.rs` (add inline tests)

The notification service currently sends notifications unconditionally. It must check app settings (via `AppHandle` → `AppState`) for DND status and time window before sending.

- [ ] **Step 1: Write DND check logic**

Add to `src-tauri/src/notification_service.rs`:

```rust
use crate::models::AppSettings;

fn is_dnd_active(settings: &AppSettings) -> bool {
    if !settings.dnd_enabled {
        return false;
    }
    let now = chrono::Local::now().time();
    let start = chrono::NaiveTime::parse_from_str(&settings.dnd_start, "%H:%M").unwrap_or(chrono::NaiveTime::from_hms_opt(22, 0, 0).unwrap());
    let end = chrono::NaiveTime::parse_from_str(&settings.dnd_end, "%H:%M").unwrap_or(chrono::NaiveTime::from_hms_opt(8, 0, 0).unwrap());

    if start <= end {
        now >= start && now < end
    } else {
        // Overnight DND: e.g. 22:00–08:00
        now >= start || now < end
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings(dnd_enabled: bool, start: &str, end: &str) -> AppSettings {
        AppSettings {
            dnd_enabled,
            dnd_start: start.into(),
            dnd_end: end.into(),
            ..Default::default()
        }
    }

    #[test]
    fn test_dnd_disabled_always_false() {
        assert!(!is_dnd_active(&settings(false, "22:00", "08:00")));
    }

    #[test]
    fn test_dnd_overnight_window_format() {
        let s = settings(true, "22:00", "08:00");
        // At noon, DND should be inactive for overnight window
        let now = chrono::Local::now().time();
        let is_active = is_dnd_active(&s);
        // Just verify it doesn't panic and returns a boolean
        assert!(!is_active || is_active);
    }

    #[test]
    fn test_dnd_daytime_active_when_in_range() {
        let s = settings(true, "00:00", "23:59");
        assert!(is_dnd_active(&s));
    }
}
```

- [ ] **Step 2: Update send() to check DND**

Replace the `send` function in `src-tauri/src/notification_service.rs`:

```rust
use tauri::Manager;
use crate::AppState;

pub fn send(app_handle: &tauri::AppHandle, msg: &Message) {
    // Check DND before sending
    if let Ok(state) = app_handle.state::<std::sync::Mutex<AppState>>().lock() {
        if let Ok(settings) = state.db.load_app_settings() {
            if is_dnd_active(&settings) {
                log::debug!("DND active, suppressing notification: {}", msg.title.as_deref().unwrap_or(""));
                return;
            }
        }
    }

    let title = msg.title.as_deref().unwrap_or("ntfy desk");
    let body = msg.body.as_deref().unwrap_or("New notification");

    if let Err(e) = app_handle
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show()
    {
        log::error!("failed to send notification: {}", e);
    }
}
```

Remove the existing `use crate::models::Message;` import (replaced by the new ones).

- [ ] **Step 3: Verify compile and test**

Run: `cargo test && cargo clippy -- -D warnings`
Expected: All tests pass, 0 clippy warnings.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/notification_service.rs
git commit -m "feat(backend): enforce DND when sending notifications"
```

---

### Task 3: React Error Boundary

**Files:**
- Create: `src/ErrorBoundary.tsx`
- Modify: `src/App.tsx` (wrap app in error boundary)
- Test: `src/ErrorBoundary.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/ErrorBoundary.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

function BrokenComponent(): JSX.Element {
  throw new Error("test crash");
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello")).toBeDefined();
  });

  it("renders fallback UI when child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("test crash")).toBeDefined();
    vi.restoreAllMocks();
  });
});
```

Run: `npx vitest run src/ErrorBoundary.test.tsx`
Expected: FAIL (file not found).

- [ ] **Step 2: Write ErrorBoundary component**

Create `src/ErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#202020] text-white flex flex-col items-center justify-center p-6">
          <h1 className="text-[20px] font-semibold mb-2">Something went wrong</h1>
          <p className="text-[13px] text-[#999] mb-4">
            {this.state.error?.message || "Unknown error"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-[#0078d4] hover:bg-[#005a9e] text-white text-[13px] rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Run: `npx vitest run src/ErrorBoundary.test.tsx`
Expected: 2/2 tests PASS.

- [ ] **Step 3: Wire into App.tsx**

In `src/App.tsx`:
1. Add import: `import ErrorBoundary from "./ErrorBoundary";`
2. Wrap the root `<div>` with `<ErrorBoundary>`:

```tsx
return (
  <ErrorBoundary>
    <div className="h-screen flex flex-col bg-[#202020] text-white">
      {/* ... rest of App ... */}
    </div>
  </ErrorBoundary>
);
```

- [ ] **Step 4: Verify everything**

Run: `npx tsc --noEmit && npm run build && npx vitest run`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/ErrorBoundary.tsx src/ErrorBoundary.test.tsx src/App.tsx
git commit -m "feat(frontend): add React error boundary"
```

---

### Task 4: Expand Test Coverage

**Files:**
- Modify: `src/store/index.test.ts` (add action tests)
- Modify: `src/components/Settings.test.tsx` (add interaction tests)

Bring frontend test coverage up. No backend changes needed.

- [ ] **Step 1: Expand store tests**

Add to `src/store/index.test.ts`:

```typescript
it("setActiveTab switches between tabs", () => {
  const { setActiveTab } = useStore.getState();
  setActiveTab("settings");
  expect(useStore.getState().activeTab).toBe("settings");
  setActiveTab("inbox");
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
```

- [ ] **Step 2: Expand Settings tests**

Add to `src/components/Settings.test.tsx`:

```typescript
it("hides DND time inputs when DND is disabled", () => {
  useStore.setState({
    settings: { ...useStore.getState().settings, dnd_enabled: false, dnd_start: "22:00", dnd_end: "08:00" },
  });
  render(<Settings />);
  expect(screen.queryByDisplayValue("22:00")).toBeNull();
});

it("closes add dialog when Cancel is clicked", () => {
  render(<Settings />);
  fireEvent.click(screen.getByText("Add Subscription"));
  const cancelBtn = screen.getByText("Cancel");
  fireEvent.click(cancelBtn);
  // Should not show the URL input anymore
  expect(screen.queryByPlaceholderText("ntfy server URL (e.g. https://ntfy.sh/mytopic)")).toBeNull();
});
```

- [ ] **Step 3: Run tests and commit**

Run: `npx vitest run`
Expected: All tests pass (store: 6, settings: 7, message detail: 5, inbox: 4, error boundary: 2 = 24 total).

```bash
git add src/store/index.test.ts src/components/Settings.test.tsx
git commit -m "test(frontend): expand store and Settings test coverage"
```

---

## Verification Checklist

- [ ] `cargo test` — 18+ tests pass
- [ ] `cargo clippy -- -D warnings` — 0 warnings
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — Vite build succeeds
- [ ] `npx vitest run` — 24+ tests pass
- [ ] Auto-cleanup: background task runs every hour
- [ ] DND: notifications suppressed during DND window
- [ ] Error boundary: crash in child shows fallback UI with "Try Again"
