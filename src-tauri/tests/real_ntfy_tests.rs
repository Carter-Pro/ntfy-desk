mod common;

use std::time::Duration;
use futures_util::StreamExt;

#[tokio::test]
#[ignore = "requires Docker daemon running"]
async fn connect_to_real_ntfy_stream() {
    let (base_url, _container) = common::start_ntfy_container().await;
    let topic = common::test_topic();
    let url = format!("{}/{}", base_url, topic);
    let json_url = ntfy_desk_lib::ntfy_client::build_json_url(&url, &topic).unwrap();

    let client = reqwest::Client::new();
    let resp = client
        .get(&json_url)
        .timeout(Duration::from_secs(5))
        .send()
        .await
        .expect("failed to connect to ntfy JSON stream");

    assert!(resp.status().is_success(), "expected 200, got {}", resp.status());

    // Verify the stream actually sends data (open event)
    let mut stream = resp.bytes_stream();
    let first_chunk = tokio::time::timeout(
        Duration::from_secs(3),
        stream.next()
    ).await.expect("timeout waiting for stream data").expect("stream closed without data");
    let bytes = first_chunk.unwrap();
    let text = String::from_utf8_lossy(&bytes);
    assert!(text.contains("\"event\""), "expected JSON event in stream, got: {}", text);
}

#[tokio::test]
#[ignore = "requires Docker daemon running"]
async fn publish_and_receive_message() {
    let (base_url, _container) = common::start_ntfy_container().await;
    let topic = common::test_topic();
    let url = format!("{}/{}", base_url, topic);
    let client = reqwest::Client::new();

    // Publish a test message
    let resp = client
        .post(&url)
        .header("Title", "Integration Test")
        .body("Hello from integration test")
        .send()
        .await
        .expect("failed to publish test message");
    assert!(resp.status().is_success(), "publish failed: {}", resp.status());

    // Verify the message DATA is actually present via poll
    tokio::time::sleep(Duration::from_millis(300)).await;
    let poll_url = format!("{}/json?poll=1", url);
    let resp = client.get(&poll_url).send().await.unwrap();
    let body = resp.text().await.unwrap();

    assert!(body.contains("Integration Test"), "published title not found in response");
    assert!(body.contains("Hello from integration test"), "published body not found in response");
}

#[tokio::test]
#[ignore = "requires Docker daemon running"]
async fn batch_message_publish_and_verify() {
    let (base_url, _container) = common::start_ntfy_container().await;
    let topic = common::test_topic();
    let url = format!("{}/{}", base_url, topic);
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
    tokio::time::sleep(Duration::from_millis(500)).await;
    let poll_url = format!("{}/json?poll=1", url);
    let resp = client.get(&poll_url).send().await.unwrap();
    let body = resp.text().await.unwrap();
    let count = body.lines().filter(|l| !l.trim().is_empty()).count();
    assert!(count >= 5, "expected at least 5 messages, got {}", count);
}
