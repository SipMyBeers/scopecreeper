/**
 * `creeper inbox [--drain] [--json]` — show or drain the drift inbox.
 *
 * Without flags: print pending events to stdout, exit 0.
 * --drain: print + clear (events move to inbox-archive.jsonl).
 * --json:  emit JSON instead of pretty text (for piping into Claude).
 */
import { drain, listPending, paths } from "../inbox.js";

function pink(s: string): string { return `\x1b[35m${s}\x1b[0m`; }
function amber(s: string): string { return `\x1b[33m${s}\x1b[0m`; }
function cyan(s: string): string { return `\x1b[36m${s}\x1b[0m`; }
function green(s: string): string { return `\x1b[32m${s}\x1b[0m`; }
function dim(s: string): string { return `\x1b[2m${s}\x1b[0m`; }
function bold(s: string): string { return `\x1b[1m${s}\x1b[0m`; }

function tierColor(t: string) {
  const lower = t.toLowerCase();
  if (lower === "abyss" || lower === "delusion") return pink;
  if (lower === "sweetspot") return amber;
  return green;
}

export async function runInbox(args: string[]): Promise<number> {
  const wantsDrain = args.includes("--drain");
  const wantsJson = args.includes("--json");

  const events = wantsDrain ? await drain() : await listPending();

  if (wantsJson) {
    process.stdout.write(JSON.stringify({ events, drained: wantsDrain }, null, 2) + "\n");
    return 0;
  }

  const p = paths();
  console.log("");
  console.log(bold(pink("▸ SCOPE CREEPER · INBOX")) + dim(`   ${p.jsonl}`));
  console.log(dim("─".repeat(60)));

  if (!events.length) {
    console.log("");
    console.log(green("inbox empty. no pending drifts."));
    console.log("");
    return 0;
  }

  for (const e of [...events].reverse()) {
    const col = tierColor(e.tier);
    console.log("");
    console.log(`${col(bold(`${e.score}/100 ${e.tier.toUpperCase()}`))} · ${cyan(e.repo)} ${dim("#" + e.hash)}`);
    console.log(`  ${e.subject}`);
    console.log(`  ${dim("verdict:")} ${col(e.verdict)}`);
    if (e.analysis) console.log(`  ${dim("analysis:")} ${e.analysis}`);
    if (e.reasons.length) console.log(`  ${dim("reasons:")} ${e.reasons.join(", ")}`);
  }
  console.log("");
  console.log(dim("─".repeat(60)));
  console.log(dim(`${events.length} event${events.length === 1 ? "" : "s"}${wantsDrain ? " · DRAINED into inbox-archive.jsonl" : ""}`));
  console.log(dim(`markdown mirror: ${p.md}`));
  console.log("");
  return 0;
}
