/**
 * Pattern surveillance over the justification log + per-repo diaries.
 *
 * Run weekly (or on-demand via `creeper patterns`). Scans recent
 * activity and surfaces behavioral patterns the user can't see
 * commit-by-commit:
 *
 *   - "You picked EXPAND 6 times this month on apps/web/billing/*"
 *     → scope is creeping in one specific direction; declare it or stop
 *
 *   - "You DISMISSED 11 drifts this month, 9 of them on auth files"
 *     → you're avoiding the real work; the auth refactor needs attention
 *
 *   - "You ACCEPTed 14 drifts on dittomethis with no scope changes"
 *     → silent scope expansion via ACCEPT-without-EXPAND
 *
 *   - "3 repos have drifted to ABYSS in 7 days"
 *     → broad pattern across the portfolio, not one repo's problem
 *
 * Pure functions over loaded data, so the same code runs in the TUI
 * modal, the daemon's weekly notification, and the CLI subcommand.
 */
import { loadJustifications, type Justification } from "./justifications.js";

export type FindingSeverity = "high" | "warn" | "info";

export interface Finding {
  severity: FindingSeverity;
  /** Short one-liner: "You picked EXPAND 6 times on billing files." */
  headline: string;
  /** Concrete evidence — file paths, repo names, dates. */
  evidence: string[];
  /** Single suggested next move. */
  suggestion: string;
  /** Scope of impact — which repo(s). */
  repos: string[];
}

interface Bucket {
  count: number;
  hashes: Set<string>;
  files: Set<string>;
  firstTs: number;
  lastTs: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 30;

export interface AnalysisOptions {
  /** Only count entries newer than now - windowDays. */
  windowDays?: number;
}

export async function analyzePatterns(opts: AnalysisOptions = {}): Promise<Finding[]> {
  const entries = await loadJustifications();
  return analyzeFrom(entries, opts);
}

/** Pure function variant for testing — pass entries directly. */
export function analyzeFrom(entries: Justification[], opts: AnalysisOptions = {}): Finding[] {
  const windowDays = opts.windowDays ?? DEFAULT_WINDOW_DAYS;
  const cutoff = Date.now() - windowDays * DAY_MS;
  const recent = entries.filter((e) => e.ts >= cutoff);
  if (!recent.length) return [];

  const findings: Finding[] = [];

  // ── 1. Per-repo EXPAND clustering ─────────────────────────────────────
  // If the user picks EXPAND repeatedly on the same area, that's silent
  // scope inflation. Surface it.
  const expandByRepo: Map<string, Bucket> = new Map();
  for (const e of recent) {
    if (!actionOf(e).includes("EXPAND")) continue;
    const b = expandByRepo.get(e.repo) ?? newBucket();
    b.count++;
    b.hashes.add(e.hash);
    b.lastTs = Math.max(b.lastTs, e.ts);
    b.firstTs = Math.min(b.firstTs, e.ts);
    extractFileHints(e.subject).forEach((f) => b.files.add(f));
    expandByRepo.set(e.repo, b);
  }
  for (const [repo, b] of expandByRepo) {
    if (b.count < 3) continue;
    const top = topFiles(b.files);
    findings.push({
      severity: b.count >= 6 ? "high" : "warn",
      headline: `${b.count} EXPAND decisions on ${repo} in ${windowDays}d — scope is growing in one direction`,
      evidence: top.length ? [`recurring areas: ${top.join(", ")}`] : [`spread across ${b.files.size} touched paths`],
      suggestion: top.length
        ? `Either commit to ${top[0]} as a first-class part of scope, or stop expanding into it.`
        : "Pull up `.scopecreeper.md` — your declared scope and your actual decisions are drifting apart.",
      repos: [repo],
    });
  }

  // ── 2. Per-repo DISMISSED clustering ──────────────────────────────────
  // Dismissals are avoidance signals. If you keep dismissing on the same
  // area, you're avoiding work you don't want to defend.
  const dismissByRepo: Map<string, Bucket> = new Map();
  for (const e of recent) {
    if (!isDismissal(e)) continue;
    const b = dismissByRepo.get(e.repo) ?? newBucket();
    b.count++;
    b.hashes.add(e.hash);
    b.lastTs = Math.max(b.lastTs, e.ts);
    b.firstTs = Math.min(b.firstTs, e.ts);
    extractFileHints(e.subject).forEach((f) => b.files.add(f));
    dismissByRepo.set(e.repo, b);
  }
  for (const [repo, b] of dismissByRepo) {
    if (b.count < 4) continue;
    const top = topFiles(b.files);
    findings.push({
      severity: "high",
      headline: `${b.count} dismissed drifts on ${repo} in ${windowDays}d — what are you avoiding?`,
      evidence: top.length ? [`avoidance clusters at: ${top.join(", ")}`] : [`${b.count} drifts walked past without engagement`],
      suggestion: top.length
        ? `Open a creeper picker on ${repo} and actually pick a route on the next ${top[0]} drift.`
        : `Open a creeper picker on ${repo} — the dismissal pattern is itself the signal.`,
      repos: [repo],
    });
  }

  // ── 3. Portfolio-wide drift heat ──────────────────────────────────────
  // Across all repos, how many distinct projects hit ABYSS or DELUSION
  // this week?
  const recentWeek = recent.filter((e) => e.ts >= Date.now() - 7 * DAY_MS);
  const hotRepos = new Set<string>();
  for (const e of recentWeek) {
    if (e.score >= 71) hotRepos.add(e.repo);
  }
  if (hotRepos.size >= 3) {
    findings.push({
      severity: "high",
      headline: `${hotRepos.size} repos drifted into ABYSS this week`,
      evidence: [...hotRepos].slice(0, 6).map((r) => `· ${r}`),
      suggestion: "Pick the 1 you care most about and shut down work on the rest until it's back in sweetspot. Splitting attention is itself the drift.",
      repos: [...hotRepos],
    });
  }

  // ── 4. Repeat REDIRECT — almost-drifting in same direction ─────────────
  // If you keep REDIRECTing on the same area, AI keeps trying to drag you
  // there. That's a strong signal it WILL happen eventually.
  const redirectByRepo: Map<string, Bucket> = new Map();
  for (const e of recent) {
    if (!actionOf(e).includes("REDIRECT")) continue;
    const b = redirectByRepo.get(e.repo) ?? newBucket();
    b.count++;
    extractFileHints(e.subject).forEach((f) => b.files.add(f));
    redirectByRepo.set(e.repo, b);
  }
  for (const [repo, b] of redirectByRepo) {
    if (b.count < 4) continue;
    const top = topFiles(b.files);
    findings.push({
      severity: "warn",
      headline: `${b.count} REDIRECTs on ${repo} — your AI keeps trying to drag you somewhere`,
      evidence: top.length ? [`recurring direction: ${top.join(", ")}`] : [],
      suggestion: top.length
        ? `Why does AI keep proposing ${top[0]}? Either the codebase suggests it (rename/move files), or your scope doc is being read wrong.`
        : "Re-read your .scopecreeper.md aloud. The drift you keep blocking is the drift Claude is interpreting from your code.",
      repos: [repo],
    });
  }

  // Sort: high → warn → info, then by repo count desc
  return findings.sort((a, b) => {
    const sev = sevWeight(b.severity) - sevWeight(a.severity);
    if (sev !== 0) return sev;
    return b.repos.length - a.repos.length;
  });
}

// ── helpers ────────────────────────────────────────────────────────────

function newBucket(): Bucket {
  return { count: 0, hashes: new Set(), files: new Set(), firstTs: Number.MAX_SAFE_INTEGER, lastTs: 0 };
}

function actionOf(e: Justification): string {
  // Justifications written by executeAction format the justification as
  // "ACTION: note". This recovers the chosen action; for legacy entries
  // (just a raw answer) we return empty.
  const j = e.justification ?? "";
  const m = j.match(/^([A-Z]+):/);
  return m ? m[1] : "";
}

function isDismissal(e: Justification): boolean {
  const j = (e.justification ?? "").trim();
  return j === "" || j === "DISMISSED:" || j.startsWith("DISMISSED:");
}

/** Pull words that look like file paths or directory names from a subject. */
function extractFileHints(subject: string): string[] {
  const out: string[] = [];
  const pathLike = subject.match(/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_./*-]+/g) ?? [];
  out.push(...pathLike.map((p) => p.slice(0, 80)));
  // Also extract "billing", "auth", etc. — words that look like feature areas
  // when no path is present.
  if (!pathLike.length) {
    const featureWords = subject.toLowerCase().match(/\b(billing|auth|dashboard|admin|api|payments?|referral|onboarding|notifications?|settings?|profile|search|mobile|chat|messaging|notifications?)\b/g) ?? [];
    out.push(...new Set(featureWords));
  }
  return out;
}

/** Bucket files by their top directory segment and return the heaviest. */
function topFiles(files: Set<string>): string[] {
  if (!files.size) return [];
  const byDir: Map<string, number> = new Map();
  for (const f of files) {
    const dir = f.includes("/") ? f.split("/").slice(0, 2).join("/") : f;
    byDir.set(dir, (byDir.get(dir) ?? 0) + 1);
  }
  return [...byDir.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dir]) => dir);
}

function sevWeight(s: FindingSeverity): number {
  return s === "high" ? 3 : s === "warn" ? 2 : 1;
}
