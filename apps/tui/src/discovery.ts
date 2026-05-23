import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

export interface TrackedRepo {
  name: string;
  path: string;
  scopeDoc: string;
}

const SEARCH_ROOTS = [
  (process.env.HOME ?? "") + "/Projects",
  (process.env.HOME ?? "") + "/scopecreeper",
];

function run(cmd: string, args: string[], cwd?: string): string {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 5000, cwd });
  return r.status === 0 ? (r.stdout ?? "").trim() : "";
}

export function discoverRepos(): TrackedRepo[] {
  const found: TrackedRepo[] = [];
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
    return "(no .scopecreeper.md)";
  }
}

export interface CommitInfo {
  hash: string;
  subject: string;
  author: string;
  diffStat: string;
}

export function getLatestCommit(repoPath: string): CommitInfo | null {
  const log = run("git", ["-C", repoPath, "log", "-1", "--format=%H|||%s|||%an"]);
  if (!log) return null;
  const [hash, subject, author] = log.split("|||");
  const diffStat = run("git", ["-C", repoPath, "show", "--stat", "--format=", "HEAD"]).slice(0, 600);
  return { hash: (hash ?? "").slice(0, 8), subject: subject ?? "", author: author ?? "", diffStat };
}
