use std::sync::Mutex;

use tauri::Manager;
use tauri_plugin_notification::NotificationExt;

use crate::models::{AppSettings, Message};
use crate::AppState;

fn is_dnd_active(settings: &AppSettings) -> bool {
    is_dnd_active_at(settings, chrono::Local::now().time())
}

fn is_dnd_active_at(settings: &AppSettings, now: chrono::NaiveTime) -> bool {
    if !settings.dnd_enabled {
        return false;
    }
    let start = chrono::NaiveTime::parse_from_str(&settings.dnd_start, "%H:%M")
        .unwrap_or_else(|_| chrono::NaiveTime::from_hms_opt(22, 0, 0).unwrap());
    let end = chrono::NaiveTime::parse_from_str(&settings.dnd_end, "%H:%M")
        .unwrap_or_else(|_| chrono::NaiveTime::from_hms_opt(8, 0, 0).unwrap());

    if start == end {
        return false;
    }

    if start <= end {
        now >= start && now < end
    } else {
        now >= start || now < end
    }
}

pub fn send(app_handle: &tauri::AppHandle, msg: &Message) {
    // Check DND before sending
    if let Ok(state) = app_handle.state::<Mutex<AppState>>().lock() {
        if let Ok(settings) = state.db.load_app_settings() {
            if is_dnd_active(&settings) {
                log::debug!(
                    "DND active, suppressing: {}",
                    msg.title.as_deref().unwrap_or("untitled")
                );
                return;
            }
        }
    }

    let title = msg.title.as_deref().unwrap_or("ntfy desk");
    let body = msg.body.as_deref().unwrap_or("New notification");

    if let Err(e) = app_handle
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show()
    {
        log::error!("failed to send notification: {}", e);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings(dnd_enabled: bool, start: &str, end: &str) -> AppSettings {
        AppSettings {
            dnd_enabled,
            dnd_start: start.into(),
            dnd_end: end.into(),
            ..Default::default()
        }
    }

    fn time(h: u32, m: u32) -> chrono::NaiveTime {
        chrono::NaiveTime::from_hms_opt(h, m, 0).unwrap()
    }

    #[test]
    fn test_dnd_disabled_always_inactive() {
        assert!(!is_dnd_active_at(&settings(false, "22:00", "08:00"), time(23, 0)));
    }

    #[test]
    fn test_dnd_daytime_active_in_range() {
        assert!(is_dnd_active_at(&settings(true, "00:00", "23:59"), time(12, 0)));
    }

    #[test]
    fn test_dnd_overnight_active_at_night() {
        // 22:00–08:00 overnight, at 23:00 DND should be active
        assert!(is_dnd_active_at(&settings(true, "22:00", "08:00"), time(23, 0)));
    }

    #[test]
    fn test_dnd_overnight_inactive_at_noon() {
        // 22:00–08:00 overnight, at 12:00 DND should be inactive
        assert!(!is_dnd_active_at(&settings(true, "22:00", "08:00"), time(12, 0)));
    }

    #[test]
    fn test_dnd_overnight_active_early_morning() {
        // 22:00–08:00 overnight, at 03:00 DND should be active
        assert!(is_dnd_active_at(&settings(true, "22:00", "08:00"), time(3, 0)));
    }

    #[test]
    fn test_dnd_start_equals_end_inactive() {
        assert!(!is_dnd_active_at(&settings(true, "12:00", "12:00"), time(12, 0)));
    }
}
