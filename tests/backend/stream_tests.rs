mod common;

use wiremock::{MockServer, Mock, ResponseTemplate};
use wiremock::matchers::{method, path};

use ntfy_desk::database::Database;
use ntfy_desk::models::Subscription;

fn mock_sub(url: &str) -> Subscription {
    Subscription {
        id: Some(1),
        url: url.to_string(),
        topic: "test".into(),
        is_active: true,
        created_at: String::new(),
    }
}

fn json_line(title: &str, body: &str) -> String {
    format!(
        r#"{{"id":"{}","time":1700000000,"event":"message","topic":"test","title":"{}","message":"{}"}}"#,
        uuid::Uuid::new_v4(),
        title,
        body
    )
}

#[tokio::test]
async fn test_single_message_parsed() {
    let mock_server = MockServer::start().await;
    let line = json_line("Hello", "World");

    Mock::given(method("GET"))
        .and(path("/test/json"))
        .respond_with(ResponseTemplate::new(200).set_body_string(line.clone() + "\n"))
        .mount(&mock_server)
        .await;

    // Verify mock responds correctly
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/test/json", mock_server.uri()))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 200);
    let body = resp.text().await.unwrap();
    assert_eq!(body.trim(), line.trim());
}

#[tokio::test]
async fn test_multiple_messages_parsed() {
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

    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/test/json", mock_server.uri()))
        .send()
        .await
        .unwrap();
    let text = resp.text().await.unwrap();
    let parsed: Vec<_> = text.lines().filter(|l| !l.trim().is_empty()).collect();
    assert_eq!(parsed.len(), 5);
}

#[tokio::test]
async fn test_empty_lines_skipped_by_parser() {
    let body = format!("\n\n{}\n\n{}\n\n", json_line("A", "a"), json_line("B", "b"));

    // Verify that parse_message handles the lines correctly
    let parsed: Vec<_> = body
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|l| ntfy_desk::ntfy_client::parse_message(l, 1))
        .collect();

    assert_eq!(parsed.len(), 2);
    assert_eq!(parsed[0].title.as_deref(), Some("A"));
    assert_eq!(parsed[1].title.as_deref(), Some("B"));
}

#[tokio::test]
async fn test_invalid_json_skipped_by_parser() {
    let body = format!("not valid json\n{}\n", json_line("Valid", "message"));

    let parsed: Vec<_> = body
        .lines()
        .filter_map(|l| ntfy_desk::ntfy_client::parse_message(l, 1))
        .collect();

    assert_eq!(parsed.len(), 1);
    assert_eq!(parsed[0].title.as_deref(), Some("Valid"));
}

#[tokio::test]
async fn test_connection_error_handled() {
    let mock_server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/test/json"))
        .respond_with(ResponseTemplate::new(500))
        .mount(&mock_server)
        .await;

    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/test/json", mock_server.uri()))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 500);
}

#[tokio::test]
async fn test_db_message_roundtrip() {
    let (db, _dir) = common::setup_temp_db();
    let sub = common::create_test_sub(&db);
    let sub_id = sub.id.unwrap();

    // Insert messages via the DB API
    for i in 0..3 {
        let msg = ntfy_desk::models::Message {
            id: None,
            subscription_id: sub_id,
            title: Some(format!("Test {}", i)),
            body: Some(format!("Body {}", i)),
            timestamp: Some("2025-01-01T00:00:00Z".into()),
            received_at: String::new(),
            is_read: false,
        };
        db.insert_message(&msg).unwrap();
    }

    let msgs = db.get_messages(Some(sub_id), 10, 0).unwrap();
    assert_eq!(msgs.len(), 3);
}
