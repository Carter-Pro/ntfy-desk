use std::time::Duration;

use futures_util::StreamExt;
use serde::Deserialize;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite;
use url::Url;

use crate::database::Database;
use crate::error::Result;
use crate::models::{Message, Subscription};
use crate::notification_service;

#[derive(Debug, Deserialize)]
struct NtfyMessage {
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    time: Option<i64>,
}

/// Build a WebSocket URL from an HTTP ntfy server URL and topic.
/// Converts http→ws, https→wss, and appends `/<topic>/ws`.
fn build_ws_url(http_url: &str, _topic: &str) -> std::result::Result<String, crate::error::Error> {
    let mut url = Url::parse(http_url).map_err(|e| {
        crate::error::Error::Config(format!("invalid ntfy server URL '{}': {}", http_url, e))
    })?;

    let scheme = match url.scheme() {
        "http" => "ws",
        "https" => "wss",
        s => {
            return Err(crate::error::Error::Config(format!(
                "unsupported URL scheme '{}', expected http or https",
                s
            )))
        }
    };

    url.set_scheme(scheme)
        .map_err(|()| crate::error::Error::Config("failed to set WebSocket scheme".into()))?;
    url.set_path(&format!("{}/ws", url.path().trim_end_matches('/')));

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

/// Main connection loop: connect to ntfy WebSocket, receive messages,
/// store them in the database, and trigger notifications.
async fn connect_and_listen(
    ws_url: &str,
    subscription_id: i64,
    db: &Database,
    app_handle: &tauri::AppHandle,
) -> Result<()> {
    let (ws_stream, _) = connect_async(ws_url).await.map_err(|e| {
        crate::error::Error::Config(format!("WebSocket connect failed: {}", e))
    })?;

    log::info!("connected to ntfy WebSocket: {}", ws_url);

    let (_, mut read) = ws_stream.split();

    while let Some(msg) = read.next().await {
        match msg {
            Ok(tungstenite::Message::Text(text)) => {
                if let Some(parsed) = parse_message(&text, subscription_id) {
                    match db.insert_message(&parsed) {
                        Ok(stored) => {
                            notification_service::send(app_handle, &stored);
                        }
                        Err(e) => {
                            log::error!("failed to store message: {}", e);
                        }
                    }
                }
            }
            Ok(tungstenite::Message::Close(_)) => {
                log::info!("WebSocket closed by server: {}", ws_url);
                break;
            }
            Ok(_) => {} // Ignore binary/ping/pong
            Err(e) => {
                log::error!("WebSocket error: {}", e);
                return Err(crate::error::Error::Config(e.to_string()));
            }
        }
    }

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
    let ws_url = match build_ws_url(&subscription.url, &subscription.topic) {
        Ok(url) => url,
        Err(e) => {
            log::error!("invalid subscription URL: {}", e);
            return;
        }
    };

    let mut backoff = 1u64;
    let max_backoff = 60;

    loop {
        match connect_and_listen(&ws_url, sub_id, &db, &app_handle).await {
            Ok(()) => {
                log::info!("WebSocket closed, reconnecting in {}s...", backoff);
            }
            Err(e) => {
                log::error!("WebSocket error, reconnecting in {}s: {}", backoff, e);
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
    fn test_build_ws_url_https() {
        let url = build_ws_url("https://ntfy.sh/mytopic", "mytopic").unwrap();
        assert_eq!(url, "wss://ntfy.sh/mytopic/ws");
    }

    #[test]
    fn test_build_ws_url_http() {
        let url = build_ws_url("http://192.168.1.1:8080/alerts", "alerts").unwrap();
        assert_eq!(url, "ws://192.168.1.1:8080/alerts/ws");
    }

    #[test]
    fn test_build_ws_url_trailing_slash() {
        let url = build_ws_url("https://ntfy.sh/base/", "ignored").unwrap();
        assert_eq!(url, "wss://ntfy.sh/base/ws");
    }

    #[test]
    fn test_build_ws_url_invalid_scheme() {
        assert!(build_ws_url("ftp://example.com", "test").is_err());
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
