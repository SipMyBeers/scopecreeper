const BASE = process.env.SC_API_URL ?? "https://scopecreeper.ai";
const API_KEY = process.env.SC_API_KEY ?? "";

export interface ScanResult {
  score: number;
  tier: string;
  verdict: string;
  analysis: string;
}

export async function scanText(text: string, scopeDoc?: string): Promise<ScanResult | null> {
  try {
    const body: Record<string, string> = { description: text.slice(0, 4000) };
    if (scopeDoc) body.scopeDoc = scopeDoc.slice(0, 2000);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (API_KEY) headers["x-api-key"] = API_KEY;
    const res = await fetch(`${BASE}/api/score`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
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

export interface KillResult {
  title: string;
  body: string;
}

export async function askCreeper(question: string, context: string): Promise<string> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (API_KEY) headers["x-api-key"] = API_KEY;
    const payload = `${question}\n\nContext:\n${context}`.slice(0, 3000);
    const res = await fetch(`${BASE}/api/score`, {
      method: "POST",
      headers,
      body: JSON.stringify({ description: payload }),
      signal: AbortSignal.timeout(15000),
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
