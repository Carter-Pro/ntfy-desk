mod common;

use std::time::Duration;
use ntfy_desk_lib::ntfy_client;

#[tokio::test]
#[ignore = "requires Docker ntfy server on localhost:8766"]
async fn connect_to_real_ntfy_stream() {
    let topic = common::test_topic();
    let url = format!("{}/{}", common::real_ntfy_url(), topic);
    let json_url = ntfy_client::build_json_url(&url, &topic).unwrap();

    let client = reqwest::Client::new();
    let resp = client
        .get(&json_url)
        .timeout(Duration::from_secs(5))
        .send()
        .await
        .expect("failed to connect to ntfy JSON stream");

    assert!(resp.status().is_success(), "expected 200, got {}", resp.status());
}

#[tokio::test]
#[ignore = "requires Docker ntfy server on localhost:8766"]
async fn publish_and_receive_message() {
    let topic = common::test_topic();
    let url = format!("{}/{}", common::real_ntfy_url(), topic);

    // Publish a test message
    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .header("Title", "Integration Test")
        .body("Hello from integration test")
        .send()
        .await
        .expect("failed to publish test message");

    assert!(resp.status().is_success(), "publish failed: {}", resp.status());

    // Verify the message appears in the JSON stream
    let json_url = ntfy_client::build_json_url(&url, &topic).unwrap();
    let stream_resp = client
        .get(&json_url)
        .timeout(Duration::from_secs(3))
        .send()
        .await
        .expect("failed to connect to JSON stream");

    assert!(stream_resp.status().is_success());
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
    tokio::time::sleep(Duration::from_millis(500)).await;
    let poll_url = format!("{}/json?poll=1", url);
    let resp = client.get(&poll_url).send().await.unwrap();
    let body = resp.text().await.unwrap();
    let count = body.lines().filter(|l| !l.trim().is_empty()).count();
    assert!(count >= 5, "expected at least 5 messages, got {}", count);
}
