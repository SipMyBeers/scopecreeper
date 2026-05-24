/**
 * `creeper init [path]` — bootstrap a draft .scopecreeper.md.
 *
 * Hybrid strategy:
 *   1. Build a deterministic template by reading README + git log +
 *      package metadata + top-level dirs. Always works, no network.
 *   2. If the API is reachable, ask the LLM to refine the IS/NOT
 *      sections so they read like human writing instead of bullet
 *      regurgitation. Falls through on failure.
 *   3. Write the draft to <repo>/.scopecreeper.md and open it in
 *      $EDITOR so the user can tighten it before saving.
 */
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { scanText } from "../api.js";

function run(cmd: string, args: string[]): string {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 5000 });
  return r.status === 0 ? (r.stdout ?? "").trim() : "";
}

function dim(s: string): string { return `\x1b[2m${s}\x1b[0m`; }
function pink(s: string): string { return `\x1b[35m${s}\x1b[0m`; }
function green(s: string): string { return `\x1b[32m${s}\x1b[0m`; }

interface RepoFacts {
  name: string;
  readmeSummary: string;
  stack: string[];
  topDirs: string[];
  recentSubjects: string[];
}

async function gatherFacts(repoRoot: string): Promise<RepoFacts> {
  const name = repoRoot.split("/").filter(Boolean).pop() ?? "project";

  // README summary — first paragraph after the title
  let readmeSummary = "";
  for (const candidate of ["README.md", "Readme.md", "readme.md", "README.MD"]) {
    const p = join(repoRoot, candidate);
    if (existsSync(p)) {
      try {
        const raw = await readFile(p, "utf8");
        // Take the first real paragraph after the title — stop at the first blank line.
        const lines = raw.split("\n");
        const para: string[] = [];
        let started = false;
        for (const l of lines) {
          if (l.startsWith("#") || l.startsWith("![") || l.startsWith("```")) continue;
          if (!l.trim()) { if (started) break; continue; }
          if (l.startsWith(">")) continue; // skip blockquotes
          started = true;
          para.push(l.trim());
        }
        const joined = para.join(" ");
        // Cap at first sentence boundary near 200 chars so we don't truncate mid-word
        const cap = 220;
        if (joined.length > cap) {
          const slice = joined.slice(0, cap);
          const lastPeriod = slice.lastIndexOf(".");
          readmeSummary = lastPeriod > 80 ? slice.slice(0, lastPeriod + 1) : slice + "…";
        } else {
          readmeSummary = joined;
        }
        break;
      } catch { /* skip */ }
    }
  }

  // Stack detection — pick up the obvious manifests
  const stack: string[] = [];
  const probe = async (file: string, label: string, extract?: (raw: string) => string | null) => {
    const p = join(repoRoot, file);
    if (existsSync(p)) {
      if (extract) {
        try {
          const raw = await readFile(p, "utf8");
          const v = extract(raw);
          stack.push(v ? `${label} (${v})` : label);
        } catch { stack.push(label); }
      } else {
        stack.push(label);
      }
    }
  };
  await probe("package.json", "Node", (raw) => {
    try {
      const pkg = JSON.parse(raw) as { dependencies?: Record<string, string>; name?: string };
      const deps = Object.keys(pkg.dependencies ?? {});
      const framework =
        deps.find((d) => d === "next") ? "Next.js"
        : deps.find((d) => d === "react") ? "React"
        : deps.find((d) => d === "vite") ? "Vite"
        : deps.find((d) => d === "express" || d === "hono") ? "Node API"
        : null;
      return framework;
    } catch { return null; }
  });
  await probe("Cargo.toml", "Rust");
  await probe("pyproject.toml", "Python");
  await probe("go.mod", "Go");
  await probe("Package.swift", "Swift");
  await probe("Gemfile", "Ruby");
  await probe("wrangler.toml", "Cloudflare Workers");
  await probe("tauri.conf.json", "Tauri");

  // Top-level directories that look like code (skip files, hidden, build artifacts)
  const topDirs = run("ls", ["-1", "-F", repoRoot])
    .split("\n")
    .filter((entry) => entry.endsWith("/"))
    .map((entry) => entry.slice(0, -1))
    .filter((d) => d && !d.startsWith(".") &&
      !["node_modules", "dist", "build", "target", ".next", "out", "coverage"].includes(d))
    .slice(0, 6);

  // Last 30 commit subjects, deduped on prefix
  const log = run("git", ["-C", repoRoot, "log", "-30", "--format=%s"]);
  const subjects = log.split("\n").filter(Boolean);
  const seenPrefixes = new Set<string>();
  const recentSubjects: string[] = [];
  for (const s of subjects) {
    const prefix = s.split(":")[0].toLowerCase();
    if (seenPrefixes.has(prefix)) continue;
    seenPrefixes.add(prefix);
    recentSubjects.push(s.slice(0, 80));
    if (recentSubjects.length >= 8) break;
  }

  return { name, readmeSummary, stack, topDirs, recentSubjects };
}

function deterministicTemplate(facts: RepoFacts): string {
  const isLines: string[] = [];
  if (facts.readmeSummary) isLines.push(`- ${facts.readmeSummary}`);
  if (facts.stack.length) isLines.push(`- Built on: ${facts.stack.join(", ")}`);
  if (facts.topDirs.length) isLines.push(`- Code organized under: ${facts.topDirs.join(", ")}`);
  if (!isLines.length) isLines.push(`- (describe what ${facts.name} actually is in one sentence)`);

  const inflight: string[] = facts.recentSubjects.length
    ? facts.recentSubjects.slice(0, 5).map((s) => `- ${s}`)
    : ["- (list what you're actually working on right now)"];

  return [
    "# .scopecreeper.md",
    "",
    "## What this project IS",
    ...isLines,
    "",
    "## What this project is NOT",
    "- (list the things you DON'T want this to become — the discipline lives here)",
    "- (e.g. \"a SaaS subscription product\", \"a team-management platform\", \"a general-purpose framework\")",
    "",
    "## In-flight scope (next 30 days)",
    ...inflight,
    "",
    "## Explicitly deferred",
    "- (the features you've thought about but decided to skip for now)",
    "- (writing them down here means Scope Creeper will flag drift toward them)",
    "",
    `# generated by \`creeper init\` from README + last 30 commits`,
    `# edit freely — this file is the canonical scope-of-truth for every drift check`,
  ].join("\n");
}

async function llmPolish(template: string, facts: RepoFacts): Promise<string | null> {
  // Ask the API to rewrite the IS/NOT/deferred sections in tighter prose.
  // If anything fails, return null and we keep the deterministic template.
  const prompt = [
    `I'm bootstrapping a .scopecreeper.md for a project called "${facts.name}".`,
    `Here's the auto-generated draft based on README + git log:`,
    "",
    template,
    "",
    `Rewrite ONLY the bullet points under "What this project IS" — keep the same markdown shape, but make each line a specific, concrete, terminal-style sentence under 100 chars.`,
    `Do not pad. Do not generalize. If a fact isn't supported by the repo facts, drop it.`,
    `Return JSON: {"is": ["line 1", "line 2", ...]}`,
  ].join("\n");

  const result = await scanText(prompt);
  if (!result) return null;
  // Try to parse JSON from the analysis field
  const match = result.analysis.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { is?: string[] };
    if (!Array.isArray(parsed.is) || !parsed.is.length) return null;
    // Replace the IS section in the template
    const newIs = parsed.is.slice(0, 6).map((s) => `- ${String(s).slice(0, 120)}`).join("\n");
    return template.replace(
      /## What this project IS\n[\s\S]*?\n\n## What this project is NOT/,
      `## What this project IS\n${newIs}\n\n## What this project is NOT`
    );
  } catch {
    return null;
  }
}

export async function runInit(arg?: string): Promise<number> {
  const target = arg || process.cwd();
  const gitRoot = run("git", ["-C", target, "rev-parse", "--show-toplevel"]);
  if (!gitRoot) {
    console.error(`✗ not a git repo: ${target}`);
    return 1;
  }
  const scopePath = join(gitRoot, ".scopecreeper.md");
  if (existsSync(scopePath)) {
    console.error(`✗ ${scopePath} already exists — refusing to overwrite.`);
    console.error(`  delete it manually if you want to regenerate.`);
    return 1;
  }

  process.stdout.write(dim(`[init] gathering facts about ${gitRoot}...\n`));
  const facts = await gatherFacts(gitRoot);
  process.stdout.write(dim(`[init]   ${facts.stack.length} stack components, ${facts.topDirs.length} top dirs, ${facts.recentSubjects.length} commit themes\n`));

  let template = deterministicTemplate(facts);
  process.stdout.write(dim(`[init] template built. asking LLM to tighten the IS section...\n`));
  const polished = await llmPolish(template, facts);
  if (polished) {
    template = polished;
    process.stdout.write(dim(`[init]   LLM polish applied.\n`));
  } else {
    process.stdout.write(dim(`[init]   LLM unreachable — keeping deterministic template.\n`));
  }

  await writeFile(scopePath, template);
  process.stdout.write(green(`✓ wrote ${scopePath}\n`));
  console.log("");
  console.log(pink("▸ next steps"));
  console.log("  1. open the file and fill in the NOT / deferred sections — that's where the discipline is");
  console.log(`     $EDITOR ${scopePath}`);
  console.log(`  2. install the pre-commit hook to start drift-checking:`);
  console.log(`     creeper install-hook ${gitRoot}`);
  console.log(`  3. add this repo to the TUI by launching it and pressing 'a':`);
  console.log(`     creeper`);
  return 0;
}
