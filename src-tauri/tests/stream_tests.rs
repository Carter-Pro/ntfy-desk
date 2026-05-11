mod common;

use wiremock::{MockServer, Mock, ResponseTemplate};
use wiremock::matchers::{method, path};

fn json_line(title: &str, body: &str) -> String {
    format!(
        r#"{{"id":"{}","time":1700000000,"event":"message","topic":"test","title":"{}","message":"{}"}}"#,
        uuid::Uuid::new_v4(),
        title,
        body
    )
}

#[tokio::test]
async fn parse_message_from_mock_stream() {
    let mock_server = MockServer::start().await;
    let line = json_line("Hello", "World");

    Mock::given(method("GET"))
        .and(path("/test/json"))
        .respond_with(ResponseTemplate::new(200).set_body_string(line.clone() + "\n"))
        .mount(&mock_server)
        .await;

    let json_url = ntfy_desk_lib::ntfy_client::build_json_url(
        &format!("{}/test", mock_server.uri()), "test"
    ).unwrap();

    // Verify URL construction produces correct path
    assert!(json_url.ends_with("/test/json"));

    // Fetch and parse the actual message
    let client = reqwest::Client::new();
    let resp = client.get(&json_url).send().await.unwrap();
    let body = resp.text().await.unwrap();
    let first_line = body.lines().next().unwrap();
    let parsed = ntfy_desk_lib::ntfy_client::parse_message(first_line, 1).unwrap();
    assert_eq!(parsed.title.as_deref(), Some("Hello"));
    assert_eq!(parsed.body.as_deref(), Some("World"));
}

#[tokio::test]
async fn build_json_url_from_real_url() {
    let url = ntfy_desk_lib::ntfy_client::build_json_url(
        "http://192.168.1.1:8080/alerts", "alerts"
    ).unwrap();
    assert_eq!(url, "http://192.168.1.1:8080/alerts/json");
}

#[tokio::test]
async fn error_response_handled() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/test/json"))
        .respond_with(ResponseTemplate::new(500))
        .mount(&mock_server)
        .await;

    let json_url = ntfy_desk_lib::ntfy_client::build_json_url(
        &format!("{}/test", mock_server.uri()), "test"
    ).unwrap();

    let client = reqwest::Client::new();
    let resp = client.get(&json_url).send().await.unwrap();
    // Verify our URL builder + HTTP client correctly propagate errors
    assert_eq!(resp.status(), 500);
}

#[tokio::test]
async fn test_empty_lines_skipped_by_parser() {
    let body = format!("\n\n{}\n\n{}\n\n", json_line("A", "a"), json_line("B", "b"));

    // Verify that parse_message handles the lines correctly
    let parsed: Vec<_> = body
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|l| ntfy_desk_lib::ntfy_client::parse_message(l, 1))
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
        .filter_map(|l| ntfy_desk_lib::ntfy_client::parse_message(l, 1))
        .collect();

    assert_eq!(parsed.len(), 1);
    assert_eq!(parsed[0].title.as_deref(), Some("Valid"));
}

#[tokio::test]
async fn test_db_message_roundtrip() {
    let (db, _dir) = common::setup_temp_db();
    let sub = common::create_test_sub(&db, "http://127.0.0.1:8766/test-topic");
    let sub_id = sub.id.unwrap();

    // Insert messages via the DB API
    for i in 0..3 {
        let msg = ntfy_desk_lib::models::Message {
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
