use std::path::Path;
use std::sync::{Arc, Mutex};
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter};

pub struct VaultWatcher {
    _watcher: RecommendedWatcher,
}

#[derive(serde::Serialize, Clone)]
struct VaultChangedPayload {
    kind: String,
    path: String,
}

#[derive(serde::Serialize, Clone)]
struct FileExternallyModifiedPayload {
    path: String,
}

pub fn start_watcher(
    app: AppHandle,
    vault_path: &str,
    open_file: Arc<Mutex<Option<String>>>,
) -> Result<VaultWatcher, notify::Error> {
    let app_clone = app.clone();
    let open_file_clone = open_file.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: notify::Result<Event>| {
            let Ok(event) = res else { return };

            let kind_str = match &event.kind {
                EventKind::Create(_) => "created",
                EventKind::Modify(_) => "modified",
                EventKind::Remove(_) => "deleted",
                _ => return,
            };

            for path in &event.paths {
                let path_str = path.to_string_lossy().to_string();

                // check if it's the currently open file modified externally
                if kind_str == "modified" {
                    let open = open_file_clone.lock().unwrap();
                    if let Some(ref open_path) = *open {
                        if open_path == &path_str {
                            let _ = app_clone.emit(
                                "file_externally_modified",
                                FileExternallyModifiedPayload { path: path_str.clone() },
                            );
                        }
                    }
                }

                let _ = app_clone.emit(
                    "vault_changed",
                    VaultChangedPayload {
                        kind: kind_str.to_string(),
                        path: path_str,
                    },
                );
            }
        },
        Config::default(),
    )?;

    watcher.watch(Path::new(vault_path), RecursiveMode::Recursive)?;

    Ok(VaultWatcher { _watcher: watcher })
}
