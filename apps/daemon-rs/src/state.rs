use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tokio::fs;

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct RepoState {
    pub last_score: Option<u8>,
    pub last_tier: Option<String>,
    pub consecutive_drifts: u32,
    pub last_notify_at: i64,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct DaemonState {
    #[serde(default)]
    pub per_repo: HashMap<String, RepoState>,
    pub last_digest_day: Option<String>,
}

pub fn path() -> Result<PathBuf> {
    // Match the TS TUI which writes to ~/.config/scopecreeper/ regardless
    // of platform, so both halves of the tool share the same state files.
    let mut p = PathBuf::from(std::env::var("HOME").unwrap_or_default());
    p.push(".config");
    p.push("scopecreeper");
    p.push("daemon-state.json");
    Ok(p)
}

pub async fn load(p: &Path) -> Result<DaemonState> {
    match fs::read_to_string(p).await {
        Ok(raw) => Ok(serde_json::from_str(&raw).unwrap_or_default()),
        Err(_) => Ok(DaemonState::default()),
    }
}

pub async fn save(p: &Path, s: &DaemonState) -> Result<()> {
    if let Some(dir) = p.parent() {
        fs::create_dir_all(dir).await?;
    }
    fs::write(p, serde_json::to_vec_pretty(s)?).await?;
    Ok(())
}
