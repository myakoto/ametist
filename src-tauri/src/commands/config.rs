use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::Manager;
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EditorConfig {
    pub font_size: u32,
    pub word_wrap: bool,
    pub line_numbers: bool,
    pub tab_size: u32,
    pub use_tabs: bool,
}

impl Default for EditorConfig {
    fn default() -> Self {
        Self {
            font_size: 14,
            word_wrap: true,
            line_numbers: false,
            tab_size: 2,
            use_tabs: false,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub vault_path: Option<String>,
    pub theme: String,
    pub custom_theme: std::collections::HashMap<String, String>,
    pub editor: EditorConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            vault_path: None,
            theme: "dark".to_string(),
            custom_theme: std::collections::HashMap::new(),
            editor: EditorConfig::default(),
        }
    }
}

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| AppError::Config(e.to_string()))?;
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("config.json"))
}

#[tauri::command]
pub async fn get_config(app: tauri::AppHandle) -> Result<AppConfig, AppError> {
    let path = config_path(&app)?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let data = std::fs::read_to_string(&path)?;
    let config: AppConfig = serde_json::from_str(&data)?;
    Ok(config)
}

#[tauri::command]
pub async fn set_config(app: tauri::AppHandle, config: AppConfig) -> Result<(), AppError> {
    use std::io::Write;
    let path = config_path(&app)?;
    let tmp = tempfile::NamedTempFile::new_in(path.parent().unwrap())?;
    let tmp_path = tmp.path().to_path_buf();
    {
        let mut f = tmp.as_file();
        let data = serde_json::to_string_pretty(&config)?;
        f.write_all(data.as_bytes())?;
        f.flush()?;
    }
    std::fs::rename(&tmp_path, &path)?;
    Ok(())
}
