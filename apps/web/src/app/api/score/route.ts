/**
 * POST /api/score
 *
 * Body: { kind: "repo" | "chatlog", payload: string, illusion?: string }
 * Response: DiagnosticResult + dimensions
 *
 * Flow:
 *  1. Read/issue anonymous session, debit SCAN_COST credits.
 *  2. Compute deterministic baseline (Reality + Illusion + Delusion).
 *  3. Try to upgrade verdict + mutations + dimensions via Workers AI / Ollama.
 *  4. Cache the final result in KV (if bound) keyed by input hash.
 */

import { NextResponse } from "next/server";
import {
  DelusionMeter,
  type CreepDimension,
  type DiagnosticResult,
  type ScanInput,
  fetchRepoStats,
  calculateRealityScore,
  parseRepoUrl,
  parseChatlog,
  illusionScoreFromChatlog,
  SYSTEM_PROMPT,
  mutationPrompt,
  chatlogIllusionPrompt,
} from "@/core";
import {
  SCAN_COST,
  debit,
  getOrCreateSession,
} from "@/lib/session";

export const runtime = "edge";

interface EnvBindings {
  AI?: {
    run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
  };
  KV_SCAN_CACHE?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  };
  KV_QUOTAS?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  };
  OLLAMA_URL?: string;
  OLLAMA_MODEL?: string;
  AUTH_SECRET?: string;
}

import { getCfEnv } from "@/lib/cf-env";
function getEnv(): EnvBindings {
  return getCfEnv<EnvBindings>();
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function callLLM(env: EnvBindings, prompt: string): Promise<string | null> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];

  if (env.AI) {
    try {
      const out = (await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages,
        response_format: { type: "json_object" },
        max_tokens: 768,
      })) as { response?: string };
      if (out?.response) return out.response;
    } catch (err) {
      console.error("Workers AI failed:", err);
    }
  }

  if (env.OLLAMA_URL) {
    try {
      const res = await fetch(env.OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.OLLAMA_MODEL ?? "gemma3:12b",
          messages,
          stream: false,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          message?: { content?: string };
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content =
          data.message?.content ?? data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (err) {
      console.error("Ollama failed:", err);
    }
  }

  return null;
}

function tryParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

/** Static fallback dimensions when the LLM is unavailable. */
function fallbackDimensions(kind: ScanInput["kind"]): CreepDimension[] {
  if (kind === "repo") {
    return [
      { id: "api_surface", label: "API SURFACE", blurb: "More endpoints, more contracts, more bugs." },
      { id: "team_size", label: "TEAM SIZE", blurb: "Add humans. Watch the comms graph explode." },
      { id: "user_load", label: "USER LOAD", blurb: "10x users, what fails first?" },
      { id: "feature_count", label: "FEATURE COUNT", blurb: "Inject 12 features. Where does the spec rot?" },
      { id: "ai_layer", label: "AI LAYER", blurb: "Wrap everything in an LLM. Find the hallucinations." },
    ];
  }
  return [
    { id: "feature_count", label: "FEATURE COUNT", blurb: "Inject every promised feature at once." },
    { id: "timeline_pressure", label: "TIMELINE", blurb: "Compress to 1 week. Which corners get cut?" },
    { id: "ai_dependency", label: "AI DEPENDENCY", blurb: "Replace humans with agents. Trust collapses where?" },
    { id: "scope_drift", label: "SCOPE DRIFT", blurb: "Allow every \"and also\" addition. Where does it end?" },
  ];
}

interface LlmScoreJson {
  verdict?: string;
  analysis?: string;
  mutations?: string[];
  dimensions?: CreepDimension[];
}

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();

  // Session + quota.
  const { sid, setCookie } = await getOrCreateSession(request, env);
  const debited = await debit(sid, SCAN_COST, env);
  if (!debited.ok) {
    const response = NextResponse.json(
      {
        error: "OUT_OF_CREDITS",
        credits: debited.record.credits,
        message: "Out of scan credits. Buy a pack to keep creeping.",
      },
      { status: 402 }
    );
    if (setCookie) response.headers.append("Set-Cookie", setCookie);
    return response;
  }

  let body: ScanInput;
  try {
    body = (await request.json()) as ScanInput;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body?.kind || !body?.payload) {
    return NextResponse.json(
      { error: "missing kind or payload" },
      { status: 400 }
    );
  }

  // v3 suffix → bust cache after adding `creep` per dimension.
  const cacheKey = `scan-v3:${await sha256(
    `${body.kind}::${body.payload}::${body.illusion ?? ""}`
  )}`;

  // 1) Cache lookup.
  if (env.KV_SCAN_CACHE) {
    const hit = await env.KV_SCAN_CACHE.get(cacheKey);
    if (hit) {
      try {
        const response = NextResponse.json(
          JSON.parse(hit) as DiagnosticResult,
          { headers: { "x-cache": "hit", "x-credits": String(debited.record.credits) } }
        );
        if (setCookie) response.headers.append("Set-Cookie", setCookie);
        return response;
      } catch {
        /* fall through */
      }
    }
  }

  // 2) Compute baseline.
  let realityScore = 0;
  let illusionScore = 0;
  let description = "";

  if (body.kind === "repo") {
    if (!parseRepoUrl(body.payload)) {
      return NextResponse.json(
        { error: `not a valid GitHub repo: ${body.payload}` },
        { status: 400 }
      );
    }
    try {
      const stats = await fetchRepoStats(body.payload);
      realityScore = calculateRealityScore(stats);
      description = `Repo: ${stats.fullName}\nLang: ${stats.language ?? "n/a"}\n${stats.description ?? "(no description)"}`;
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 502 }
      );
    }
    const ill = body.illusion?.trim();
    if (ill) {
      const parsed = parseChatlog(ill);
      illusionScore = illusionScoreFromChatlog(parsed);
      description += `\nIllusion brief:\n${ill}`;
    } else {
      illusionScore = 45;
    }
  } else if (body.kind === "chatlog") {
    const parsed = parseChatlog(body.payload);
    illusionScore = illusionScoreFromChatlog(parsed);
    realityScore = Math.max(
      5,
      Math.min(60, Math.round(parsed.wordCount / 60))
    );
    description =
      `Chatlog: ${parsed.turns.length} turns, ${parsed.wordCount} words.\n` +
      `Claimed features:\n - ${parsed.claimedFeatures.slice(0, 8).join("\n - ")}`;
  } else {
    return NextResponse.json(
      { error: `unknown kind: ${body.kind}` },
      { status: 400 }
    );
  }

  let result: DiagnosticResult = DelusionMeter.calculate(
    realityScore,
    illusionScore
  );

  // 3) Try LLM upgrade.
  const llmRaw = await callLLM(
    env,
    mutationPrompt({ realityScore, illusionScore, description })
  );
  const llm = tryParseJSON<LlmScoreJson>(llmRaw);
  if (llm) {
    result = {
      ...result,
      verdict: (llm.verdict ?? result.verdict).toString().toUpperCase().slice(0, 60),
      analysis: llm.analysis ?? result.analysis,
      mutation: llm.mutations?.[0] ?? result.mutation,
      mutations: Array.isArray(llm.mutations) ? llm.mutations.slice(0, 5) : undefined,
      dimensions: Array.isArray(llm.dimensions)
        ? llm.dimensions.slice(0, 5).map(normalizeDimension).filter(Boolean) as CreepDimension[]
        : undefined,
    };
  }

  // Always have at least 3 dimensions — fall back to template list.
  if (!result.dimensions?.length) {
    result.dimensions = fallbackDimensions(body.kind);
  }

  // Chatlog fallback summary if no LLM.
  if (body.kind === "chatlog" && !llm) {
    const summaryRaw = await callLLM(env, chatlogIllusionPrompt(body.payload));
    const summary = tryParseJSON<{ summary?: string }>(summaryRaw);
    if (summary?.summary) result.analysis = summary.summary;
  }

  // 4) Cache.
  if (env.KV_SCAN_CACHE) {
    try {
      await env.KV_SCAN_CACHE.put(cacheKey, JSON.stringify(result), {
        expirationTtl: 60 * 60 * 24,
      });
    } catch {
      /* ignore */
    }
  }

  const response = NextResponse.json(result, {
    headers: { "x-credits": String(debited.record.credits) },
  });
  if (setCookie) response.headers.append("Set-Cookie", setCookie);
  return response;
}

function normalizeDimension(d: unknown): CreepDimension | null {
  if (!d || typeof d !== "object") return null;
  const obj = d as Record<string, unknown>;
  const label = String(obj.label ?? "").trim();
  if (!label) return null;
  const id =
    String(obj.id ?? "").trim() ||
    label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const creepRaw = Number(obj.creep);
  return {
    id: id.slice(0, 32),
    label: label.toUpperCase().slice(0, 32),
    blurb: String(obj.blurb ?? "").trim().slice(0, 140),
    creep: Number.isFinite(creepRaw)
      ? Math.max(0, Math.min(100, Math.round(creepRaw)))
      : undefined,
  };
}
