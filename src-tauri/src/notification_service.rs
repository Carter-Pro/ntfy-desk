use crate::models::Message;
use tauri_plugin_notification::NotificationExt;

pub fn send(app_handle: &tauri::AppHandle, msg: &Message) {
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
