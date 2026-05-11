mod commands;
mod config;
mod database;
mod error;
mod models;
mod notification_service;
mod ntfy_client;
mod system_tray;

use std::collections::HashMap;
use std::sync::Mutex;

use config::Config;
use database::Database;
use tauri::Manager;

pub struct AppState {
    pub db: Database,
    pub config: Config,
    pub connection_handles: Mutex<HashMap<i64, tokio::task::JoinHandle<()>>>,
}

impl AppState {
    fn new(db: Database, config: Config) -> Self {
        Self {
            db,
            config,
            connection_handles: Mutex::new(HashMap::new()),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let config = Config::new().expect("failed to initialize config");
    let db = Database::open(config.data_dir()).expect("failed to open database");

    log::info!(
        "ntfy desk started — config dir: {:?}, data dir: {:?}",
        config.config_dir(),
        config.data_dir()
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(move |app| {
            // Build system tray
            system_tray::build(app.handle())?;

            // Spawn WebSocket listeners for existing active subscriptions
            let state = AppState::new(db, config);
            let subscriptions = state.db.get_subscriptions().unwrap_or_default();
            let app_handle = app.handle().clone();

            for sub in subscriptions {
                if sub.is_active {
                    let db = Database::open(state.config.data_dir())
                        .expect("failed to open database for listener");
                    let handle = app_handle.clone();
                    let sub_clone = sub.clone();
                    let join_handle = tokio::spawn(async move {
                        ntfy_client::run_subscription_listener(sub_clone, db, handle).await;
                    });
                    state
                        .connection_handles
                        .lock()
                        .unwrap()
                        .insert(sub.id.unwrap(), join_handle);
                }
            }

            app.manage(Mutex::new(state));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::add_subscription,
            commands::remove_subscription,
            commands::list_subscriptions,
            commands::get_messages,
            commands::mark_read,
            commands::delete_message,
            commands::get_settings,
            commands::update_setting,
            commands::greet,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
