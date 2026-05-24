use anyhow::Result;
use serde::Deserialize;
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::process::Command;

#[derive(Debug, Clone)]
pub struct Repo {
    pub name: String,
    pub path: PathBuf,
}

#[derive(Default, Deserialize)]
struct ReposConfig {
    #[serde(default)]
    paths: Vec<String>,
}

/// Discover all repos under known roots that contain a `.scopecreeper.md`,
/// plus any manually-pinned paths in ~/.config/scopecreeper/repos.json
/// (the same file the TUI writes).
pub async fn discover() -> Result<Vec<Repo>> {
    let mut roots: Vec<PathBuf> = Vec::new();
    if let Ok(home) = std::env::var("HOME") {
        let h = PathBuf::from(&home);
        roots.push(h.join("Projects"));
        roots.push(h.join("scopecreeper"));
    }
    if let Ok(extra) = std::env::var("SC_HOME") {
        for p in extra.split(':') { roots.push(PathBuf::from(p)); }
    }

    let mut found: Vec<Repo> = Vec::new();
    for root in &roots {
        if !root.exists() { continue; }
        find_in_root(root, 4, &mut found).await;
    }

    // Merge in pinned repos from config — match TS TUI's location
    if let Ok(home) = std::env::var("HOME") {
        let mut cfg_path = PathBuf::from(home);
        cfg_path.push(".config");
        cfg_path.push("scopecreeper");
        cfg_path.push("repos.json");
        if let Ok(raw) = fs::read_to_string(&cfg_path).await {
            if let Ok(cfg) = serde_json::from_str::<ReposConfig>(&raw) {
                for p in cfg.paths {
                    let pb = PathBuf::from(&p);
                    if pb.join(".scopecreeper.md").exists() {
                        let name = pb.file_name().and_then(|n| n.to_str()).unwrap_or(&p).to_string();
                        found.push(Repo { name, path: pb });
                    }
                }
            }
        }
    }

    // Dedup by path
    let mut seen = std::collections::HashSet::new();
    found.retain(|r| seen.insert(r.path.clone()));

    Ok(found)
}

async fn find_in_root(root: &Path, max_depth: u32, out: &mut Vec<Repo>) {
    // Shell out to `find` — same approach as the TS version, avoids
    // pulling in a walkdir dep just for this.
    let out_str = Command::new("find")
        .args([
            root.to_string_lossy().as_ref(),
            "-maxdepth",
            &max_depth.to_string(),
            "-name",
            ".scopecreeper.md",
            "-not",
            "-path",
            "*/node_modules/*",
            "-not",
            "-path",
            "*/.git/*",
        ])
        .output()
        .await;
    if let Ok(o) = out_str {
        if let Ok(s) = String::from_utf8(o.stdout) {
            for line in s.lines().filter(|l| !l.is_empty()) {
                let repo_path = PathBuf::from(line.trim_end_matches("/.scopecreeper.md"));
                let name = repo_path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
                if !name.is_empty() {
                    out.push(Repo { name, path: repo_path });
                }
            }
        }
    }
}

pub async fn load_scope_doc(repo: &Path) -> String {
    let scope = repo.join(".scopecreeper.md");
    if let Ok(s) = fs::read_to_string(&scope).await {
        return s;
    }
    let readme = repo.join("README.md");
    if let Ok(s) = fs::read_to_string(&readme).await {
        return s.chars().take(2000).collect();
    }
    String::new()
}
