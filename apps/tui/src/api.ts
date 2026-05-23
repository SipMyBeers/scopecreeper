const BASE = process.env.SC_API_URL ?? "https://scopecreeper.ai";
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

export async function scanText(text: string, _scopeDoc?: string): Promise<ScanResult | null> {
  try {
    const res = await fetch(`${BASE}/api/score`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ kind: "chatlog", payload: text.slice(0, 4000) }),
      signal: AbortSignal.timeout(15000),
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
    const payload = `${question}\n\nContext:\n${context}`.slice(0, 3000);
    const res = await fetch(`${BASE}/api/score`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ kind: "chatlog", payload }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return `[HTTP ${res.status} — ${BASE}/api/score]`;
    const data = await res.json() as Record<string, unknown>;
    const verdict = String(data.verdict ?? "").toUpperCase();
    const analysis = String(data.analysis ?? "");
    const score = typeof data.score === "number" ? data.score : "??";
    return `[${score}/100 · ${verdict}]\n${analysis}`;
  } catch (e) {
    return `[ERROR: ${e instanceof Error ? e.message : "network fail"}]`;
  }
}
