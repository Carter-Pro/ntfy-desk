# ntfy desk - Project Design Document

## 1. Project Overview

**Project Name**: ntfy desk
**Tech Stack**: Tauri + React + TypeScript (Frontend) + Rust (Backend) + SQLite (Storage)  
**Platform**: Windows 11 (Primary), macOS/Linux (Future)  
**Target**: Replace the legacy ntfy-desktop with a modern, lightweight notification application  
**MVP Timeline**: 4 weeks  

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────┐
│         Windows OS Layer                     │
├─────────────────────────────────────────────┤
│ System Tray (WinAPI) | Toast Notification   │
├─────────────────────────────────────────────┤
│         Tauri Runtime (IPC Bridge)          │
├─────────────────────────────────────────────┤
│  Frontend (React + TypeScript)              │
│  ├─ Inbox Component                         │
│  ├─ SubscriptionManager Component           │
│  ├─ Settings Component                      │
│  └─ Store (Zustand)                         │
├─────────────────────────────────────────────┤
│  Rust Backend                               │
│  ├─ Config Manager                          │
│  ├─ Database Layer (SQLite)                 │
│  ├─ ntfy Client (WebSocket)                 │
│  ├─ Notification Service (WinRT)            │
│  └─ System Tray Manager                     │
└─────────────────────────────────────────────┘
```

## 3. Directory Structure

```
ntfy-desktop/
├── src/
│   ├── main.rs                     # Entry point
│   ├── config.rs                   # Subscription & settings
│   ├── database.rs                 # SQLite layer
│   ├── ntfy_client.rs              # WebSocket + messages
│   ├── notification_service.rs     # Windows Toast
│   ├── system_tray.rs              # Tray icon
│   ├── ipc_commands.rs             # Tauri IPC
│   └── models.rs                   # Data structures
├── ui/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── Inbox.tsx
│   │   │   ├── MessageDetail.tsx
│   │   │   ├── SubscriptionManager.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/
│   │   ├── store/
│   │   └── styles/
│   ├── package.json
│   └── tsconfig.json
├── tests/
│   ├── backend/
│   └── frontend/
├── Cargo.toml
├── tauri.conf.json
├── CLAUDE.md                       # Development standards
└── UI_DESIGN.md                    # UI specification
```

## 4. Technology Stack & Standards

### 4.1 Backend (Rust)

**Key Dependencies**:
- `tauri` - Desktop framework
- `tokio` - Async runtime
- `rusqlite`/`sqlx` - SQLite
- `tokio-tungstenite` - WebSocket
- `windows-rs` - Windows API
- `serde`/`serde_json` - Serialization

**Code Standards**:
- Doc comments for all public functions
- Custom `Error` enum with `thiserror`
- No `panic!` or `unwrap()` in production code
- Async tasks via `tokio::spawn`
- Logging with `log::info!`, `log::error!`
- Config in `dirs::config_dir()/ntfy-desktop/`
- Database in `dirs::data_dir()/ntfy-desktop/messages.db`

### 4.2 Frontend (React + TypeScript)

**Key Dependencies**:
- `react`/`react-dom`
- `typescript`
- `zustand` - State management
- `tailwindcss` - Styling
- `lucide-react` - Icons
- `@tauri-apps/api` - IPC

**Code Standards**:
- All components as `.tsx` with explicit types
- Props as TypeScript interfaces
- Zustand for state (no Redux)
- Tailwind only for styling
- No `any` types
- Max 300 lines per component
- PascalCase for components

### 4.3 Database Schema

```sql
CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    topic TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    subscription_id INTEGER NOT NULL,
    title TEXT,
    body TEXT,
    timestamp TIMESTAMP,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT 0,
    FOREIGN KEY(subscription_id) REFERENCES subscriptions(id)
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

**Settings Keys**:
- `dnd_enabled`, `dnd_start`, `dnd_end` - Do Not Disturb
- `notification_sound`, `notification_volume`
- `message_retention` - Cleanup days
- `startup_run`, `minimize_to_tray`

## 5. Development Constraints

### 5.1 Rust

- No panics in production code → use `Result<T, E>`
- No `unwrap()` in shipped code
- IPC message size < 1MB
- Thread-safe with `Mutex<T>`
- Atomic config writes
- Custom error types with impl `std::error::Error`

### 5.2 React/TypeScript

- Build bundle < 5MB
- Runtime memory < 150MB
- Zustand only for state
- No inline styles (Tailwind only)
- No console.log in production
- Validate ntfy URLs (http/https only)
- File I/O via Tauri IPC only

### 5.3 General

- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`
- No hardcoded values → config files
- No credentials in code → env vars or secure storage
- All PRs require review

## 6. Testing Strategy

### 6.1 Backend Testing

**Unit Tests** (inline in src files):
- Config Manager: 80% coverage
- Database: 75% coverage
- ntfy Client: 70% coverage
- Notification Service: 60% coverage

**Integration Tests** (`tests/backend/`):
- Message flow: subscribe → receive → store → notify
- DB persistence cycles
- WebSocket reconnection

**Command**:
```bash
cargo test --all
cargo tarpaulin --out Html  # Coverage
```

### 6.2 Frontend Testing

**Framework**: `vitest` + `@testing-library/react`

**Coverage**:
- Components: 75% (UI-only: 50%)
- Hooks: 85%
- Store: 90%
- Utils: 90%

**Command**:
```bash
npm run test
npm run test:coverage
```

### 6.3 E2E Manual Checklist

- [ ] Add subscription (http/https)
- [ ] Receive message, verify DB storage
- [ ] Toast notification appears
- [ ] Settings persist after restart
- [ ] DoNotDisturb blocks notifications
- [ ] Auto-cleanup runs
- [ ] Tray minimize/restore works
- [ ] App state restored on restart

## 7. CI/CD Pipeline

### 7.1 GitHub Actions

**On Push/PR**:
1. Lint: `cargo fmt`, `cargo clippy`, `npm run lint`
2. Test: `cargo test`, `npm run test:coverage`
3. Build: `cargo build --release`, `tauri build --release`
4. Upload coverage

### 7.2 Pre-commit Hooks

```bash
#!/bin/sh
cargo fmt
cargo clippy
npm run lint
npm run test:quick
```

### 7.3 Release

1. Bump version (Cargo.toml, package.json, tauri.conf.json)
2. Run all tests + build
3. Create GitHub Release
4. Publish `.msi` installer

## 8. Performance Targets

**Backend**:
- WebSocket reconnect: exponential backoff (1s→60s)
- Batch DB inserts: 100+ per transaction
- In-memory buffer: max 1000 messages
- DB indices: `subscription_id`, `received_at`

**Frontend**:
- Lazy load Settings component
- List virtualization for 5000+ messages
- Debounce search: 300ms
- CSS: Tailwind only

## 9. Deployment

**Output**: Windows `.msi` installer via `tauri build --release`

**Release Checklist**:
- [ ] All tests pass (coverage > 70%)
- [ ] Manual E2E on Windows 11
- [ ] DB migration tested
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Installer tested

## 10. Future Work (Phase 2+)

- Cross-platform (macOS, Linux)
- Message action buttons
- Authentication UI
- Message filters/search
- Custom notification sounds
- Auto-update mechanism
- Message export (JSON, CSV)
