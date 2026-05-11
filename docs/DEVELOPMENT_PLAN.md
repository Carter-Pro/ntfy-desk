# ntfy desk — Development Phase Plan

## Overview

ntfy desk is a Tauri v2 desktop notification client for ntfy.sh. The project targets a 4-week MVP with 6 backend modules and 4 frontend components. Each phase builds on the previous — follow them in order.

## Dependency Graph

```
Phase 1 (Data) ──► Phase 2 (Services) ──► Phase 3 (IPC)
                                                │
Phase 4 (Frontend Foundation) ◄─────────────────┘
        │
        └──► Phase 5 (Features) ──► Phase 6 (Polish)
```

Backend (Phases 1-3) comes first. Frontend (Phases 4-5) depends on IPC commands from Phase 3.

---

## Phase 1: Data Foundation (Backend)

| # | Task | File | Description |
|---|------|------|-------------|
| 1.1 | Error types | `src-tauri/src/error.rs` | Custom `Error` enum with `thiserror`, `Result<T>` alias |
| 1.2 | Data models | `src-tauri/src/models.rs` | `Subscription`, `Message`, `Settings` structs with `serde` |
| 1.3 | Database layer | `src-tauri/src/database.rs` | SQLite init (schema), CRUD for subscriptions/messages/settings. Transactions for batch inserts. |
| 1.4 | Config manager | `src-tauri/src/config.rs` | Read/write `config.json` in `dirs::config_dir()/ntfy-desk/`. Manage subscriptions list, app settings. |
| 1.5 | Tests | inline `#[cfg(test)]` | Unit tests for DB CRUD and config persistence |

**Verification**: `cargo test` passes. DB creates tables on first run. Config file persists subscriptions.

---

## Phase 2: Connectivity & Services (Backend)

| # | Task | File | Description |
|---|------|------|-------------|
| 2.1 | ntfy WebSocket client | `src-tauri/src/ntfy_client.rs` | Connect to `wss://<server>/<topic>/ws`, receive JSON messages, parse into `Message`. Exponential backoff reconnect (1s→60s). |
| 2.2 | Notification service | `src-tauri/src/notification_service.rs` | Native toast via `tauri-plugin-notification`. Show title + body on new message. |
| 2.3 | System tray | `src-tauri/src/system_tray.rs` | Tray icon with `tray-icon` feature. Context menu: Show/Hide, Quit. |
| 2.4 | App state | `src-tauri/src/app_state.rs` | `Mutex<AppState>` holding active WebSocket connections, config, DB pool. Managed by Tauri as `manage()`. |
| 2.5 | Tests | inline | Reconnect logic, message parsing |

**Verification**: Can subscribe to a real ntfy topic and see log output. Tray icon appears.

---

## Phase 3: IPC Bridge (Backend)

| # | Task | File | Description |
|---|------|------|-------------|
| 3.1 | IPC commands | `src-tauri/src/commands.rs` | All `#[tauri::command]` functions: `add_subscription`, `remove_subscription`, `list_subscriptions`, `get_messages`, `mark_read`, `delete_message`, `get_settings`, `update_setting` |
| 3.2 | Wire up in lib.rs | `src-tauri/src/lib.rs` | Register all commands, plugins, and managed state with `tauri::Builder` |

**Verification**: All commands callable from frontend via `invoke()`.

---

## Phase 4: Frontend Foundation

| # | Task | File | Description |
|---|------|------|-------------|
| 4.1 | Type definitions | `src/types/index.ts` | TypeScript interfaces: `Subscription`, `Message`, `AppSettings` |
| 4.2 | Zustand store | `src/store/index.ts` | Single store with slices: `messages`, `subscriptions`, `settings`, plus actions |
| 4.3 | IPC hooks | `src/hooks/useMessages.ts`, `useSubscriptions.ts`, `useSettings.ts` | Async hooks wrapping Tauri `invoke()` calls |
| 4.4 | App layout shell | `src/App.tsx` | Sidebar (280px) + main content area. Glass header bar. Dark theme per UI_DESIGN.md |

**Verification**: App renders the shell layout. Hooks call backend commands successfully.

---

## Phase 5: Frontend Features

| # | Task | File | Description |
|---|------|------|-------------|
| 5.1 | Subscription Manager | `src/components/SubscriptionManager.tsx` | Add/remove subscriptions. URL validation. Connection status indicator (green/red dot). |
| 5.2 | Inbox (message list) | `src/components/Inbox.tsx` | Scrollable list with title, body preview, timestamp, topic badge. |
| 5.3 | Message Detail | `src/components/MessageDetail.tsx` | Full message view with delete/mark-read actions. Split-pane with list. |
| 5.4 | Settings | `src/components/Settings.tsx` | DND toggle + time range, notification sound/volume, message retention, startup behavior |

**Verification**: Full UX flow — add subscription → receive messages → view in inbox → manage settings.

---

## Phase 6: Polish & Integration

| # | Task | Description |
|---|------|-------------|
| 6.1 | Auto-cleanup | Background task deleting messages older than retention setting |
| 6.2 | DND enforcement | Suppress notifications during DND window |
| 6.3 | Startup/resume | Restore subscriptions, reconnect WebSockets on app launch |
| 6.4 | Error boundaries | React error boundary. Graceful Rust error handling exposed to UI. |
| 6.5 | Test coverage | Backend 70%+, frontend components 75%+ |
| 6.6 | E2E manual test | Run 8-point checklist from Project_Design_Document.md |

**Verification**: E2E checklist passes. `cargo test` and `npm test` at target coverage.

---

## File Map

```
src-tauri/src/          (Rust backend — Phases 1-3)
  error.rs              Phase 1
  models.rs             Phase 1
  database.rs           Phase 1
  config.rs             Phase 1
  ntfy_client.rs        Phase 2
  notification_service.rs Phase 2
  system_tray.rs        Phase 2
  app_state.rs          Phase 2
  commands.rs           Phase 3
  lib.rs                Phase 3 (wire up)
  main.rs               (exists, no changes)

src/                    (React frontend — Phases 4-5)
  types/index.ts        Phase 4
  store/index.ts        Phase 4
  hooks/                Phase 4
  components/           Phase 5
  App.tsx               Phase 4 (shell) → Phase 5 (routes)
```

---

**Version**: 1.0
**Last Updated**: 2026-05-11
