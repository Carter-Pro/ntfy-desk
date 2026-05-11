use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
    pub id: Option<i64>,
    pub url: String,
    pub topic: String,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: Option<i64>,
    pub subscription_id: i64,
    pub title: Option<String>,
    pub body: Option<String>,
    pub timestamp: Option<String>,
    pub received_at: String,
    pub is_read: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub dnd_enabled: bool,
    pub dnd_start: String,
    pub dnd_end: String,
    pub notification_volume: u8,
    pub message_retention_days: u32,
    pub startup_run: bool,
    pub minimize_to_tray: bool,
    pub notification_sound: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            dnd_enabled: false,
            dnd_start: "22:00".into(),
            dnd_end: "08:00".into(),
            notification_volume: 80,
            message_retention_days: 30,
            startup_run: true,
            minimize_to_tray: true,
            notification_sound: "default".into(),
        }
    }
}
