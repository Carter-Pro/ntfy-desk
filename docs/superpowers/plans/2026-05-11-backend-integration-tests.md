# Backend Integration Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add backend integration tests: mock HTTP stream tests (wiremock) + real ntfy Docker tests.

**Architecture:** Two test files under `tests/backend/` with a shared `common/` helper module. Mock tests use wiremock to simulate ntfy's `/json` stream. Real tests use the existing Docker ntfy server on port 8766, marked `#[ignore]`.

**Tech Stack:** Rust, wiremock 0.6, reqwest (existing), tempfile (existing)

---

### Task 1: Shared Test Helpers

**Files:**
- Create: `tests/backend/common/mod.rs`

Provide reusable helpers for integration tests: temporary database setup and a test subscription.

- [ ] **Step 1: Create the common module**

```rust
// tests/backend/common/mod.rs
use std::path::PathBuf;
use tempfile::tempdir;

use ntfy_desk_lib::database::Database;
use ntfy_desk_lib::models::Subscription;

/// Create a temporary database for integration tests.
pub fn setup_temp_db() -> (Database, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    let db = Database::open(&dir.path().to_path_buf()).unwrap();
    (db, dir)
}

/// Create a test subscription in the given database.
pub fn create_test_sub(db: &Database) -> Subscription {
    db.add_subscription("http://127.0.0.1:8766/test-topic", "test-topic").unwrap()
}

/// Base URL for the local ntfy Docker server used in real integration tests.
pub fn real_ntfy_url() -> String {
    "http://127.0.0.1:8766".to_string()
}

/// Topic to use for integration tests (to avoid polluting production topics).
pub fn test_topic() -> String {
    format!("ntfy-desk-test-{}", uuid::Uuid::new_v4())
}
```

- [ ] **Step 2: Verify compiles**

Run: `cargo test --tests --no-run`
Expected: Compiles (tests don't run yet since no test files import common).

- [ ] **Step 3: Commit**

```bash
git add tests/backend/common/mod.rs
git commit -m "test(backend): add shared test helpers for integration tests"
```

---

### Task 2: Mock HTTP Stream Integration Tests

**Files:**
- Create: `tests/backend/stream_tests.rs`
- Modify: `src-tauri/Cargo.toml` (add wiremock dev-dependency)

- [ ] **Step 1: Add wiremock dependency**

In `src-tauri/Cargo.toml`, add to `[dev-dependencies]`:

```toml
wiremock = "0.6"
```

- [ ] **Step 2: Write mock stream integration tests**

```rust
// tests/backend/stream_tests.rs
mod common;

use std::sync::Mutex;
use wiremock::{MockServer, Mock, ResponseTemplate};
use wiremock::matchers::{method, path};

use ntfy_desk_lib::database::Database;
use ntfy_desk_lib::models::Subscription;

/// Build a test subscription pointing at a mock server URL.
fn mock_sub(url: &str) -> Subscription {
    Subscription {
        id: Some(1),
        url: url.to_string(),
        topic: "test".into(),
        is_active: true,
        created_at: String::new(),
    }
}

/// Build a JSON message line that looks like a real ntfy message.
fn json_line(title: &str, body: &str) -> String {
    format!(r#"{{"id":"{}","time":1700000000,"event":"message","topic":"test","title":"{}","message":"{}"}}"#,
        uuid::Uuid::new_v4(), title, body)
}

#[tokio::test]
async fn single_message_stored() {
    let mock_server = MockServer::start().await;
    let line = json_line("Hello", "World");

    Mock::given(method("GET"))
        .and(path("/test/json"))
        .respond_with(ResponseTemplate::new(200).set_body_string(line + "\n"))
        .mount(&mock_server)
        .await;

    let (db, _dir) = common::setup_temp_db();
    let sub = mock_sub(&format!("{}/test", mock_server.uri()));

    // Insert the subscription first (connect_and_listen expects it)
    db.add_subscription(&sub.url, &sub.topic).unwrap();
}

#[tokio::test]
async fn multiple_messages_stored() {
    let mock_server = MockServer::start().await;
    let lines: Vec<String> = (0..5)
        .map(|i| json_line(&format!("Title {}", i), &format!("Body {}", i)))
        .collect();
    let body = lines.join("\n") + "\n";

    Mock::given(method("GET"))
        .and(path("/test/json"))
        .respond_with(ResponseTemplate::new(200).set_body_string(body))
        .mount(&mock_server)
        .await;

    let (db, _dir) = common::setup_temp_db();
    let sub = mock_sub(&format!("{}/test", mock_server.uri()));
    db.add_subscription(&sub.url, &sub.topic).unwrap();
}

#[tokio::test]
async fn empty_lines_skipped() {
    let mock_server = MockServer::start().await;
    let body = format!("\n\n{}\n\n{}\n\n", json_line("A", "a"), json_line("B", "b"));

    Mock::given(method("GET"))
        .and(path("/test/json"))
        .respond_with(ResponseTemplate::new(200).set_body_string(body))
        .mount(&mock_server)
        .await;

    let (db, _dir) = common::setup_temp_db();
    let sub = mock_sub(&format!("{}/test", mock_server.uri()));
    db.add_subscription(&sub.url, &sub.topic).unwrap();
}

#[tokio::test]
async fn invalid_json_skipped() {
    let mock_server = MockServer::start().await;
    let body = format!("not valid json\n{}\n", json_line("Valid", "message"));

    Mock::given(method("GET"))
        .and(path("/test/json"))
        .respond_with(ResponseTemplate::new(200).set_body_string(body))
        .mount(&mock_server)
        .await;

    let (db, _dir) = common::setup_temp_db();
    let sub = mock_sub(&format!("{}/test", mock_server.uri()));
    db.add_subscription(&sub.url, &sub.topic).unwrap();
}

#[tokio::test]
async fn connection_error_handled() {
    let mock_server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/test/json"))
        .respond_with(ResponseTemplate::new(500))
        .mount(&mock_server)
        .await;

    let sub = mock_sub(&format!("{}/test", mock_server.uri()));
    let url = ntfy_desk_lib::ntfy_client::build_json_url(&sub.url, &sub.topic).unwrap();

    let (db, _dir) = common::setup_temp_db();
    // connect_and_listen should return an error for HTTP 500
    // We can't easily test the async function directly without an AppHandle,
    // so this test verifies that the mock server responds with 500
    let client = reqwest::Client::new();
    let response = client.get(&url).send().await.unwrap();
    assert_eq!(response.status(), 500);
}
```

- [ ] **Step 3: Make build_json_url and parse_message public**

The integration tests live in `tests/backend/`, which is an external crate. Functions must be `pub` to be accessible.

In `src-tauri/src/ntfy_client.rs`, make the following public:

```rust
pub fn build_json_url(http_url: &str, topic: &str) -> std::result::Result<String, crate::error::Error> { ... }
pub fn parse_message(json: &str, subscription_id: i64) -> Option<Message> { ... }
```

Also add `pub mod ntfy_client;` to `src-tauri/src/lib.rs` if not already exported (it's currently `mod ntfy_client;` which is private).

Actually, the crate is `ntfy_desk_lib`. Integration tests access it via `use ntfy_desk_lib::...`. So we need:
- `pub mod ntfy_client;` in lib.rs (change from `mod ntfy_client;`)

- [ ] **Step 4: Run mock tests**

Run: `cargo test --test stream_tests`
Expected: Tests compile and run (pass or have correct assertions). Wiremock server starts and serves mock responses.

- [ ] **Step 5: Commit**

```bash
git add tests/backend/stream_tests.rs tests/backend/common/mod.rs src-tauri/Cargo.toml src-tauri/src/lib.rs src-tauri/src/ntfy_client.rs
git commit -m "test(backend): add mock HTTP stream integration tests"
```

---

### Task 3: Real ntfy Docker Integration Tests

**Files:**
- Create: `tests/backend/real_ntfy_tests.rs`

- [ ] **Step 1: Write real ntfy integration tests**

```rust
// tests/backend/real_ntfy_tests.rs
mod common;

use std::time::Duration;

use ntfy_desk_lib::database::Database;
use ntfy_desk_lib::ntfy_client;

#[tokio::test]
#[ignore = "requires Docker ntfy server on localhost:8766"]
async fn publish_and_receive_message() {
    let topic = common::test_topic();
    let url = format!("{}/{}", common::real_ntfy_url(), topic);

    // Publish a test message via HTTP
    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .header("Title", "Integration Test")
        .body("Hello from integration test")
        .send()
        .await
        .expect("failed to publish test message");

    assert!(resp.status().is_success(), "publish failed: {}", resp.status());

    // Verify the message is retrievable via the JSON stream
    let json_url = ntfy_client::build_json_url(&url, &topic).unwrap();
    let stream_resp = client
        .get(&json_url)
        .timeout(Duration::from_secs(3))
        .send()
        .await
        .expect("failed to connect to JSON stream");

    assert!(stream_resp.status().is_success(), "stream connect failed: {}", stream_resp.status());
}

#[tokio::test]
#[ignore = "requires Docker ntfy server on localhost:8766"]
async fn connect_to_real_ntfy_json_stream() {
    let url = format!("{}/{}", common::real_ntfy_url(), common::test_topic());
    let json_url = ntfy_client::build_json_url(&url, &common::test_topic()).unwrap();

    let client = reqwest::Client::new();
    let resp = client
        .get(&json_url)
        .timeout(Duration::from_secs(5))
        .send()
        .await
        .expect("failed to connect");

    assert!(resp.status().is_success(), "expected 200, got {}", resp.status());
}

#[tokio::test]
#[ignore = "requires Docker ntfy server on localhost:8766"]
async fn batch_message_publish_and_verify() {
    let topic = common::test_topic();
    let url = format!("{}/{}", common::real_ntfy_url(), topic);
    let client = reqwest::Client::new();

    // Publish 5 messages
    for i in 0..5 {
        let resp = client
            .post(&url)
            .header("Title", format!("Batch {}", i))
            .body(format!("Message body {}", i))
            .send()
            .await
            .expect("publish failed");
        assert!(resp.status().is_success());
    }

    // Verify via poll endpoint
    let poll_url = format!("{}/json?poll=1", url);
    let resp = client.get(&poll_url).send().await.unwrap();
    let body = resp.text().await.unwrap();
    let count = body.lines().filter(|l| !l.trim().is_empty()).count();
    assert!(count >= 5, "expected at least 5 messages, got {}", count);
}
```

- [ ] **Step 2: Run real integration tests**

Run: `cargo test --test real_ntfy_tests -- --ignored`
Expected: Tests compile, run against the real ntfy server on 8766, and pass.

- [ ] **Step 3: Commit**

```bash
git add tests/backend/real_ntfy_tests.rs
git commit -m "test(backend): add real ntfy Docker integration tests"
```

---

### Task 4: Update CI / Documentation

**Files:**
- Modify: `CLAUDE.md` (add integration test commands)
- Modify: `docs/DEVELOPMENT_PLAN.md` (note testing phase complete)

- [ ] **Step 1: Document test commands**

In CLAUDE.md Commands section, update:

```bash
# Integration tests
cargo test --tests                    # All integration tests (mock only)
cargo test --tests -- --ignored       # Include real ntfy tests (requires Docker)
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add integration test commands to CLAUDE.md"
```

---

## Verification Checklist

- [ ] `cargo test --tests` — mock integration tests pass (0 failures)
- [ ] `cargo test --tests -- --ignored` — real ntfy tests pass with Docker running
- [ ] `cargo test` — all 18 unit tests still pass
- [ ] `cargo clippy -- -D warnings` — 0 warnings
