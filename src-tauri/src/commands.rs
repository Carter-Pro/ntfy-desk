use std::sync::Mutex;
use tauri::State;
use crate::models::{AppSettings, Subscription};
use crate::AppState;

type CmdResult<T> = std::result::Result<T, String>;

fn map_err(e: crate::error::Error) -> String {
    log::error!("command error: {}", e);
    e.to_string()
}

#[tauri::command]
pub fn add_subscription(
    url: String,
    topic: String,
    state: State<'_, Mutex<AppState>>,
    app_handle: tauri::AppHandle,
) -> CmdResult<Subscription> {
    let app_state = state.lock().unwrap();
    let sub = app_state.db.add_subscription(&url, &topic).map_err(map_err)?;
    let sub_id = sub.id.unwrap();

    let db = crate::database::Database::open(app_state.config.data_dir()).map_err(map_err)?;
    let handle = app_handle.clone();
    let sub_clone = sub.clone();
    let join_handle = tokio::spawn(async move {
        crate::ntfy_client::run_subscription_listener(sub_clone, db, handle).await;
    });
    app_state.connection_handles.lock().unwrap().insert(sub_id, join_handle);

    log::info!("added subscription: {} ({})", topic, url);
    Ok(sub)
}

#[tauri::command]
pub fn remove_subscription(
    id: i64,
    state: State<'_, Mutex<AppState>>,
) -> CmdResult<()> {
    let app_state = state.lock().unwrap();
    if let Some(handle) = app_state.connection_handles.lock().unwrap().remove(&id) {
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
    state.lock().unwrap().db.get_subscriptions().map_err(map_err)
}

#[tauri::command]
pub fn get_messages(
    subscription_id: Option<i64>,
    limit: Option<u32>,
    offset: Option<u32>,
    state: State<'_, Mutex<AppState>>,
) -> CmdResult<Vec<crate::models::Message>> {
    state
        .lock()
        .unwrap()
        .db
        .get_messages(subscription_id, limit.unwrap_or(50), offset.unwrap_or(0))
        .map_err(map_err)
}

#[tauri::command]
pub fn mark_read(id: i64, state: State<'_, Mutex<AppState>>) -> CmdResult<()> {
    state.lock().unwrap().db.mark_read(id).map_err(map_err)
}

#[tauri::command]
pub fn delete_message(id: i64, state: State<'_, Mutex<AppState>>) -> CmdResult<()> {
    state.lock().unwrap().db.delete_message(id).map_err(map_err)
}

#[tauri::command]
pub fn get_settings(state: State<'_, Mutex<AppState>>) -> CmdResult<AppSettings> {
    state.lock().unwrap().db.load_app_settings().map_err(map_err)
}

#[tauri::command]
pub fn update_setting(
    key: String,
    value: String,
    state: State<'_, Mutex<AppState>>,
) -> CmdResult<()> {
    state.lock().unwrap().db.set_setting(&key, &value).map_err(map_err)
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
