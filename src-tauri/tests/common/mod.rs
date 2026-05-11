#![allow(dead_code)]

use ntfy_desk_lib::database::Database;
use ntfy_desk_lib::models::Subscription;
use tempfile::tempdir;

/// Create a temporary database for integration tests.
pub fn setup_temp_db() -> (Database, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    let db = Database::open(&dir.path().to_path_buf()).unwrap();
    (db, dir)
}

/// Create a test subscription in the given database.
pub fn create_test_sub(db: &Database, url: &str) -> Subscription {
    db.add_subscription(url, "test-topic").unwrap()
}

/// Generate a unique test topic name to avoid collisions.
pub fn test_topic() -> String {
    format!("ntfy-desk-test-{}", uuid::Uuid::new_v4())
}

/// Start a fresh ntfy Docker container and return (host_url, container).
/// The container is auto-removed when dropped.
pub async fn start_ntfy_container() -> (String, testcontainers::ContainerAsync<testcontainers::GenericImage>) {
    use testcontainers::core::{IntoContainerPort, WaitFor};
    use testcontainers::GenericImage;
    use testcontainers::runners::AsyncRunner;

    let image = GenericImage::new("binwiederhier/ntfy", "2.11.0")
        .with_exposed_port(80.tcp())
        .with_wait_for(WaitFor::message_on_stdout("Listening on"));

    let container = image.start().await.unwrap();
    let port = container.get_host_port_ipv4(80.tcp()).await.unwrap();
    let url = format!("http://127.0.0.1:{}", port);

    // Wait for ntfy to be fully ready by polling the health endpoint
    let client = reqwest::Client::new();
    for _ in 0..10 {
        let health_url = format!("{}/v1/health", url);
        if let Ok(resp) = client.get(&health_url).timeout(std::time::Duration::from_secs(1)).send().await {
            if resp.status().is_success() {
                break;
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    }

    (url, container)
}
