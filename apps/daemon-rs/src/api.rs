use anyhow::Result;
use serde::Deserialize;
use std::time::Duration;

const DEFAULT_BASE: &str = "https://5a854fca.scopecreeper.pages.dev";

#[derive(Debug, Clone)]
pub struct Client {
    inner: reqwest::Client,
    base: String,
    api_key: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ScoreResponse {
    pub score: f64,
    pub tier: String,
    pub verdict: String,
    pub analysis: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ScanResult {
    pub score: u8,
    pub tier: String,
    pub verdict: String,
    pub analysis: String,
}

impl Client {
    pub fn new() -> Self {
        let inner = reqwest::Client::builder()
            .timeout(Duration::from_secs(20))
            .user_agent(concat!("creeperd/", env!("CARGO_PKG_VERSION")))
            .build()
            .expect("reqwest client");
        Self {
            inner,
            base: std::env::var("SC_API_URL").unwrap_or_else(|_| DEFAULT_BASE.to_string()),
            api_key: std::env::var("SC_API_KEY").ok().filter(|s| !s.is_empty()),
        }
    }

    pub async fn scan_commit(
        &self,
        commit: &crate::git::Commit,
        scope_doc: &str,
    ) -> Result<Option<ScanResult>> {
        let scope_capped: String = scope_doc.chars().take(1200).collect();
        let payload = format!(
            "Branch: {}\nCommit: {} ({})\n\nFiles changed:\n{}\n\nDiff (capped):\n{}\n\nDeclared scope of this project:\n{}\n\nScore this commit. If it introduces a file or feature NOT mentioned in the scope, say so explicitly with the file path. Verdict in 4-6 ALL-CAPS words.",
            commit.branch, commit.subject, commit.hash,
            commit.diff_stat, commit.diff_hunks, scope_capped
        );
        let capped: String = payload.chars().take(6000).collect();

        let url = format!("{}/api/score", self.base);
        let mut req = self.inner.post(&url).json(&serde_json::json!({
            "kind": "chatlog",
            "payload": capped,
        }));
        if let Some(k) = &self.api_key {
            req = req.header("x-api-key", k);
        }

        let resp = match req.send().await {
            Ok(r) => r,
            Err(_) => return Ok(None),
        };
        if !resp.status().is_success() {
            return Ok(None);
        }
        let parsed: ScoreResponse = match resp.json().await {
            Ok(p) => p,
            Err(_) => return Ok(None),
        };
        let score = parsed.score.clamp(0.0, 100.0).round() as u8;
        Ok(Some(ScanResult {
            score,
            tier: parsed.tier,
            verdict: parsed.verdict,
            analysis: parsed.analysis.unwrap_or_default(),
        }))
    }
}
