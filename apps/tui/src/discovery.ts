import { spawnSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";

export interface TrackedRepo {
  name: string;
  path: string;
  scopeDoc: string;
}

const HOME = process.env.HOME ?? "";
const CONFIG_PATH = join(HOME, ".config", "scopecreeper", "repos.json");

const SEARCH_ROOTS = [
  HOME + "/Projects",
  HOME + "/scopecreeper",
];

function run(cmd: string, args: string[]): string {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 5000 });
  return r.status === 0 ? (r.stdout ?? "").trim() : "";
}

// ── Config-based repo list (persisted) ──────────────────────────────────────

interface RepoConfig {
  paths: string[];
}

async function readConfig(): Promise<RepoConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as RepoConfig;
  } catch {
    return { paths: [] };
  }
}

async function writeConfig(cfg: RepoConfig): Promise<void> {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

export async function addRepoToConfig(repoPath: string): Promise<boolean> {
  const abs = repoPath.replace(/^~/, HOME).replace(/\/$/, "");
  if (!existsSync(abs)) return false;
  const cfg = await readConfig();
  if (!cfg.paths.includes(abs)) {
    cfg.paths.push(abs);
    await writeConfig(cfg);
  }
  return true;
}

export async function removeRepoFromConfig(repoPath: string): Promise<void> {
  const cfg = await readConfig();
  cfg.paths = cfg.paths.filter((p) => p !== repoPath);
  await writeConfig(cfg);
}

// ── Discovery ────────────────────────────────────────────────────────────────

export async function discoverRepos(): Promise<TrackedRepo[]> {
  const found: TrackedRepo[] = [];

  // 1. Auto-scan known roots for .scopecreeper.md
  for (const root of SEARCH_ROOTS) {
    if (!existsSync(root)) continue;
    const output = run("find", [
      root, "-maxdepth", "4", "-name", ".scopecreeper.md",
      "-not", "-path", "*/node_modules/*",
      "-not", "-path", "*/.git/*",
    ]);
    for (const filePath of output.split("\n").filter(Boolean)) {
      const repoPath = filePath.replace("/.scopecreeper.md", "");
      const name = repoPath.split("/").pop() ?? repoPath;
      found.push({ name, path: repoPath, scopeDoc: "" });
    }
  }

  // 2. Add manually-pinned repos from config
  const cfg = await readConfig();
  for (const p of cfg.paths) {
    if (!found.some((r) => r.path === p)) {
      const name = p.split("/").pop() ?? p;
      found.push({ name, path: p, scopeDoc: "" });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return found.filter((r) => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });
}

export async function loadScopeDoc(repoPath: string): Promise<string> {
  try {
    return await readFile(join(repoPath, ".scopecreeper.md"), "utf8");
  } catch {
    // Fall back to README
    try {
      const readme = await readFile(join(repoPath, "README.md"), "utf8");
      return readme.slice(0, 2000);
    } catch {
      return "(no scope doc or README found)";
    }
  }
}

export interface CommitInfo {
  hash: string;
  subject: string;
  author: string;
  diffStat: string;
  /** Top N changed file diffs, hunks included, truncated. Real evidence
   *  for the LLM to cite ("apps/web/billing/page.tsx +47 lines"). */
  diffHunks: string;
  branch: string;
}

export function getLatestCommit(repoPath: string): CommitInfo | null {
  const log = run("git", ["-C", repoPath, "log", "-1", "--format=%H|||%s|||%an"]);
  if (!log) return null;
  const [hash, subject, author] = log.split("|||");
  const diffStat = run("git", ["-C", repoPath, "show", "--stat", "--format=", "HEAD"]).slice(0, 600);
  const branch = run("git", ["-C", repoPath, "rev-parse", "--abbrev-ref", "HEAD"]) || "HEAD";

  // Get the actual diff hunks, but capped to keep LLM payload manageable.
  // Strip lock/build artifacts that drown out the signal.
  const fullDiff = run("git", [
    "-C", repoPath, "show", "HEAD", "--format=",
    "--", ".", ":(exclude)*.lock", ":(exclude)pnpm-lock.yaml",
    ":(exclude)package-lock.json", ":(exclude)dist/*", ":(exclude)*.min.*",
  ]);
  const diffHunks = fullDiff.slice(0, 3000);

  return {
    hash: (hash ?? "").slice(0, 8),
    subject: subject ?? "",
    author: author ?? "",
    diffStat,
    diffHunks,
    branch,
  };
}

export function getRecentCommits(repoPath: string, n = 5): string {
  return run("git", ["-C", repoPath, "log", `-${n}`, "--oneline"]);
}
