/**
 * `creeper daemon` — background watcher that lives in your terminal (or
 * a launchd service) and fires macOS notifications when something
 * actually interesting happens. Designed to never interrupt your flow.
 *
 * Triggers a notification when:
 *   - A new commit lands with score >= 60
 *   - Score regresses >= 20 from the previous commit on that repo
 *   - Three consecutive drifts (sustained drift, even small)
 *   - Daily digest at 9am local: one summary across all watched repos
 *
 * Persistent state lives in ~/.config/scopecreeper/daemon-state.json so
 * the daemon can survive restarts without re-notifying about old drifts.
 */
import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import {
  discoverRepos, loadScopeDoc, getLatestCommit, type TrackedRepo,
} from "../discovery.js";
import { watchRepo } from "../watcher.js";
import { scanCommit } from "../api.js";
import { notify } from "../notify.js";
import { appendJustification } from "../justifications.js";
import { analyzePatterns } from "../patterns.js";

const HOME = process.env.HOME ?? "";
const STATE_PATH = join(HOME, ".config", "scopecreeper", "daemon-state.json");
const DRIFT_NOTIFY_THRESHOLD = Number(process.env.SC_NOTIFY_THRESHOLD ?? 60);
const REGRESSION_DELTA = 20;

interface RepoState {
  lastScore: number | null;
  lastTier: string | null;
  consecutiveDrifts: number;
  lastNotifyAt: number;
}

interface DaemonState {
  perRepo: Record<string, RepoState>;
  lastDigestDay: string; // YYYY-MM-DD
  /** ISO week string of the last weekly pattern notification (e.g. "2026-W21"). */
  lastWeeklyPatternsWeek?: string;
}

async function readState(): Promise<DaemonState> {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf8")) as DaemonState;
  } catch {
    return { perRepo: {}, lastDigestDay: "" };
  }
}

async function writeState(s: DaemonState): Promise<void> {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(s, null, 2));
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ts(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function log(msg: string): void {
  process.stdout.write(`[${ts()}] ${msg}\n`);
}

async function attachWatchers(repos: TrackedRepo[], state: DaemonState): Promise<void> {
  for (const repo of repos) {
    const scopeDoc = await loadScopeDoc(repo.path);
    const prev = state.perRepo[repo.path] ?? { lastScore: null, lastTier: null, consecutiveDrifts: 0, lastNotifyAt: 0 };
    state.perRepo[repo.path] = prev;

    watchRepo(repo.path, async (repoPath, commit) => {
      log(`commit ${commit.hash} in ${repo.name}: scoring...`);
      const result = await scanCommit(commit, scopeDoc);
      if (!result) {
        log(`  api unreachable, skipping`);
        return;
      }
      log(`  ${result.score}/100 ${result.tier} · ${result.verdict}`);

      // Update state
      const repoState = state.perRepo[repoPath];
      const previousScore = repoState.lastScore;
      repoState.lastScore = result.score;
      repoState.lastTier = result.tier;
      if (result.score >= 50) {
        repoState.consecutiveDrifts += 1;
      } else {
        repoState.consecutiveDrifts = 0;
      }

      // Decide whether to notify
      const reasons: string[] = [];
      if (result.score >= DRIFT_NOTIFY_THRESHOLD) reasons.push("high");
      if (previousScore !== null && result.score - previousScore >= REGRESSION_DELTA) {
        reasons.push(`+${result.score - previousScore}`);
      }
      if (repoState.consecutiveDrifts >= 3) reasons.push(`${repoState.consecutiveDrifts}-streak`);

      if (reasons.length) {
        notify({
          title: `🌀 ${repo.name}`,
          subtitle: `${result.score}/100  ${result.tier.toUpperCase()}  (${reasons.join(", ")})`,
          message: result.verdict,
          key: `daemon::${repo.name}::${result.tier}::${reasons.join(",")}`,
        });
        repoState.lastNotifyAt = Date.now();
        log(`  → notified (${reasons.join(", ")})`);
      }

      // Always log for TUI / future review
      await appendJustification({
        repo: repo.name, path: repoPath, hash: commit.hash, subject: commit.subject,
        score: result.score, tier: result.tier, verdict: result.verdict, justification: "",
      });

      await writeState(state);
    });

    log(`watching ${repo.name} (${repo.path})`);
  }
}

async function maybeDigest(state: DaemonState, repos: TrackedRepo[]): Promise<void> {
  const now = new Date();
  const today = todayYmd();
  if (state.lastDigestDay === today) return;
  // Fire only after 8am local
  if (now.getHours() < 8) return;

  const lines: string[] = [];
  for (const r of repos) {
    const s = state.perRepo[r.path];
    if (!s || s.lastScore === null) continue;
    const flag = s.lastScore >= 71 ? "✗" : s.lastScore >= 50 ? "△" : "·";
    lines.push(`${flag} ${r.name}: ${s.lastScore}/100`);
  }
  if (!lines.length) return;

  notify({
    title: `🌀 morning digest — ${today}`,
    subtitle: `${lines.length} repos · top of the day`,
    message: lines.slice(0, 5).join("  ·  "),
    key: `digest::${today}`,
  });
  log(`digest sent for ${today}`);
  state.lastDigestDay = today;
  await writeState(state);
}

/**
 * Once a week (Sunday after 9am), run pattern surveillance over the
 * last 30d of justifications and surface the top finding as a
 * notification. The full report stays in `creeper patterns`.
 */
async function maybeWeeklyPatterns(state: DaemonState): Promise<void> {
  const now = new Date();
  if (now.getDay() !== 0) return; // Sunday only
  if (now.getHours() < 9) return;
  const weekKey = isoWeek(now);
  if (state.lastWeeklyPatternsWeek === weekKey) return;

  const findings = await analyzePatterns({ windowDays: 30 });
  if (!findings.length) {
    state.lastWeeklyPatternsWeek = weekKey;
    await writeState(state);
    return;
  }
  const top = findings[0];
  notify({
    title: "🌀 real talk · weekly patterns",
    subtitle: `${findings.length} pattern${findings.length === 1 ? "" : "s"} surfaced`,
    message: top.headline + "  ·  run `creeper patterns` for the full report",
    key: `weekly-patterns::${weekKey}`,
  });
  log(`weekly patterns sent for ${weekKey} (${findings.length} findings)`);
  state.lastWeeklyPatternsWeek = weekKey;
  await writeState(state);
}

function isoWeek(d: Date): string {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export async function runDaemon(): Promise<number> {
  log(`creeper daemon starting (pid ${process.pid})`);
  log(`drift notify threshold: ${DRIFT_NOTIFY_THRESHOLD}/100`);
  log(`state file: ${STATE_PATH}`);

  // Periodic memory log so we can spot leaks. RSS in MB.
  setInterval(() => {
    const rss = process.memoryUsage.rss();
    const mb = (rss / 1024 / 1024).toFixed(1);
    if (rss > 200 * 1024 * 1024) log(`⚠ memory: ${mb} MB rss — investigate`);
  }, 30 * 60 * 1000).unref();

  const state = await readState();
  const repos = await discoverRepos();
  log(`discovered ${repos.length} repos with .scopecreeper.md`);

  if (!repos.length) {
    log(`no repos to watch. add one with: creeper init /path/to/repo`);
    return 0;
  }

  await attachWatchers(repos, state);
  await writeState(state);

  // Daily digest check every 5 minutes
  setInterval(() => { maybeDigest(state, repos).catch((e) => log(`digest err: ${e}`)); }, 5 * 60 * 1000);
  setInterval(() => { maybeWeeklyPatterns(state).catch((e) => log(`patterns err: ${e}`)); }, 15 * 60 * 1000);
  await maybeDigest(state, repos);
  await maybeWeeklyPatterns(state);

  notify({
    title: "🌀 scope creeper online",
    subtitle: `${repos.length} repo${repos.length === 1 ? "" : "s"} watched`,
    message: "ambient drift monitoring active",
    key: "daemon::start",
  });

  // Stay alive
  return new Promise((resolve) => {
    process.on("SIGINT", () => { log("shutting down"); resolve(0); });
    process.on("SIGTERM", () => { log("shutting down"); resolve(0); });
  });
}
