const BASE = process.env.SC_API_URL ?? "https://5a854fca.scopecreeper.pages.dev";
const API_KEY = process.env.SC_API_KEY ?? "";

export interface ScanResult {
  score: number;
  tier: string;
  verdict: string;
  analysis: string;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["x-api-key"] = API_KEY;
  return h;
}

export interface CommitContext {
  subject: string;
  hash: string;
  branch: string;
  diffStat: string;
  diffHunks: string;
}

/**
 * Score a commit against its repo's declared scope. Constructs a payload
 * that gives the LLM real evidence (diff hunks + file paths) to cite,
 * not just a stat header.
 */
export async function scanCommit(commit: CommitContext, scopeDoc: string): Promise<ScanResult | null> {
  const payload = [
    `Branch: ${commit.branch}`,
    `Commit: ${commit.subject} (${commit.hash})`,
    "",
    `Files changed:`,
    commit.diffStat,
    "",
    `Diff (capped):`,
    commit.diffHunks,
    "",
    `Declared scope of this project:`,
    scopeDoc.slice(0, 1200),
    "",
    `Score this commit. If it introduces a file or feature NOT mentioned in the scope, say so explicitly with the file path. Verdict in 4-6 ALL-CAPS words.`,
  ].join("\n");
  return scanText(payload);
}

export async function scanText(text: string, _scopeDoc?: string): Promise<ScanResult | null> {
  try {
    const res = await fetch(`${BASE}/api/score`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ kind: "chatlog", payload: text.slice(0, 6000) }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    return {
      score: typeof data.score === "number" ? data.score : 50,
      tier: String(data.tier ?? "sweetspot"),
      verdict: String(data.verdict ?? "AUDIT COMPLETE"),
      analysis: String(data.analysis ?? ""),
    };
  } catch {
    return null;
  }
}

export interface Artifact {
  kind: "KILL" | "SHIPPABLE" | "ISSUE" | "BADGE";
  title: string;
  body: string;
}

/**
 * Generate a KILL artifact for a repo — a brutal one-page autopsy arguing
 * the project should be abandoned. Free-tier eligible (viral loop).
 */
export async function generateKill(repoName: string, scopeDoc: string, recentCommits: string): Promise<Artifact | null> {
  try {
    const parentSummary = `Project: ${repoName}\n\nDeclared scope:\n${scopeDoc.slice(0, 1500)}\n\nRecent commits:\n${recentCommits.slice(0, 800)}`;
    const res = await fetch(`${BASE}/api/creep`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        artifactKind: "KILL",
        parentSummary,
        dimension: {
          id: "live_project",
          label: repoName.toUpperCase().slice(0, 24),
          blurb: `Currently-active project: ${repoName}`,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { artifact?: Artifact };
    return data.artifact ?? null;
  } catch {
    return null;
  }
}

export interface ActionExplanations {
  REDIRECT: string;
  EXPAND: string;
  KILL: string;
  ACCEPT: string;
}

/**
 * Defend the score of every route in the action picker with EVIDENCE
 * from the scope doc + diff. Returns one short sentence per route.
 *
 * Returns null on failure; caller should fall back to static hints.
 */
export async function explainActions(args: {
  driftSubject: string;
  driftScore: number;
  driftVerdict: string;
  diffHunks: string;
  scopeDoc: string;
}): Promise<ActionExplanations | null> {
  const prompt = [
    `You are SCOPE CREEPER reviewing a drifty commit. Write a 1-sentence justification for each of the 4 user actions, grounded in SPECIFIC evidence from the scope doc or diff. Cite file paths or scope-doc lines verbatim where possible.`,
    ``,
    `DRIFT CONTEXT:`,
    `Commit: ${args.driftSubject}`,
    `Score: ${args.driftScore}/100`,
    `Verdict: ${args.driftVerdict}`,
    ``,
    `DIFF:`,
    args.diffHunks.slice(0, 1800),
    ``,
    `DECLARED PROJECT SCOPE:`,
    args.scopeDoc.slice(0, 1500),
    ``,
    `Return JSON ONLY (no markdown, no prose wrapping):`,
    `{`,
    `  "REDIRECT": "1-sentence reason to revert and refocus — cite the specific scope-doc line this commit violates",`,
    `  "EXPAND": "1-sentence consequence of legitimizing this drift — what does growing scope here mean for the next month",`,
    `  "KILL": "1-sentence framing of what gets killed and what's recovered — be brutally direct",`,
    `  "ACCEPT": "1-sentence risk of keeping this commit as-is with no scope change — the silent debt being taken on"`,
    `}`,
  ].join("\n");

  try {
    const res = await fetch(`${BASE}/api/llm`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        prompt: prompt.slice(0, 8000),
        system: "You are SCOPE CREEPER. You evaluate code drift against a declared scope. Return ONLY the requested JSON. No prose wrapping. No markdown fences.",
        maxTokens: 800,
        jsonObject: true,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { text?: string };
    const raw = (data.text ?? "").trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Partial<ActionExplanations>;
    if (!parsed.REDIRECT || !parsed.EXPAND || !parsed.KILL || !parsed.ACCEPT) return null;
    return {
      REDIRECT: String(parsed.REDIRECT).slice(0, 240),
      EXPAND: String(parsed.EXPAND).slice(0, 240),
      KILL: String(parsed.KILL).slice(0, 240),
      ACCEPT: String(parsed.ACCEPT).slice(0, 240),
    };
  } catch {
    return null;
  }
}

/**
 * Generate a counter-argument before legitimizing drift via EXPAND.
 * The LLM is given the scope doc and the new commit and asked to argue
 * — in past-you's voice — why this expansion contradicts what was
 * declared. User reads the counter, then confirms or backs out.
 */
export async function generateExpandCounter(args: {
  driftSubject: string;
  scopeDoc: string;
  diffHunks: string;
}): Promise<string | null> {
  const prompt = [
    `You are PAST-YOU, the person who wrote the .scopecreeper.md below. PRESENT-YOU is about to legitimize a drift by adding it to the scope doc, which means past-you is being overruled. Write a short, direct counter-argument from past-you's perspective.`,
    ``,
    `Rules:`,
    `- 3-5 sentences max. No preamble.`,
    `- Quote specific lines from the scope doc verbatim.`,
    `- Reference the specific file/feature being added.`,
    `- Ask one pointed question.`,
    `- Do not be polite. You're arguing with yourself.`,
    ``,
    `DECLARED SCOPE (this is what past-you wrote):`,
    args.scopeDoc.slice(0, 2000),
    ``,
    `WHAT PRESENT-YOU IS ADDING:`,
    `Commit: ${args.driftSubject}`,
    `Diff: ${args.diffHunks.slice(0, 1200)}`,
    ``,
    `Write past-you's counter-argument:`,
  ].join("\n");

  try {
    const res = await fetch(`${BASE}/api/llm`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        prompt: prompt.slice(0, 8000),
        system: "You are PAST-YOU, the developer who originally wrote a project's .scopecreeper.md. PRESENT-YOU is trying to legitimize a drift. Your job: write a blunt counter-argument quoting the scope doc verbatim. 3-5 sentences. No preamble.",
        maxTokens: 600,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { text?: string };
    const text = (data.text ?? "").trim();
    if (!text) return null;
    return text.slice(0, 800);
  } catch {
    return null;
  }
}

export async function askCreeper(question: string, context: string): Promise<string> {
  try {
    const payload = `${question}\n\nContext:\n${context}`.slice(0, 4000);
    const res = await fetch(`${BASE}/api/score`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ kind: "chatlog", payload }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return `[HTTP ${res.status}]`;
    const data = await res.json() as Record<string, unknown>;
    const verdict = String(data.verdict ?? "").toUpperCase();
    const analysis = String(data.analysis ?? "");
    const score = typeof data.score === "number" ? data.score : "??";
    return `[${score}/100 · ${verdict}]\n${analysis}`;
  } catch (e) {
    return `[ERROR: ${e instanceof Error ? e.message : "network fail"}]`;
  }
}
