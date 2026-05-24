use anyhow::Result;
use notify::{Event, RecursiveMode, Watcher};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};

use crate::api::Client;
use crate::discovery::{load_scope_doc, Repo};
use crate::git::latest_commit;
use crate::notify::{send as notify_send, Notification};
use crate::state::{DaemonState, RepoState};
use crate::{log_line, notify_threshold, REGRESSION_DELTA, STREAK_TRIGGER};

pub async fn watch_repo(repo: Repo, state: Arc<Mutex<DaemonState>>, client: Client) -> Result<()> {
    let scope_doc = load_scope_doc(&repo.path).await;

    // Seed last-known commit hash so we don't fire on the watcher's initial event
    let mut last_seen_hash = match latest_commit(&repo.path).await? {
        Some(c) => c.hash,
        None => String::new(),
    };

    let commit_path = repo.path.join(".git").join("COMMIT_EDITMSG");

    // notify-rs uses a blocking-style API; bridge it to async via mpsc
    let (tx, mut rx) = mpsc::unbounded_channel::<()>();
    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        if let Ok(ev) = res {
            if matches!(ev.kind, notify::EventKind::Modify(_) | notify::EventKind::Create(_)) {
                let _ = tx.send(());
            }
        }
    })?;

    // Watch the COMMIT_EDITMSG file — written on every commit
    if commit_path.exists() {
        watcher.watch(&commit_path, RecursiveMode::NonRecursive)?;
    } else {
        // If the file doesn't exist yet (fresh repo), watch the parent dir.
        if let Some(parent) = commit_path.parent() {
            watcher.watch(parent, RecursiveMode::NonRecursive)?;
        }
    }

    while rx.recv().await.is_some() {
        // Coalesce burst events
        tokio::time::sleep(std::time::Duration::from_millis(150)).await;
        while rx.try_recv().is_ok() {}

        let commit = match latest_commit(&repo.path).await? {
            Some(c) => c,
            None => continue,
        };
        if commit.hash == last_seen_hash { continue; }
        last_seen_hash = commit.hash.clone();

        log_line(&format!("commit {} in {}: scoring...", commit.hash, repo.name));
        let result = match client.scan_commit(&commit, &scope_doc).await? {
            Some(r) => r,
            None => { log_line("  api unreachable, skipping"); continue; }
        };
        log_line(&format!("  {}/100 {} · {}", result.score, result.tier, result.verdict));

        let mut s = state.lock().await;
        let key = repo.path.to_string_lossy().to_string();
        let entry = s.per_repo.entry(key.clone()).or_insert_with(RepoState::default);
        let previous = entry.last_score;
        entry.last_score = Some(result.score);
        entry.last_tier = Some(result.tier.clone());
        if result.score >= 50 { entry.consecutive_drifts += 1; } else { entry.consecutive_drifts = 0; }
        let streak = entry.consecutive_drifts;
        drop(s);

        let mut reasons: Vec<String> = Vec::new();
        if result.score >= notify_threshold() { reasons.push("high".into()); }
        if let Some(prev) = previous {
            let delta = (result.score as i16) - (prev as i16);
            if delta >= REGRESSION_DELTA { reasons.push(format!("+{}", delta)); }
        }
        if streak >= STREAK_TRIGGER { reasons.push(format!("{}-streak", streak)); }

        if !reasons.is_empty() {
            notify_send(Notification {
                title: format!("🌀 {}", repo.name),
                subtitle: Some(format!("{}/100  {}  ({})", result.score, result.tier.to_uppercase(), reasons.join(", "))),
                message: result.verdict.clone(),
                key: format!("daemon::{}::{}::{}", repo.name, result.tier, reasons.join(",")),
            });
            log_line(&format!("  → notified ({})", reasons.join(", ")));
            let mut s = state.lock().await;
            if let Some(e) = s.per_repo.get_mut(&key) { e.last_notify_at = chrono::Local::now().timestamp(); }
            drop(s);
        }

        // Persist
        let s = state.lock().await;
        let _ = crate::state::save(&crate::state::path()?, &s).await;
    }

    Ok(())
}
