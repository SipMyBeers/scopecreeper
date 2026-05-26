/**
 * `creeper hook` — designed to be wired into Claude Code / Cursor
 * UserPromptSubmit hooks (or any "before every prompt" hook).
 *
 * Behavior contract:
 *   - Empty inbox → exit 0, NO stdout. The hook stays silent so prompts
 *     aren't polluted when there's nothing to say.
 *   - Pending events → write a terse, Claude-friendly block to stdout
 *     that tells the model to surface drift before continuing the user's
 *     request, then exit 0. Never blocks the prompt.
 *   - File missing / daemon not running → silent exit 0.
 *
 * The hook intentionally does NOT drain the inbox automatically. The
 * user (or the AI, on its own initiative) decides when to acknowledge
 * and clear events via `creeper inbox --drain` or the MCP tool.
 */
import { listPending } from "../inbox.js";

export async function runHook(): Promise<number> {
  const events = await listPending();
  if (!events.length) return 0;

  const lines: string[] = [];
  lines.push("");
  lines.push("=== SCOPE CREEPER · pending drift events ===");
  lines.push("The local scope-drift watcher has flagged the following commits as");
  lines.push("drifting from the user's declared scope. Before continuing the user's");
  lines.push("current request, briefly surface these and offer to address them.");
  lines.push("(They can also be drained with `creeper inbox --drain` or the");
  lines.push("scope_creeper_inbox MCP tool when acknowledged.)");
  lines.push("");

  for (const e of [...events].reverse()) {
    lines.push(`• ${e.repo} · ${e.score}/100 ${e.tier.toUpperCase()} · #${e.hash}`);
    lines.push(`  ${e.subject}`);
    lines.push(`  verdict: ${e.verdict}`);
    if (e.analysis) lines.push(`  analysis: ${e.analysis}`);
    if (e.reasons.length) lines.push(`  reasons: ${e.reasons.join(", ")}`);
    lines.push("");
  }

  lines.push("=== end scope creeper ===");
  process.stdout.write(lines.join("\n") + "\n");
  return 0;
}
