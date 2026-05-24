//! Scope Creeper daemon, native edition.
//!
//! Watches all repos under known roots that contain `.scopecreeper.md`,
//! scores new commits via the scopecreeper.ai API, fires macOS
//! notifications when something interesting happens. Designed to sit
//! in the background indefinitely with bounded RAM — single instance
//! handles arbitrary repo count because each watch is OS-native, not
//! a JS object graph.

mod state;
mod git;
mod api;
mod notify;
mod discovery;
mod watcher;

use anyhow::Result;
use chrono::{Local, Timelike};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;

pub const DEFAULT_NOTIFY_THRESHOLD: u8 = 60;
pub const REGRESSION_DELTA: i16 = 20;
pub const STREAK_TRIGGER: u32 = 3;

pub fn log_line(msg: &str) {
    let ts = Local::now().format("%Y-%m-%d %H:%M:%S");
    println!("[{}] {}", ts, msg);
}

pub fn notify_threshold() -> u8 {
    std::env::var("SC_NOTIFY_THRESHOLD")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(DEFAULT_NOTIFY_THRESHOLD)
}

#[tokio::main(flavor = "multi_thread", worker_threads = 2)]
async fn main() -> Result<()> {
    if std::env::args().any(|a| a == "--help" || a == "-h") {
        println!("creeperd — scope-creeper background daemon");
        println!();
        println!("usage:  creeperd");
        println!();
        println!("env vars:");
        println!("  SC_API_URL              override base URL (default https://scopecreeper.ai)");
        println!("  SC_API_KEY              optional Pro key");
        println!("  SC_NOTIFY_THRESHOLD     score above which we notify (default 60)");
        println!("  SC_HOME                 override discovery root (default ~/Projects + ~/scopecreeper)");
        return Ok(());
    }

    log_line(&format!("creeperd starting (pid {})", std::process::id()));
    log_line(&format!("drift notify threshold: {}/100", notify_threshold()));

    let state_path = state::path()?;
    log_line(&format!("state file: {}", state_path.display()));

    let state = Arc::new(Mutex::new(state::load(&state_path).await?));
    let repos = discovery::discover().await?;
    log_line(&format!("discovered {} repos with .scopecreeper.md", repos.len()));

    if repos.is_empty() {
        log_line("no repos to watch. add one with: creeper init /path/to/repo");
        return Ok(());
    }

    let client = api::Client::new();
    let mut handles = Vec::new();

    for repo in &repos {
        log_line(&format!("watching {} ({})", repo.name, repo.path.display()));
        let repo = repo.clone();
        let state = state.clone();
        let client = client.clone();
        handles.push(tokio::spawn(async move {
            if let Err(e) = watcher::watch_repo(repo, state, client).await {
                log_line(&format!("watch err: {}", e));
            }
        }));
    }

    // Digest checker — fires once per day after 8am
    let digest_state = state.clone();
    let digest_repos = repos.clone();
    tokio::spawn(async move {
        let mut iv = tokio::time::interval(Duration::from_secs(5 * 60));
        loop {
            iv.tick().await;
            if let Err(e) = maybe_digest(&digest_state, &digest_repos).await {
                log_line(&format!("digest err: {}", e));
            }
        }
    });

    // Half-hourly memory sanity check
    tokio::spawn(async {
        let mut iv = tokio::time::interval(Duration::from_secs(30 * 60));
        iv.tick().await; // skip first immediate fire
        loop {
            iv.tick().await;
            if let Some(rss_kb) = read_rss_kb() {
                let mb = rss_kb / 1024;
                if mb > 64 {
                    log_line(&format!("⚠ memory: {} MB rss — investigate", mb));
                }
            }
        }
    });

    notify::send(notify::Notification {
        title: "🌀 scope creeper online".into(),
        subtitle: Some(format!("{} repo{} watched", repos.len(), if repos.len() == 1 { "" } else { "s" })),
        message: "ambient drift monitoring active".into(),
        key: "daemon::start".into(),
    });

    // Wait for SIGINT/SIGTERM
    tokio::signal::ctrl_c().await?;
    log_line("shutting down");
    for h in handles { h.abort(); }
    Ok(())
}

async fn maybe_digest(state: &Arc<Mutex<state::DaemonState>>, repos: &[discovery::Repo]) -> Result<()> {
    let now = Local::now();
    if now.hour() < 8 { return Ok(()); }
    let today = now.format("%Y-%m-%d").to_string();

    {
        let s = state.lock().await;
        if s.last_digest_day.as_deref() == Some(&today) {
            return Ok(());
        }
    }

    let lines: Vec<String> = {
        let s = state.lock().await;
        repos.iter()
            .filter_map(|r| {
                let rs = s.per_repo.get(r.path.to_str()?)?;
                let score = rs.last_score?;
                let flag = if score >= 71 { "✗" } else if score >= 50 { "△" } else { "·" };
                Some(format!("{} {}: {}/100", flag, r.name, score))
            })
            .collect()
    };

    if lines.is_empty() { return Ok(()); }

    notify::send(notify::Notification {
        title: format!("🌀 morning digest — {}", today),
        subtitle: Some(format!("{} repos · top of the day", lines.len())),
        message: lines.iter().take(5).cloned().collect::<Vec<_>>().join("  ·  "),
        key: format!("digest::{}", today),
    });
    log_line(&format!("digest sent for {}", today));

    let mut s = state.lock().await;
    s.last_digest_day = Some(today);
    state::save(&state::path()?, &s).await?;
    Ok(())
}

/// macOS-only RSS read via /proc-equivalent. Falls through on error.
fn read_rss_kb() -> Option<u64> {
    use std::process::Command;
    let pid = std::process::id().to_string();
    let out = Command::new("ps").args(["-o", "rss=", "-p", &pid]).output().ok()?;
    if !out.status.success() { return None; }
    let s = String::from_utf8(out.stdout).ok()?;
    s.trim().parse().ok()
}

