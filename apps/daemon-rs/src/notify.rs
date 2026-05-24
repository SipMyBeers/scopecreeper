use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

const THROTTLE: Duration = Duration::from_secs(5 * 60);
const MAX_KEYS: usize = 200;

static RECENT: Mutex<Option<HashMap<String, Instant>>> = Mutex::new(None);

pub struct Notification {
    pub title: String,
    pub subtitle: Option<String>,
    pub message: String,
    pub key: String,
}

pub fn send(n: Notification) {
    // Throttle: same key within 5 min → silent
    {
        let mut guard = RECENT.lock().unwrap();
        let map = guard.get_or_insert_with(HashMap::new);
        if let Some(last) = map.get(&n.key) {
            if last.elapsed() < THROTTLE {
                return;
            }
        }
        map.insert(n.key.clone(), Instant::now());
        // Backstop — purge oldest if we somehow exceed cap
        if map.len() > MAX_KEYS {
            let mut entries: Vec<_> = map.iter().map(|(k, v)| (k.clone(), *v)).collect();
            entries.sort_by_key(|(_, v)| *v);
            for (k, _) in entries.into_iter().take(map.len() - MAX_KEYS) {
                map.remove(&k);
            }
        }
    }

    if cfg!(not(target_os = "macos")) {
        eprintln!("[notify] {}: {}", n.title, n.message);
        return;
    }

    let mut script = format!(
        "display notification {} with title {}",
        applescript_string(&n.message),
        applescript_string(&n.title),
    );
    if let Some(sub) = &n.subtitle {
        script.push_str(&format!(" subtitle {}", applescript_string(sub)));
    }

    let _ = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();
}

fn applescript_string(s: &str) -> String {
    // AppleScript strings are double-quoted with backslash escapes for " and \
    let escaped = s.replace('\\', "\\\\").replace('"', "\\\"");
    format!("\"{}\"", escaped)
}
