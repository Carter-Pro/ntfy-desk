# Backend Integration Tests — Design

## Status

Approved. Moving to implementation.

## Motivation

All 18 existing Rust tests are `#[cfg(test)]` inline unit tests. No tests cover the full pipeline: connect → receive messages → store in DB → trigger notification. Manual testing fills this gap.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Integration Tests (tests/backend/)         │
│                                             │
│  ┌─────────────────┐  ┌──────────────────┐  │
│  │ stream_tests.rs  │  │ real_ntfy_tests  │  │
│  │ (Mock HTTP)      │  │ (#[ignore])      │  │
│  │                  │  │                  │  │
│  │ wiremock server  │  │ Docker ntfy      │  │
│  │ simulates /json  │  │ localhost:8766   │  │
│  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │            │
│  ┌────────▼─────────────────────▼──────────┐ │
│  │  common/mod.rs                          │ │
│  │  - setup_temp_db() → Database           │ │
│  │  - test_subscription() → Subscription   │ │
│  │  - test_ntfy_server_base() → String     │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Test Cases

### Mock HTTP Stream Tests (`tests/backend/stream_tests.rs`)

| # | Test | What It Verifies |
|---|------|------------------|
| 1 | `single_message_stored` | Mock sends 1 JSON line → verify inserted into DB |
| 2 | `multiple_messages_stored` | Mock sends 5 JSON lines → verify all 5 in DB |
| 3 | `empty_lines_skipped` | Mock sends empty lines between messages → no panic, all valid messages stored |
| 4 | `invalid_json_skipped` | Mock sends malformed JSON → logged but doesn't crash, valid messages still stored |
| 5 | `connection_error_handled` | Mock returns HTTP 500 → error is propagated (no panic) |
| 6 | `reconnect_after_disconnect` | Mock closes connection after 2 messages → client reconnects (backoff timer triggers) |

### Real ntfy Integration Tests (`tests/backend/real_ntfy_tests.rs`)

All marked `#[ignore]` — run with `cargo test -- --ignored` or `cargo test -- --include-ignored`.

| # | Test | What It Verifies |
|---|------|------------------|
| 1 | `connect_to_real_ntfy` | Connect to local ntfy → stream opens successfully |
| 2 | `receive_published_message` | Publish via curl → received via stream → stored in DB |
| 3 | `batch_message_receipt` | Publish 10 messages → all 10 received and stored |

## Dependencies

```toml
[dev-dependencies]
tempfile = "3"       # already exists
wiremock = "0.6"     # new — mock HTTP server
reqwest = "0.12"     # already exists (for publishing test messages)
```

## Files

```
tests/backend/
├── common/
│   └── mod.rs          # shared helpers: temp DB, test subscription
├── stream_tests.rs     # mock HTTP integration tests (A)
└── real_ntfy_tests.rs  # real ntfy tests with Docker (B)
```

## Verification

```bash
# Mock tests (always run)
cargo test --test stream_tests

# Real ntfy tests (requires Docker on port 8766)
cargo test --test real_ntfy_tests -- --ignored

# All integration tests
cargo test --tests
```
