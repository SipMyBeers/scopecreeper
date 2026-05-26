/**
 * POST /api/llm
 *
 * Thin LLM passthrough. Caller provides their own prompt + optional
 * system message; we hand it to Workers AI and return the raw response.
 * No delusion-meter framing, no scoring, no JSON-shape enforcement.
 *
 * This is what the TUI's explainActions() and generateExpandCounter()
 * functions hit. /api/score wraps every call in the score-engine system
 * prompt which mangles non-score prompts; /api/llm is the escape hatch.
 *
 * Body: { prompt: string, system?: string, maxTokens?: number, jsonObject?: boolean }
 * Response: { text: string }
 *
 * No session/credit charge — calls are rate-limited at the CF edge instead.
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";

export const runtime = "edge";

interface Env {
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
}

interface Body {
  prompt?: unknown;
  system?: unknown;
  maxTokens?: unknown;
  jsonObject?: unknown;
}

const DEFAULT_SYSTEM =
  "You are a focused, direct assistant. Answer the user's prompt exactly. Do not add preamble or postscript. Do not refuse reasonable requests.";

export async function POST(request: Request): Promise<Response> {
  const env = getCfEnv<Env>();
  if (!env.AI) {
    return NextResponse.json({ error: "AI binding unavailable" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 8000) : "";
  if (!prompt) {
    return NextResponse.json({ error: "missing 'prompt'" }, { status: 400 });
  }
  const system = typeof body.system === "string" && body.system.length
    ? body.system.slice(0, 2000)
    : DEFAULT_SYSTEM;
  const maxTokens = typeof body.maxTokens === "number" ? Math.min(2000, Math.max(64, body.maxTokens)) : 800;
  const jsonObject = body.jsonObject === true;

  try {
    const aiInput: Record<string, unknown> = {
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
    };
    if (jsonObject) aiInput.response_format = { type: "json_object" };

    const out = (await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", aiInput)) as
      | { response?: string }
      | undefined;
    const text = (out?.response ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "empty response from model" }, { status: 502 });
    }
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "model call failed" },
      { status: 502 }
    );
  }
}
