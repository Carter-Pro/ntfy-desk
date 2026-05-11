use std::path::PathBuf;
use std::sync::Mutex;
use tempfile::tempdir;

use ntfy_desk::database::Database;
use ntfy_desk::models::Subscription;

/// Create a temporary database for integration tests.
pub fn setup_temp_db() -> (Database, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    let db = Database::open(&dir.path().to_path_buf()).unwrap();
    (db, dir)
}

/// Create a test subscription in the given database.
pub fn create_test_sub(db: &Database) -> Subscription {
    db.add_subscription("http://127.0.0.1:8766/test-topic", "test-topic")
        .unwrap()
}

/// Base URL for the local ntfy Docker server used in real integration tests.
pub fn real_ntfy_url() -> String {
    "http://127.0.0.1:8766".to_string()
}

/// Generate a unique test topic name to avoid collisions.
pub fn test_topic() -> String {
    format!("ntfy-desk-test-{}", uuid::Uuid::new_v4())
}
