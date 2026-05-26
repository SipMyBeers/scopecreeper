/**
 * Seed the public leaderboard with real audits of well-known repos.
 * Runs the audit pipeline locally (we already verified it works in node),
 * then pushes each result into KV_LEADERBOARD via `wrangler kv key put`.
 *
 * Usage:
 *   node scripts/seed-board.mjs
 *
 * Requires `wrangler` on PATH and CF auth (npx wrangler whoami should work).
 */
import { runAudit } from "../src/lib/audit-runner.ts";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPOS = [
  "vercel/next.js",
  "supabase/supabase",
  "tailwindlabs/tailwindcss",
  "withastro/astro",
  "remix-run/remix",
  "shadcn-ui/ui",
  "sveltejs/svelte",
];

// Pulled from wrangler.toml — keep in sync if the binding ID rotates.
const KV_LEADERBOARD_ID = "87c5a50b4da048ea8f285d9053fde27e";

const entries = [];

for (const repo of REPOS) {
  const t = Date.now();
  process.stdout.write(`auditing ${repo}... `);
  try {
    const report = await runAudit(repo, undefined);
    const entry = {
      repo: report.repo,
      delusionScore: report.delusionScore,
      findingCount: report.findings.length,
      filesScanned: report.filesScanned,
      scannedAt: report.scannedAt,
      truncated: report.truncated,
    };
    entries.push(entry);
    console.log(`${entry.delusionScore}/100 · ${entry.findingCount} findings · ${Date.now() - t}ms`);
  } catch (err) {
    console.log(`error: ${err.message}`);
  }
}

// Push each entry + the rebuilt index into KV via wrangler. Uses spawnSync
// with an argv array (no shell), so user-controlled values can't injection.
const tmp = mkdtempSync(join(tmpdir(), "sc-board-"));
function kvPut(key, value) {
  const safeName = key.replace(/[^a-z0-9]/gi, "_");
  const file = join(tmp, safeName);
  writeFileSync(file, value);
  const result = spawnSync(
    "npx",
    [
      "wrangler",
      "kv",
      "key",
      "put",
      `--namespace-id=${KV_LEADERBOARD_ID}`,
      "--remote",
      key,
      `--path=${file}`,
    ],
    { stdio: "inherit" }
  );
  if (result.status !== 0) {
    throw new Error(`wrangler kv key put failed for ${key}: exit ${result.status}`);
  }
}

for (const e of entries) {
  kvPut(`entry:${e.repo}`, JSON.stringify(e));
}

const indexed = entries.slice().sort((a, b) => b.delusionScore - a.delusionScore).slice(0, 50);
kvPut("index:by-score", JSON.stringify(indexed));

rmSync(tmp, { recursive: true, force: true });
console.log(`\nseeded ${entries.length} entries.`);
