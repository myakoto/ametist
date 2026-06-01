use std::path::Path;
use serde::{Deserialize, Serialize};
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDir")]
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
}

#[tauri::command]
pub async fn open_vault_dialog(
    app: tauri::AppHandle,
) -> Result<Option<String>, AppError> {
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;

    let (tx, rx) = oneshot::channel();
    app.dialog()
        .file()
        .pick_folder(move |path| {
            let _ = tx.send(path);
        });
    let path = rx.await.ok().flatten();
    Ok(path.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn list_vault_files(vault_path: String) -> Result<Vec<FileNode>, AppError> {
    let root = Path::new(&vault_path);
    if !root.exists() || !root.is_dir() {
        return Err(AppError::Path(format!("Vault path does not exist: {vault_path}")));
    }
    Ok(build_tree(root, root))
}

fn build_tree(root: &Path, dir: &Path) -> Vec<FileNode> {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return vec![];
    };

    let mut nodes: Vec<FileNode> = entries
        .filter_map(|e| e.ok())
        .filter_map(|entry| {
            let path = entry.path();
            let name = path.file_name()?.to_str()?.to_owned();

            // skip hidden files/dirs
            if name.starts_with('.') {
                return None;
            }

            if path.is_dir() {
                let children = build_tree(root, &path);
                Some(FileNode {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_dir: true,
                    children: Some(children),
                })
            } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
                Some(FileNode {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_dir: false,
                    children: None,
                })
            } else {
                None
            }
        })
        .collect();

    nodes.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    nodes
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, AppError> {
    Ok(std::fs::read_to_string(&path)?)
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), AppError> {
    use std::io::Write;
    let tmp = tempfile::NamedTempFile::new_in(
        Path::new(&path).parent().unwrap_or(Path::new(".")),
    )?;
    let tmp_path = tmp.path().to_path_buf();
    {
        let mut f = tmp.as_file();
        f.write_all(content.as_bytes())?;
        f.flush()?;
    }
    std::fs::rename(&tmp_path, &path)?;
    Ok(())
}

#[tauri::command]
pub async fn create_file(path: String) -> Result<(), AppError> {
    std::fs::write(&path, "")?;
    Ok(())
}

#[tauri::command]
pub async fn create_dir(path: String) -> Result<(), AppError> {
    std::fs::create_dir_all(&path)?;
    Ok(())
}

#[tauri::command]
pub async fn rename_entry(old_path: String, new_path: String) -> Result<(), AppError> {
    std::fs::rename(&old_path, &new_path)?;
    Ok(())
}

#[tauri::command]
pub async fn delete_entry(path: String) -> Result<(), AppError> {
    let p = Path::new(&path);
    if p.is_dir() {
        std::fs::remove_dir_all(p)?;
    } else {
        std::fs::remove_file(p)?;
    }
    Ok(())
}
