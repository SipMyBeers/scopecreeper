/**
 * `creeper patterns [--window=30]` — print pattern report to stdout.
 *
 * Same analysis the TUI's Real Talk panel runs, but text-only so it can
 * pipe into a Slack post, an email digest, or a cron job.
 */
import { analyzePatterns } from "../patterns.js";

function pink(s: string): string { return `\x1b[35m${s}\x1b[0m`; }
function amber(s: string): string { return `\x1b[33m${s}\x1b[0m`; }
function cyan(s: string): string { return `\x1b[36m${s}\x1b[0m`; }
function dim(s: string): string { return `\x1b[2m${s}\x1b[0m`; }
function bold(s: string): string { return `\x1b[1m${s}\x1b[0m`; }

export async function runPatterns(args: string[]): Promise<number> {
  let windowDays = 30;
  for (const a of args) {
    const m = a.match(/^--window=(\d+)$/);
    if (m) windowDays = Number(m[1]);
  }

  const findings = await analyzePatterns({ windowDays });

  console.log("");
  console.log(bold(pink("▸ SCOPE CREEPER · REAL TALK")) + dim(`   last ${windowDays}d`));
  console.log(dim("─".repeat(60)));

  if (!findings.length) {
    console.log("");
    console.log("no patterns yet — keep using the picker.");
    console.log(dim("patterns surface after ~3+ decisions on the same area or 4+ dismissals."));
    console.log("");
    return 0;
  }

  for (const f of findings) {
    const color = f.severity === "high" ? pink : f.severity === "warn" ? amber : cyan;
    const glyph = f.severity === "high" ? "✗" : f.severity === "warn" ? "▲" : "■";
    console.log("");
    console.log(`${color(glyph)} ${color(bold(f.headline))}`);
    for (const ev of f.evidence) {
      console.log(`   ${dim(ev)}`);
    }
    console.log(`   ${bold("→")} ${f.suggestion}`);
  }
  console.log("");
  console.log(dim("─".repeat(60)));
  console.log(dim(`${findings.length} pattern${findings.length === 1 ? "" : "s"} surfaced`));
  console.log("");
  return 0;
}
