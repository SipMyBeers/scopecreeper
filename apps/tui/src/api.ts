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
