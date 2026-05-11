mod config;
mod database;
mod error;
mod models;

use config::Config;
use database::Database;
use std::sync::Mutex;

pub struct AppState {
    pub db: Database,
    pub config: Config,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
        .manage(Mutex::new(AppState { db, config }))
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
