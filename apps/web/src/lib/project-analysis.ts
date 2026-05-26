/**
 * Project analysis orchestrator.
 *
 * Inputs: a Project with its repo / chatlog / doc inputs.
 * Output: ProjectAnalysis — claimed features, shipped surfaces, drift entries,
 *         "creepier" dimensions, and a one-line prognosis.
 *
 * Strategy:
 *   1. Augment any `repo` inputs with a lightweight audit pass (cheap grep).
 *   2. Compose a single LLM prompt that gives the model all of the theory
 *      (chatlogs + docs) + a summary of the actual (repo metadata + audit
 *      findings), and ask for structured JSON: claimed[], shipped[], delta[],
 *      creepier[], prognosis.
 *   3. Validate + normalize. Compute matchedPct deterministically from delta.
 */
import {
  type ClaimedFeature,
  type CreepDimension,
  type DriftEntry,
  type Project,
  type ProjectAnalysis,
  type ProjectChatlogInput,
  type ProjectDocInput,
  type ProjectRepoInput,
  type ShippedSurface,
  SYSTEM_PROMPT,
} from "@/core";
import { runAudit, type AuditReport } from "@/lib/audit-runner";
import { tryParseJSON } from "@/lib/json-tolerant";
import { newId } from "@/lib/projects";

interface AI {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
}

/** Pull a fresh audit for every repo input, in parallel, with a tight cap. */
async function fetchAudits(repos: ProjectRepoInput[], ai?: AI): Promise<Map<string, AuditReport | null>> {
  const out = new Map<string, AuditReport | null>();
  const tasks = repos.slice(0, 3).map(async (r) => {
    try {
      const report = await runAudit(r.repo, ai);
      out.set(r.id, report);
    } catch {
      out.set(r.id, null);
    }
  });
  await Promise.all(tasks);
  return out;
}

interface LlmAnalysisJson {
  claimed?: Array<{
    title?: string;
    description?: string;
    sourceInputId?: string;
    sourceKind?: "chatlog" | "doc";
  }>;
  shipped?: Array<{
    kind?: "route" | "module" | "command" | "dep" | "file";
    title?: string;
    file?: string;
    line?: number;
  }>;
  delta?: Array<{
    status?: "matched" | "claimed-only" | "shipped-only";
    claimTitle?: string;
    shippedTitle?: string;
    rationale?: string;
  }>;
  creepier?: Array<{
    id?: string;
    label?: string;
    blurb?: string;
    creep?: number;
  }>;
  prognosis?: string;
}

function summarizeChatlog(c: ProjectChatlogInput): string {
  return [
    `=== CHATLOG inputId=${c.id} kind=chatlog title="${c.title}" turns=${c.turns} words=${c.wordCount} ===`,
    c.text.slice(0, 3000),
  ].join("\n");
}

function summarizeDoc(d: ProjectDocInput): string {
  return [
    `=== DOC inputId=${d.id} kind=doc title="${d.title}" mime=${d.mime} bytes=${d.bytes} ===`,
    d.text.slice(0, 3000),
  ].join("\n");
}

function summarizeRepo(r: ProjectRepoInput, audit: AuditReport | null): string {
  const lines = [
    `=== REPO ${r.id} — ${r.repo} ===`,
    r.meta.description ? `description: ${r.meta.description}` : "",
    r.meta.defaultBranch ? `default branch: ${r.meta.defaultBranch}` : "",
    r.meta.readmeExcerpt ? `--- README excerpt ---\n${r.meta.readmeExcerpt.slice(0, 1500)}` : "",
    r.meta.packageJsonExcerpt ? `--- package.json excerpt ---\n${r.meta.packageJsonExcerpt.slice(0, 800)}` : "",
  ];
  if (audit) {
    lines.push(
      `--- audit summary ---`,
      `files scanned: ${audit.filesScanned}, delusion score: ${audit.delusionScore}, findings: ${audit.findings.length}`,
      ...audit.findings.slice(0, 20).map(
        (f) =>
          `[${f.severity}] ${f.category} :: ${f.file}${f.line ? `:${f.line}` : ""} — ${f.evidence}`
      )
    );
  }
  return lines.filter(Boolean).join("\n");
}

function buildPrompt(p: Project, audits: Map<string, AuditReport | null>): string {
  const chatlogs = p.inputs.filter((i): i is ProjectChatlogInput => i.kind === "chatlog");
  const docs = p.inputs.filter((i): i is ProjectDocInput => i.kind === "doc");
  const repos = p.inputs.filter((i): i is ProjectRepoInput => i.kind === "repo");

  const theoryBlocks = [
    ...chatlogs.map(summarizeChatlog),
    ...docs.map(summarizeDoc),
  ];
  const actualBlocks = repos.map((r) => summarizeRepo(r, audits.get(r.id) ?? null));

  return [
    `Project: "${p.name}"`,
    "",
    "## THEORY (what the builder claims they're building)",
    theoryBlocks.length ? theoryBlocks.join("\n\n") : "(no chatlog/doc inputs)",
    "",
    "## ACTUAL (what the repo actually contains)",
    actualBlocks.length ? actualBlocks.join("\n\n") : "(no repo input)",
    "",
    "Produce a JSON object with this exact shape:",
    `{
  "claimed": [
    {
      "title": "<short feature name, ≤8 words>",
      "description": "<one-sentence detail>",
      "sourceInputId": "<id of the chatlog/doc that said it>",
      "sourceKind": "chatlog" | "doc"
    }
    // 5-15 entries — every distinct claim/feature/promise from the theory blocks
  ],
  "shipped": [
    {
      "kind": "route" | "module" | "command" | "dep" | "file",
      "title": "<short identifier, e.g. 'POST /api/score' or 'lib/auth-cookie.ts'>",
      "file": "<path inside the repo>",
      "line": <int, optional>
    }
    // 5-15 entries — surfaces that EXIST in the repo (be specific; use real file paths from the README / package.json / audit findings)
  ],
  "delta": [
    {
      "status": "matched" | "claimed-only" | "shipped-only",
      "claimTitle": "<matches one of claimed[].title, or omitted for shipped-only>",
      "shippedTitle": "<matches one of shipped[].title, or omitted for claimed-only>",
      "rationale": "<one sentence: why these pair, or why this is creep / drift>"
    }
    // One entry per claim AND one per shipped-surface; mark matched when they correspond
  ],
  "creepier": [
    {
      "id": "<short_snake_case_id>",
      "label": "<3-WORDS MAX, ALL CAPS — a NEW project direction>",
      "blurb": "<one sentence: a specific even-more-delusional path this could grow into>",
      "creep": <int 0-100>
    }
    // 3-5 entries — paths to make the project EVEN CREEPIER / more ambitious
  ],
  "prognosis": "<one terminal-style sentence, ALL CAPS, summarizing the theory-vs-actual divergence>"
}`,
    "",
    "Rules:",
    "- Be specific. Reference real file paths and real claims; don't invent.",
    "- sourceInputId MUST be one of the `inputId=...` values shown in the THEORY blocks above. Exact match. Do not include the kind word ('CHATLOG'/'DOC') as part of the id.",
    "- For shipped[] entries, ONLY use file paths that appear in the README excerpt, package.json, or audit findings. If the ACTUAL section says '(no repo input)', return an EMPTY shipped[] array and EMPTY delta[] entries with status='shipped-only'. Do NOT invent README.md / package.json when no repo was provided.",
    "- 'claimed-only' delta entries are pure scope creep (planned, not built).",
    "- 'shipped-only' delta entries are silent additions (built, never promised).",
    "- 'matched' entries are honest delivery.",
    "- creepier suggestions should be CONCRETE — name a feature, an angle, a wild idea.",
    "- Output JSON only. No markdown wrapping. No prose around the JSON.",
  ].join("\n");
}

async function callLLM(ai: AI, prompt: string): Promise<string | null> {
  try {
    const out = (await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2400,
    })) as { response?: string };
    return out?.response ?? null;
  } catch (err) {
    console.error("project-analysis LLM failed:", err);
    return null;
  }
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function analyzeProject(
  project: Project,
  ai: AI | undefined,
  opts: { onDebug?: (info: { promptBytes: number; rawLen: number; rawHead: string }) => void } = {}
): Promise<ProjectAnalysis> {
  if (!ai) {
    throw new Error("AI binding required");
  }
  // Step 1: audits in parallel for any repo inputs.
  const repos = project.inputs.filter(
    (i): i is ProjectRepoInput => i.kind === "repo"
  );
  const audits = await fetchAudits(repos, ai);

  // Step 2: single big LLM call.
  const prompt = buildPrompt(project, audits);
  const raw = await callLLM(ai, prompt);
  if (opts.onDebug) {
    opts.onDebug({
      promptBytes: prompt.length,
      rawLen: raw?.length ?? 0,
      rawHead: (raw ?? "").slice(0, 400),
    });
  }
  const parsed = tryParseJSON<LlmAnalysisJson>(raw);

  // Step 3: validate + normalize.
  // Build a set of valid theory inputIds so we can validate the LLM's
  // sourceInputId references (the model sometimes hallucinates "DOC <id>"
  // or includes the kind prefix). If the model picks a bad id we fall back
  // to the first matching input of the right kind, or "unknown".
  const validInputIds = new Set(project.inputs.map((i) => i.id));
  function resolveInputId(rawId: string, kind: "chatlog" | "doc"): string {
    const clean = rawId.replace(/^(?:CHATLOG|DOC|chatlog|doc)\s+/, "").trim();
    if (validInputIds.has(clean)) return clean;
    // Fallback: first input of this kind, if any.
    const fallback = project.inputs.find((i) => i.kind === kind);
    return fallback?.id ?? "unknown";
  }

  const claimedFeatures: ClaimedFeature[] = (parsed?.claimed ?? [])
    .filter((c) => c?.title)
    .slice(0, 30)
    .map((c) => {
      const kind = c.sourceKind === "doc" ? "doc" : "chatlog";
      return {
        id: newId("c"),
        title: String(c.title).trim().slice(0, 120),
        description: String(c.description ?? "").trim().slice(0, 320),
        source: {
          inputId: resolveInputId(String(c.sourceInputId ?? ""), kind),
          kind,
        },
      };
    });

  // If no repo input is in the project, drop any shipped entries the LLM
  // tries to invent. The README.md / package.json hallucination must stop.
  const hasRepoInput = project.inputs.some((i) => i.kind === "repo");

  const shippedSurfaces: ShippedSurface[] = hasRepoInput
    ? (parsed?.shipped ?? [])
        .filter((s) => s?.title)
        .slice(0, 30)
        .map((s) => ({
          id: newId("s"),
          kind: (["route", "module", "command", "dep", "file"] as const).includes(
            s.kind as never
          )
            ? (s.kind as ShippedSurface["kind"])
            : "file",
          title: String(s.title).trim().slice(0, 120),
          evidence: {
            file: String(s.file ?? "").trim().slice(0, 240),
            line: typeof s.line === "number" ? s.line : undefined,
          },
        }))
    : [];

  const delta: DriftEntry[] = (parsed?.delta ?? [])
    .slice(0, 60)
    .map((d) => {
      const status: DriftEntry["status"] =
        d.status === "matched" || d.status === "claimed-only" || d.status === "shipped-only"
          ? d.status
          : "claimed-only";
      const claim = d.claimTitle
        ? claimedFeatures.find(
            (c) => c.title.toLowerCase() === String(d.claimTitle).toLowerCase()
          )
        : undefined;
      const shipped = d.shippedTitle
        ? shippedSurfaces.find(
            (s) => s.title.toLowerCase() === String(d.shippedTitle).toLowerCase()
          )
        : undefined;
      return {
        id: newId("d"),
        status,
        claim,
        shipped,
        rationale: String(d.rationale ?? "").trim().slice(0, 320),
      };
    })
    // Drop entries that lost both ends — shipped-only entries pointing to a
    // hallucinated shipped surface, or matched entries with neither resolved.
    .filter((d) => {
      if (d.status === "shipped-only") return Boolean(d.shipped);
      if (d.status === "claimed-only") return Boolean(d.claim);
      return Boolean(d.claim || d.shipped);
    });

  const creepier: CreepDimension[] = (parsed?.creepier ?? [])
    .filter((c) => c?.label)
    .slice(0, 6)
    .map((c) => {
      const label = String(c.label).trim().toUpperCase().slice(0, 32);
      const id =
        String(c.id ?? "").trim().slice(0, 32) ||
        label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      return {
        id,
        label,
        blurb: String(c.blurb ?? "").trim().slice(0, 200),
        creep: typeof c.creep === "number" ? clampScore(c.creep) : 70,
      };
    });

  const matchedCount = delta.filter((d) => d.status === "matched").length;
  const matchedPct =
    delta.length > 0 ? Math.round((matchedCount / delta.length) * 100) : 0;

  const prognosis =
    String(parsed?.prognosis ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 160) || "ANALYSIS INCOMPLETE — RETRY";

  return {
    computedAt: Date.now(),
    claimed: claimedFeatures,
    shipped: shippedSurfaces,
    delta,
    creepier,
    matchedPct,
    prognosis,
  };
}
