# ntfy desk

A modern, lightweight desktop notification client built with Tauri v2 + React + TypeScript. Connects to [ntfy](https://ntfy.sh) servers to receive and manage push notifications on Windows.

> **Status**: Early development (MVP ~4 weeks)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Rust, Tauri v2, tokio, rusqlite (SQLite), tokio-tungstenite (WebSocket) |
| Frontend | React 19, TypeScript, Tailwind CSS v4, Zustand, lucide-react |
| Storage | SQLite |
| Design | Windows 11 Fluent Dark |

## Prerequisites

- [Rust](https://rustup.rs) (>= 1.77)
- [Node.js](https://nodejs.org) (>= 22, managed via [Volta](https://volta.sh))
- macOS: Xcode Command Line Tools (`xcode-select --install`)
- Windows: Visual Studio Build Tools with C++ workload

## Quick Start

```bash
# Install dependencies
npm install

# Start dev mode (hot-reload frontend + backend)
npx tauri dev

# Run tests
npm test              # frontend tests
cargo test            # backend tests

# Production build
npx tauri build
```

## Project Structure

```
ntfy-desk/
├── src/                    # React frontend (Vite + Tailwind)
│   ├── App.tsx             # Main app shell
│   ├── index.css           # Tailwind v4 + Fluent Design theme
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   ├── store/              # Zustand state management
│   └── types/              # TypeScript type definitions
├── src-tauri/              # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs         # Desktop entry point
│   │   └── lib.rs          # Tauri builder + commands
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Window, bundle, app config
├── tests/
│   ├── backend/            # Rust integration tests
│   └── frontend/           # E2E / component tests
└── docs/                   # Design documents
    ├── Project_Design_Document.md
    └── UI_DESIGN.md
```

## Platform Support

- **Windows 11**: Primary target (MVP)
- **macOS / Linux**: Planned post-MVP

## Documentation

- [Development Plan](docs/DEVELOPMENT_PLAN.md) — 6-phase implementation plan with dependency graph
- [Project Design Document](docs/Project_Design_Document.md) — Architecture, DB schema, testing strategy
- [UI Design Specification](docs/UI_DESIGN.md) — Fluent Design color palette, component specs, typography
- [CLAUDE.md](CLAUDE.md) — Development conventions and AI agent guidance

## License

MIT
