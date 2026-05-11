pub mod commands;
pub mod config;
pub mod database;
pub mod error;
pub mod models;
pub mod notification_service;
pub mod ntfy_client;
pub mod system_tray;

use std::collections::HashMap;
use std::sync::Mutex;

use config::Config;
use database::Database;
use tauri::Manager;

pub struct AppState {
    pub db: Database,
    pub config: Config,
    pub connection_handles: Mutex<HashMap<i64, tauri::async_runtime::JoinHandle<()>>>,
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

    let config = match Config::new() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("ntfy desk: failed to initialize config: {}", e);
            std::process::exit(1);
        }
    };
    let db = match Database::open(config.data_dir()) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("ntfy desk: failed to open database: {}", e);
            std::process::exit(1);
        }
    };

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
                    let db = match Database::open(state.config.data_dir()) {
                        Ok(d) => d,
                        Err(e) => {
                            log::error!("failed to open database for listener: {}", e);
                            continue;
                        }
                    };
                    let handle = app_handle.clone();
                    let sub_clone = sub.clone();
                    let join_handle = tauri::async_runtime::spawn(async move {
                        ntfy_client::run_subscription_listener(sub_clone, db, handle).await;
                    });
                    if let (Some(id), Ok(mut handles)) = (sub.id, state.connection_handles.lock()) {
                        handles.insert(id, join_handle);
                    }
                }
            }

            app.manage(Mutex::new(state));

            // Spawn periodic auto-cleanup task
            let app_handle_cleanup = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600));
                loop {
                    interval.tick().await;
                    let state = app_handle_cleanup.state::<Mutex<AppState>>();
                    let app_state = match state.lock() {
                        Ok(s) => s,
                        Err(e) => {
                            log::error!("auto-cleanup: failed to lock state: {}", e);
                            continue;
                        }
                    };
                    match app_state.db.load_app_settings() {
                        Ok(settings) => {
                            match app_state.db.cleanup_old_messages(settings.message_retention_days) {
                                Ok(count) => {
                                    if count > 0 {
                                        log::info!("auto-cleanup: removed {} old messages", count);
                                    }
                                }
                                Err(e) => log::error!("auto-cleanup error: {}", e),
                            }
                        }
                        Err(e) => log::error!("auto-cleanup: failed to load settings: {}", e),
                    }
                }
            });

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
