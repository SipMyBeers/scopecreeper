/**
 * Ambient notification layer. macOS for now (osascript). Throttled so
 * we don't spam the same insight twice within 5 minutes.
 */
import { spawn } from "child_process";

const recent: Map<string, number> = new Map();
const THROTTLE_MS = 5 * 60 * 1000;
const MAX_KEYS = 200;

// Purge keys older than 1 hour every 10 minutes so the Map can't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [k, ts] of recent) if (ts < cutoff) recent.delete(k);
  // Hard cap as a backstop
  if (recent.size > MAX_KEYS) {
    const sorted = [...recent.entries()].sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < sorted.length - MAX_KEYS; i++) recent.delete(sorted[i][0]);
  }
}, 10 * 60 * 1000).unref();

interface Opts {
  title: string;
  message: string;
  /** A throttle key — same key within 5 min won't re-fire. */
  key?: string;
  /** Subtitle line (macOS only). */
  subtitle?: string;
  /** "default" plays the system sound. */
  sound?: string;
}

export function notify(opts: Opts): void {
  const key = opts.key ?? `${opts.title}::${opts.message}`;
  const last = recent.get(key);
  if (last && Date.now() - last < THROTTLE_MS) return;
  recent.set(key, Date.now());

  if (process.platform !== "darwin") {
    // Fallback: just write to stderr so daemon log shows it
    process.stderr.write(`[notify] ${opts.title}: ${opts.message}\n`);
    return;
  }

  const parts: string[] = [
    `display notification ${JSON.stringify(opts.message)}`,
    `with title ${JSON.stringify(opts.title)}`,
  ];
  if (opts.subtitle) parts.push(`subtitle ${JSON.stringify(opts.subtitle)}`);
  if (opts.sound) parts.push(`sound name ${JSON.stringify(opts.sound)}`);

  const script = parts.join(" ");
  // Fire and forget — never block the caller for a notification
  const child = spawn("osascript", ["-e", script], { detached: true, stdio: "ignore" });
  child.unref();
}
