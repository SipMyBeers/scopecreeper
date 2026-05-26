/**
 * Drift analysis for a GitHub PR.
 *
 * Given (canonical scope doc) + (PR description) + (diff summary), call the
 * LLM to score how much this PR drifts from the project's declared scope.
 * Returns a creep score + top drift findings + a one-line verdict.
 */
import { tryParseJSON } from "@/lib/json-tolerant";
import { SYSTEM_PROMPT } from "@/core";
import type { PrContext } from "./scope-extract";

interface AI {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
}

export interface DriftReport {
  creepScore: number; // 0-100
  tier: "corpse" | "sweetspot" | "abyss" | "delusion";
  verdict: string;
  findings: Array<{ severity: "info" | "warn" | "high"; title: string; rationale: string }>;
  /** What this PR "should be" doing per the declared scope. One line. */
  expectedShape: string;
  /** What this PR is actually doing per the diff. One line. */
  actualShape: string;
}

function tierForScore(s: number): DriftReport["tier"] {
  if (s >= 96) return "delusion";
  if (s >= 71) return "abyss";
  if (s >= 31) return "sweetspot";
  return "corpse";
}

interface LlmDriftJson {
  creepScore?: number;
  verdict?: string;
  findings?: Array<{ severity?: string; title?: string; rationale?: string }>;
  expectedShape?: string;
  actualShape?: string;
}

function buildPrompt(ctx: PrContext): string {
  return [
    `You are auditing a GitHub pull request for SCOPE DRIFT — is this PR doing what the project's declared scope says, or is it adding unrelated / over-ambitious work?`,
    ``,
    `## DECLARED SCOPE (source: ${ctx.scopeDocSource})`,
    ctx.scopeDoc ?? "(no declared scope file or README found in this repo)",
    ``,
    `## PR INTENT (from the PR description)`,
    `Title: ${ctx.prTitle}`,
    `Body:`,
    ctx.prBody || "(no description)",
    ``,
    `## ACTUAL DIFF SUMMARY`,
    `${ctx.filesChanged} files changed · +${ctx.linesAdded} / -${ctx.linesDeleted} lines`,
    "",
    ctx.diffSummary,
    ``,
    `Return JSON only:`,
    `{
  "creepScore": <int 0-100; 0=this PR is exactly the declared scope, 100=this PR is a completely unrelated feature factory>,
  "verdict": "<6 WORDS MAX, ALL CAPS, terminal-style>",
  "expectedShape": "<one sentence: what would a PR that strictly adheres to scope look like>",
  "actualShape": "<one sentence: what this PR is actually doing based on the diff>",
  "findings": [
    {
      "severity": "info" | "warn" | "high",
      "title": "<short title, ≤8 words>",
      "rationale": "<one sentence: specific file/feature evidence>"
    }
    // 2-5 findings, prioritizing 'high' for clear scope creep
  ]
}`,
    ``,
    `Rules:`,
    `- If no declared scope and no README: score conservatively (~30) and note the absence in findings.`,
    `- "claimed-only" features that appear in the diff but were never promised → high severity finding.`,
    `- Bug fixes, dependency bumps, README tweaks → low score (sweetspot range).`,
    `- New features not mentioned in the PR description OR the scope doc → that's drift; warn or high.`,
    `- Output JSON only.`,
  ].join("\n");
}

export async function analyzeDrift(ctx: PrContext, ai: AI): Promise<DriftReport> {
  const prompt = buildPrompt(ctx);
  let raw: string | null = null;
  try {
    const out = (await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200,
    })) as { response?: string };
    raw = out?.response ?? null;
  } catch (err) {
    console.error("drift LLM call failed:", err);
  }
  const parsed = tryParseJSON<LlmDriftJson>(raw);

  // Conservative fallback if the LLM choked.
  if (!parsed) {
    return {
      creepScore: 50,
      tier: "sweetspot",
      verdict: "ANALYSIS INCOMPLETE",
      expectedShape: "(LLM did not return a usable analysis)",
      actualShape: `${ctx.filesChanged} files · +${ctx.linesAdded}/-${ctx.linesDeleted}`,
      findings: [
        { severity: "info", title: "Analyzer fallback", rationale: "Re-run with /scope-creeper for a fresh attempt." },
      ],
    };
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(typeof parsed.creepScore === "number" ? parsed.creepScore : 50)
    )
  );
  return {
    creepScore: score,
    tier: tierForScore(score),
    verdict: (parsed.verdict ?? "AUDIT COMPLETE").toString().toUpperCase().slice(0, 60),
    expectedShape: (parsed.expectedShape ?? "").toString().trim().slice(0, 240),
    actualShape: (parsed.actualShape ?? "").toString().trim().slice(0, 240),
    findings: (parsed.findings ?? [])
      .slice(0, 8)
      .map((f) => {
        const severity: "info" | "warn" | "high" =
          f.severity === "warn" || f.severity === "high"
            ? f.severity
            : "info";
        return {
          severity,
          title: (f.title ?? "").toString().trim().slice(0, 80),
          rationale: (f.rationale ?? "").toString().trim().slice(0, 240),
        };
      })
      .filter((f) => f.title),
  };
}
