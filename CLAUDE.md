# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ntfy desk — a modern, lightweight notification desktop app built with Tauri v2 (Rust backend + React/TypeScript frontend). Replaces the legacy ntfy-desktop. MVP target: 4 weeks.

## Tech Stack

- **Backend**: Rust, Tauri v2, tokio, rusqlite (bundled), tokio-tungstenite, serde
- **Frontend**: React 19, TypeScript, Zustand, Tailwind CSS v4, lucide-react
- **Storage**: SQLite (config at `dirs::config_dir()/ntfy-desk/`, data at `dirs::data_dir()/ntfy-desk/`)
- **Target**: Windows 11 primary; macOS/Linux planned post-MVP
- **Design**: Windows 11 Fluent Dark (dark-only for MVP)

## Commands

```bash
# Rust
cargo check                       # fast compile check (no binary)
cargo build                       # debug build
cargo build --release             # release build
cargo fmt                         # format
cargo clippy -- -D warnings       # lint
cargo test                        # run all Rust unit tests
cargo test --tests                 # run integration tests (mock)
cargo test --tests -- --ignored    # include real ntfy tests (requires Docker)

# Frontend
npm run dev                       # Vite dev server
npm run build                     # TypeScript check + Vite build
npm run lint                      # TypeScript type-check only
npm run test                      # vitest
npm run test:coverage             # vitest with coverage

# Tauri (from project root)
npx tauri dev                     # dev mode (hot-reload frontend + backend)
npx tauri build                   # production build
```

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Tailwind)   │
│  State: Zustand                             │
├─────────────────────────────────────────────┤
│  Tauri IPC Bridge (invoke)                  │
├─────────────────────────────────────────────┤
│  Rust Backend                               │
│  Config / Database / ntfy WebSocket Client  │
│  Notification Service / System Tray         │
└─────────────────────────────────────────────┘
```

## Directory Layout

```
src/                          # React frontend (Vite)
  main.tsx / App.tsx          # Entry point
  index.css                   # Tailwind v4 + Fluent Design theme
  components/                 # Inbox, MessageDetail, SubscriptionManager, Settings
  hooks/                      # useMessages, useSubscriptions, useSettings
  store/index.ts              # Zustand store
  types/index.ts
src-tauri/                    # Rust backend (Tauri)
  src/
    main.rs                   # Desktop entry point
    lib.rs                    # Tauri builder + commands + plugins
  tests/                      # Rust integration tests (Cargo discovers from here)
  Cargo.toml                  # Rust dependencies
  tauri.conf.json             # Tauri config (window, bundle, identifier)
  capabilities/default.json   # Permissions
docs/                         # Design documents
  Project_Design_Document.md  # Architecture, DB schema, testing strategy
  UI_DESIGN.md                # Fluent Design palette, component specs
```

## Development Conventions

- **Branch naming**: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`, `test/`
- **Commit format**: `type(scope): description` (English only)
- **Rust**: no `panic!`/`unwrap()`/`expect()` in production code; custom error enum with `thiserror`; `Result<T, E>` for all fallible functions; `log` crate for logging (not stdout)
- **TypeScript**: no `any` without explicit cast + comment; interfaces for all props and data shapes; PascalCase components, camelCase functions
- **React**: one component per file (max 300 lines); Tailwind only (no inline styles); Zustand for state (no Redux)
- **Rust files**: max 600 lines
- **Testing**: inline `#[cfg(test)]` modules for Rust; vitest + @testing-library/react for frontend; coverage targets per module (see design doc)
- **Config**: no hardcoded values; no secrets in code; use `RUST_LOG=debug` for dev logging

## Development Roadmap

Follow the [Development Plan](docs/DEVELOPMENT_PLAN.md) — 6 phases with dependency graph:
1. Data Foundation (DB + config + models)
2. Connectivity & Services (WebSocket + notifications + tray)
3. IPC Bridge (Tauri commands)
4. Frontend Foundation (layout + store + hooks)
5. Frontend Features (components)
6. Polish & Integration

## SQLite MCP Server

A SQLite MCP server (`@berthojoris/mcp-sqlite-server`) is configured in `.claude/settings.json`. It allows inspecting the app database directly during development. Pass the database path explicitly:

```
On macOS: ~/Library/Application Support/ntfy-desk/messages.db
```
