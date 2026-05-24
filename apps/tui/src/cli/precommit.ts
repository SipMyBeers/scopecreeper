/**
 * Pre-commit hook handler.
 *
 * Runs as a git hook. Reads the staged diff, scores it against the
 * repo's .scopecreeper.md, and if the score crosses the drift threshold
 * blocks the commit pending a one-sentence justification (or explicit
 * dismissal). Justifications append to the same log as the TUI.
 *
 * Exit codes:
 *   0 — let the commit proceed
 *   1 — abort the commit (only on ctrl+c, never on dismissal — we want
 *       the friction to be the prompt, not the rejection)
 */
import { spawnSync } from "child_process";
import { readFile } from "fs/promises";
import { existsSync, createReadStream } from "fs";
import { join } from "path";
import { createInterface } from "readline";
import { scanCommit } from "../api.js";
import { appendJustification, shouldPromptWhy } from "../justifications.js";
import { notify } from "../notify.js";

function run(cmd: string, args: string[]): string {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 5000 });
  return r.status === 0 ? (r.stdout ?? "").trim() : "";
}

function dim(s: string): string { return `\x1b[2m${s}\x1b[0m`; }
function pink(s: string): string { return `\x1b[35m${s}\x1b[0m`; }
function red(s: string): string { return `\x1b[31m${s}\x1b[0m`; }
function yellow(s: string): string { return `\x1b[33m${s}\x1b[0m`; }
function green(s: string): string { return `\x1b[32m${s}\x1b[0m`; }

function tierColor(tier: string): (s: string) => string {
  if (tier === "delusion" || tier === "abyss") return red;
  if (tier === "sweetspot") return yellow;
  return green;
}

export async function runPrecommit(): Promise<number> {
  if (process.env.SC_DISABLE === "1") return 0;

  const gitRoot = run("git", ["rev-parse", "--show-toplevel"]);
  if (!gitRoot) return 0;

  const scopePath = join(gitRoot, ".scopecreeper.md");
  if (!existsSync(scopePath)) return 0;

  // Skip merges, rebases, amends — those aren't user intent moments.
  if (existsSync(join(gitRoot, ".git", "MERGE_HEAD"))) return 0;
  if (existsSync(join(gitRoot, ".git", "REBASE_HEAD"))) return 0;
  if (existsSync(join(gitRoot, ".git", "rebase-merge"))) return 0;
  if (existsSync(join(gitRoot, ".git", "rebase-apply"))) return 0;

  const diffStat = run("git", ["diff", "--cached", "--stat"]);
  if (!diffStat.trim()) return 0; // nothing staged

  const diffHunks = run("git", [
    "diff", "--cached", "--", ".",
    ":(exclude)*.lock", ":(exclude)pnpm-lock.yaml",
    ":(exclude)package-lock.json", ":(exclude)dist/*", ":(exclude)*.min.*",
  ]);
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]) || "HEAD";
  const scopeDoc = await readFile(scopePath, "utf8");

  process.stdout.write(dim("[scope-creeper] scoring staged diff against .scopecreeper.md...\n"));

  const result = await scanCommit({
    subject: "(staged changes)",
    hash: "STAGED",
    branch,
    diffStat: diffStat.slice(0, 800),
    diffHunks: diffHunks.slice(0, 3000),
  }, scopeDoc);

  if (!result) {
    process.stdout.write(dim("[scope-creeper] API unreachable, skipping check.\n"));
    return 0;
  }

  const color = tierColor(result.tier);
  process.stdout.write(
    dim("[scope-creeper] ") +
    color(`${result.score}/100 · ${result.tier.toUpperCase()} · ${result.verdict}`) + "\n"
  );
  process.stdout.write(dim(`[scope-creeper] ${result.analysis}\n`));

  if (!shouldPromptWhy(result.score)) {
    process.stdout.write(dim("[scope-creeper] in scope. proceeding.\n"));
    return 0;
  }

  // Always log the drift so it shows up in TUI + later review
  const repoName = gitRoot.split("/").pop() ?? "?";
  await appendJustification({
    repo: repoName, path: gitRoot, hash: "STAGED", subject: "(staged changes)",
    score: result.score, tier: result.tier, verdict: result.verdict,
    justification: "", // unanswered — gets resolved later in the TUI if user wants
  });

  // Ambient mode (default): notify and move on. No prompts, no block.
  if (process.env.SC_BLOCKING !== "1") {
    notify({
      title: `🌀 drift · ${repoName}`,
      subtitle: `${result.score}/100  ${result.tier.toUpperCase()}`,
      message: result.verdict,
      key: `precommit::${repoName}::${result.tier}`,
    });
    process.stdout.write(dim(`[scope-creeper] drift logged + notified. proceeding (set SC_BLOCKING=1 to force WHY? prompt).\n`));
    return 0;
  }

  // Opt-in blocking mode for users who want hard friction at commit
  process.stdout.write("\n");
  process.stdout.write(pink("▸ DRIFT DETECTED · explain yourself\n"));
  process.stdout.write("Why does this commit need to exist?\n");
  process.stdout.write(dim("(type an answer to log + proceed, blank enter to dismiss, ctrl+c to abort commit)\n"));
  const answer = await readFromTty();
  if (answer.trim()) {
    // Overwrite the empty justification we just wrote with the real answer
    await appendJustification({
      repo: repoName, path: gitRoot, hash: "STAGED-WHY", subject: "(answered why)",
      score: result.score, tier: result.tier, verdict: result.verdict,
      justification: answer.trim(),
    });
    process.stdout.write(dim("[scope-creeper] logged. proceeding.\n"));
  } else {
    process.stdout.write(dim("[scope-creeper] dismissed. proceeding.\n"));
  }
  return 0;
}

/**
 * Read a single line from the user's terminal. Git redirects stdin to
 * /dev/null for some hooks, so we read /dev/tty directly.
 */
function readFromTty(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const tty = createReadStream("/dev/tty");
      const rl = createInterface({ input: tty, output: process.stdout });
      process.stdout.write("> ");
      rl.once("line", (answer: string) => {
        rl.close();
        tty.destroy();
        resolve(answer);
      });
      rl.once("close", () => resolve(""));
    } catch {
      // No tty (e.g. CI) — treat as dismissal, proceed.
      resolve("");
    }
  });
}
