use anyhow::Result;
use std::path::Path;
use tokio::process::Command;

async fn run(args: &[&str], cwd: &Path) -> Result<String> {
    let out = Command::new("git").args(args).current_dir(cwd).output().await?;
    if !out.status.success() {
        return Ok(String::new());
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

#[derive(Debug, Clone)]
pub struct Commit {
    pub hash: String,
    pub subject: String,
    pub branch: String,
    pub diff_stat: String,
    pub diff_hunks: String,
}

pub async fn latest_commit(repo: &Path) -> Result<Option<Commit>> {
    let log = run(&["log", "-1", "--format=%H|||%s"], repo).await?;
    if log.is_empty() { return Ok(None); }
    let mut parts = log.splitn(2, "|||");
    let hash = parts.next().unwrap_or("").chars().take(8).collect::<String>();
    let subject = parts.next().unwrap_or("").to_string();

    let branch = run(&["rev-parse", "--abbrev-ref", "HEAD"], repo).await?;
    let branch = if branch.is_empty() { "HEAD".to_string() } else { branch };

    let stat = run(&["show", "--stat", "--format=", "HEAD"], repo).await?;
    let diff_stat: String = stat.chars().take(600).collect();

    let hunks = run(&[
        "show", "HEAD", "--format=", "--",
        ".",
        ":(exclude)*.lock",
        ":(exclude)pnpm-lock.yaml",
        ":(exclude)package-lock.json",
        ":(exclude)dist/*",
        ":(exclude)*.min.*",
    ], repo).await?;
    let diff_hunks: String = hunks.chars().take(3000).collect();

    Ok(Some(Commit { hash, subject, branch, diff_stat, diff_hunks }))
}
