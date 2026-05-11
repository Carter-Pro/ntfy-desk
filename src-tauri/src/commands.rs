use std::sync::Mutex;
use tauri::State;
use crate::models::{AppSettings, Subscription};
use crate::AppState;

type CmdResult<T> = std::result::Result<T, String>;

fn map_err(e: crate::error::Error) -> String {
    log::error!("command error: {}", e);
    e.to_string()
}

fn lock_state<'a>(state: &'a State<'a, Mutex<AppState>>) -> CmdResult<std::sync::MutexGuard<'a, AppState>> {
    state.lock().map_err(|e| format!("internal state error: {}", e))
}

#[tauri::command]
pub fn add_subscription(
    url: String,
    topic: String,
    state: State<'_, Mutex<AppState>>,
    app_handle: tauri::AppHandle,
) -> CmdResult<Subscription> {
    let app_state = lock_state(&state)?;
    let sub = app_state.db.add_subscription(&url, &topic).map_err(map_err)?;
    let sub_id = sub.id.ok_or_else(|| "subscription has no id".to_string())?;

    let db = crate::database::Database::open(app_state.config.data_dir()).map_err(map_err)?;
    let handle = app_handle.clone();
    let sub_clone = sub.clone();
    let join_handle = tauri::async_runtime::spawn(async move {
        crate::ntfy_client::run_subscription_listener(sub_clone, db, handle).await;
    });
    app_state.connection_handles.lock().map_err(|e| format!("connection handle error: {}", e))?.insert(sub_id, join_handle);

    log::info!("added subscription: {} ({})", topic, url);
    Ok(sub)
}

#[tauri::command]
pub fn remove_subscription(
    id: i64,
    state: State<'_, Mutex<AppState>>,
) -> CmdResult<()> {
    let app_state = lock_state(&state)?;
    if let Some(handle) = app_state.connection_handles.lock().map_err(|e| format!("connection handle error: {}", e))?.remove(&id) {
        handle.abort();
    }
    app_state.db.remove_subscription(id).map_err(map_err)?;
    log::info!("removed subscription id={}", id);
    Ok(())
}

#[tauri::command]
pub fn list_subscriptions(
    state: State<'_, Mutex<AppState>>,
) -> CmdResult<Vec<Subscription>> {
    lock_state(&state)?.db.get_subscriptions().map_err(map_err)
}

#[tauri::command]
pub fn get_messages(
    subscription_id: Option<i64>,
    limit: Option<u32>,
    offset: Option<u32>,
    state: State<'_, Mutex<AppState>>,
) -> CmdResult<Vec<crate::models::Message>> {
    lock_state(&state)?
        .db
        .get_messages(subscription_id, limit.unwrap_or(50), offset.unwrap_or(0))
        .map_err(map_err)
}

#[tauri::command]
pub fn mark_read(id: i64, state: State<'_, Mutex<AppState>>) -> CmdResult<()> {
    lock_state(&state)?.db.mark_read(id).map_err(map_err)
}

#[tauri::command]
pub fn delete_message(id: i64, state: State<'_, Mutex<AppState>>) -> CmdResult<()> {
    lock_state(&state)?.db.delete_message(id).map_err(map_err)
}

#[tauri::command]
pub fn get_settings(state: State<'_, Mutex<AppState>>) -> CmdResult<AppSettings> {
    lock_state(&state)?.db.load_app_settings().map_err(map_err)
}

#[tauri::command]
pub fn update_setting(
    key: String,
    value: String,
    state: State<'_, Mutex<AppState>>,
) -> CmdResult<()> {
    lock_state(&state)?.db.set_setting(&key, &value).map_err(map_err)
}
