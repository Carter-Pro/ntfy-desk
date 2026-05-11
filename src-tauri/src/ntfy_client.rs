use std::time::Duration;

use futures_util::StreamExt;
use reqwest::Client;
use serde::Deserialize;
use url::Url;

use crate::database::Database;
use crate::error::Result;
use crate::models::{Message, Subscription};

#[derive(Debug, Deserialize)]
struct NtfyMessage {
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    time: Option<i64>,
}

/// Build an HTTP JSON stream URL from an HTTP ntfy server URL and topic.
/// Keeps http/https scheme and appends `/json` to the path.
fn build_json_url(http_url: &str, _topic: &str) -> std::result::Result<String, crate::error::Error> {
    let mut url = Url::parse(http_url).map_err(|e| {
        crate::error::Error::Config(format!("invalid ntfy server URL '{}': {}", http_url, e))
    })?;

    match url.scheme() {
        "http" | "https" => {}
        s => {
            return Err(crate::error::Error::Config(format!(
                "unsupported URL scheme '{}', expected http or https",
                s
            )))
        }
    }

    url.set_path(&format!("{}/json", url.path().trim_end_matches('/')));

    Ok(url.to_string())
}

fn parse_message(json: &str, subscription_id: i64) -> Option<Message> {
    let ntfy_msg: NtfyMessage = serde_json::from_str(json).ok()?;
    let timestamp = ntfy_msg.time.map(|t| {
        chrono::DateTime::from_timestamp(t, 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_else(|| t.to_string())
    });

    Some(Message {
        id: None,
        subscription_id,
        title: ntfy_msg.title,
        body: ntfy_msg.message,
        timestamp,
        received_at: String::new(),
        is_read: false,
    })
}

/// Main connection loop: connect to ntfy HTTP JSON stream, receive messages,
/// store them in the database, and trigger notifications.
async fn connect_and_listen(
    json_url: &str,
    subscription_id: i64,
    db: &Database,
    app_handle: &tauri::AppHandle,
) -> Result<()> {
    let client = Client::builder()
        .build()
        .map_err(|e| crate::error::Error::Config(format!("HTTP client error: {}", e)))?;

    let response = client
        .get(json_url)
        .send()
        .await
        .map_err(|e| crate::error::Error::Config(format!("HTTP connect failed: {}", e)))?;

    log::info!("connected to ntfy HTTP stream: {}", json_url);

    let mut stream = response.bytes_stream();
    let mut buf = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => {
                log::error!("HTTP stream error: {}", e);
                return Err(crate::error::Error::Config(e.to_string()));
            }
        };
        buf.push_str(&String::from_utf8_lossy(&chunk));

        // Extract and process complete lines
        while let Some(pos) = buf.find('\n') {
            let line = buf[..pos].trim().to_string();
            buf = buf[pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }
            if let Some(parsed) = parse_message(&line, subscription_id) {
                match db.insert_message(&parsed) {
                    Ok(stored) => {
                        crate::notification_service::send(app_handle, &stored);
                    }
                    Err(e) => log::error!("failed to store message: {}", e),
                }
            }
        }
    }

    log::info!("HTTP stream closed: {}", json_url);
    Ok(())
}

/// Run the subscription listener with exponential backoff reconnect.
/// Spawn this in a tokio task.
pub async fn run_subscription_listener(
    subscription: Subscription,
    db: Database,
    app_handle: tauri::AppHandle,
) {
    let sub_id = subscription.id.unwrap_or(0);
    let json_url = match build_json_url(&subscription.url, &subscription.topic) {
        Ok(url) => url,
        Err(e) => {
            log::error!("invalid subscription URL: {}", e);
            return;
        }
    };

    let mut backoff = 1u64;
    let max_backoff = 60;

    loop {
        match connect_and_listen(&json_url, sub_id, &db, &app_handle).await {
            Ok(()) => {
                log::info!("HTTP stream closed, reconnecting in {}s...", backoff);
            }
            Err(e) => {
                log::error!("HTTP stream error, reconnecting in {}s: {}", backoff, e);
            }
        }

        tokio::time::sleep(Duration::from_secs(backoff)).await;
        backoff = (backoff * 2).min(max_backoff);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_json_url_https() {
        let url = build_json_url("https://ntfy.sh/mytopic", "mytopic").unwrap();
        assert_eq!(url, "https://ntfy.sh/mytopic/json");
    }

    #[test]
    fn test_build_json_url_http() {
        let url = build_json_url("http://192.168.1.1:8080/alerts", "alerts").unwrap();
        assert_eq!(url, "http://192.168.1.1:8080/alerts/json");
    }

    #[test]
    fn test_build_json_url_trailing_slash() {
        let url = build_json_url("https://ntfy.sh/base/", "ignored").unwrap();
        assert_eq!(url, "https://ntfy.sh/base/json");
    }

    #[test]
    fn test_build_json_url_invalid_scheme() {
        assert!(build_json_url("ftp://example.com", "test").is_err());
    }

    #[test]
    fn test_parse_message() {
        let json = r#"{"title":"Hello","message":"World","time":1700000000}"#;
        let msg = parse_message(json, 1).unwrap();
        assert_eq!(msg.title.as_deref(), Some("Hello"));
        assert_eq!(msg.body.as_deref(), Some("World"));
        assert_eq!(msg.subscription_id, 1);
        assert!(msg.timestamp.is_some());
    }

    #[test]
    fn test_parse_message_minimal() {
        let json = r#"{"message":"just body"}"#;
        let msg = parse_message(json, 2).unwrap();
        assert_eq!(msg.title, None);
        assert_eq!(msg.body.as_deref(), Some("just body"));
    }
}
