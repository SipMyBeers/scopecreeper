/**
 * `creeper edit-check <file_path>` — instant drift check on a single file path.
 *
 * Designed for PostToolUse(Write|Edit) hooks: fires every time an AI agent
 * touches a file, runs a sub-50ms heuristic check against the scope doc of
 * the enclosing repo, and writes a lightweight event to the inbox if the
 * path drifts. The UserPromptSubmit hook then surfaces those events on the
 * NEXT prompt so the user (and the AI) see drift in near-real time.
 *
 * Cheap by design: no LLM call, no git operations beyond locating the repo
 * root via path traversal. Heuristic = word match against NOT / Deferred
 * sections of .scopecreeper.md.
 *
 * Always exits 0 — never blocks the hook chain.
 */
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { dirname, basename, sep } from "path";
import { appendEvent } from "../inbox.js";

function findRepoRoot(filePath: string): string | null {
  let cur = dirname(filePath);
  for (let i = 0; i < 20; i++) {
    if (existsSync(`${cur}${sep}.git`)) return cur;
    const parent = dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
  return null;
}

function extractBlockedWords(scopeDoc: string): string[] {
  const sections = ["What this project is NOT", "Explicitly deferred"];
  const out: string[] = [];
  for (const section of sections) {
    const re = new RegExp(`##\\s*${section.replace(/[^a-zA-Z]/g, "\\$&")}[\\s\\S]*?(?=##|$)`, "i");
    const m = scopeDoc.match(re);
    if (!m) continue;
    // Extract real-word tokens (alpha, length > 4) from each bullet line
    for (const line of m[0].split("\n").slice(1)) {
      const cleaned = line.replace(/[*_`]/g, "").trim();
      if (!cleaned.startsWith("-") && !cleaned.startsWith("*")) continue;
      const words = cleaned.toLowerCase().match(/\b[a-z][a-z-]{4,}\b/g) ?? [];
      out.push(...words);
    }
  }
  // Filter out generic English words — only feature/path-like tokens stay
  const generic = new Set([
    "list", "things", "would", "could", "should", "writing", "discipline",
    "where", "lives", "that", "what", "with", "from", "this", "your", "their",
    "explicit", "explicitly", "deferred", "project", "users", "team", "have",
    "needs", "future", "into", "build", "built", "thing", "down", "section",
    "without", "having", "another", "include", "various", "support",
  ]);
  return [...new Set(out.filter((w) => !generic.has(w)))];
}

export async function runEditCheck(args: string[]): Promise<number> {
  const filePath = args[0];
  if (!filePath) return 0;

  const repoRoot = findRepoRoot(filePath);
  if (!repoRoot) return 0;

  const scopePath = `${repoRoot}${sep}.scopecreeper.md`;
  if (!existsSync(scopePath)) return 0;

  let scope: string;
  try {
    scope = await readFile(scopePath, "utf8");
  } catch {
    return 0;
  }

  const blocked = extractBlockedWords(scope);
  if (!blocked.length) return 0;

  const lower = filePath.toLowerCase();
  const hits = blocked.filter((w) => lower.includes(w));
  if (!hits.length) return 0;

  // We have drift — write a lightweight event
  const relPath = filePath.startsWith(repoRoot) ? filePath.slice(repoRoot.length + 1) : filePath;
  try {
    await appendEvent({
      ts: Date.now(),
      repo: basename(repoRoot),
      path: repoRoot,
      hash: "EDIT",
      subject: `edit: ${relPath}`,
      score: 70, // heuristic — no LLM call here
      tier: "abyss",
      verdict: `EDIT TOUCHES BLOCKED SCOPE`,
      analysis: `file path matches blocked-scope words: ${hits.slice(0, 3).join(", ")}`,
      reasons: ["edit-time", `hit:${hits[0]}`],
    });
  } catch {
    /* never break the hook */
  }
  return 0;
}
