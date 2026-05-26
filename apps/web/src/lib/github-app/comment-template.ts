/**
 * Render a Scope Creeper drift report into a single markdown comment.
 * Pretty, scannable, links back to the web app for KILL / SHIPPABLE on demand.
 */
import type { DriftReport } from "./drift-analyze";
import type { PrContext } from "./scope-extract";

const SEVERITY_EMOJI = {
  info: "·",
  warn: "▲",
  high: "■",
} as const;

const TIER_EMOJI = {
  corpse: "💀",
  sweetspot: "✅",
  abyss: "🌀",
  delusion: "🔥",
} as const;

export function renderComment(args: {
  report: DriftReport;
  ctx: PrContext;
  prUrl: string;
  webBase: string;
}): string {
  const { report, ctx, webBase } = args;
  const lines: string[] = [];
  const tierEmoji = TIER_EMOJI[report.tier];

  lines.push(
    `## ${tierEmoji} Scope Creeper · PR drift audit`,
    "",
    `**Creep score:** \`${String(report.creepScore).padStart(3, "0")} / 100\` — **${report.tier.toUpperCase()}**`,
    `**Verdict:** ${report.verdict}`,
    "",
    `**Expected:** ${report.expectedShape || "_(no expected shape inferred)_"}`,
    `**Actual:** ${report.actualShape || "_(no actual shape inferred)_"}`,
    ""
  );

  if (report.findings.length > 0) {
    lines.push("### Drift findings");
    for (const f of report.findings) {
      lines.push(`- ${SEVERITY_EMOJI[f.severity]} **${f.title}** — ${f.rationale}`);
    }
    lines.push("");
  }

  // Scope source attribution
  if (ctx.scopeDocSource === "none") {
    lines.push(
      `> _Heads up: no \`.scopecreeper.md\` or README found at repo root. Score is conservative._`,
      `> _Add a \`.scopecreeper.md\` declaring your project's scope to get drift checks calibrated against your actual intent._`,
      ""
    );
  } else if (ctx.scopeDocSource === "readme") {
    lines.push(
      `> _Audited against this repo's README. For sharper drift checks, add a \`.scopecreeper.md\` file at the root._`,
      ""
    );
  }

  // Footer with actions
  const killUrl = `${webBase}/?seed=${encodeURIComponent(
    `${args.report.verdict}\n\n${ctx.prTitle}\n\n${ctx.prBody.slice(0, 600)}`
  )}&intent=kill`;
  const shippableUrl = `${webBase}/?seed=${encodeURIComponent(
    `${args.report.verdict}\n\n${ctx.prTitle}\n\n${ctx.prBody.slice(0, 600)}`
  )}&intent=shippable`;
  lines.push(
    "---",
    `[**Generate KILL artifact**](${killUrl}) (free) · ` +
    `[**Generate SHIPPABLE v0**](${shippableUrl}) (Pro) · ` +
    `[Scope Creeper](${webBase}) · ` +
    `Re-run by typing \`/scope-creeper\` in this PR.`
  );

  return lines.join("\n");
}
