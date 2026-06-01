mod commands;
mod error;
mod watcher;

use std::sync::{Arc, Mutex};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(Arc::new(Mutex::new(None::<watcher::VaultWatcher>)))
        .manage(Arc::new(Mutex::new(None::<String>)))
        .invoke_handler(tauri::generate_handler![
            commands::vault::open_vault_dialog,
            commands::vault::list_vault_files,
            commands::vault::read_file,
            commands::vault::write_file,
            commands::vault::create_file,
            commands::vault::create_dir,
            commands::vault::rename_entry,
            commands::vault::delete_entry,
            commands::vault::search_backlinks,
            commands::config::get_config,
            commands::config::set_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
