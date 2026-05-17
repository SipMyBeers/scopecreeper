/**
 * POST /api/creep
 *
 * Body: {
 *   parentSummary: string,        // a short text description of the parent node's state
 *   dimension: { id, label, blurb }
 * }
 * Response: DiagnosticResult (with score override) + dimensions[]
 *
 * Costs CREEP_COST credits. Always returns dimensions for the next branch.
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import {
  type CreepDimension,
  type DiagnosticResult,
  type RatingTier,
  SYSTEM_PROMPT,
  creepScalePrompt,
} from "@/core";
import { CREEP_COST, debit, getOrCreateSession } from "@/lib/session";

export const runtime = "edge";

interface Env {
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  KV_QUOTAS?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  };
  OLLAMA_URL?: string;
  OLLAMA_MODEL?: string;
}
function getEnv(): Env { return getCfEnv<Env>(); }

interface CreepBody {
  parentSummary: string;
  dimension: CreepDimension;
}

interface LlmCreepJson {
  verdict?: string;
  analysis?: string;
  score?: number;
  mutations?: string[];
  dimensions?: CreepDimension[];
}

async function callLLM(env: Env, prompt: string): Promise<string | null> {
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
        return (
          data.message?.content ??
          data.choices?.[0]?.message?.content ??
          null
        );
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
        /* */
      }
    }
    return null;
  }
}

function tierFromScore(score: number): RatingTier {
  if (score >= 96) return "delusion";
  if (score >= 71) return "abyss";
  if (score >= 31) return "sweetspot";
  return "corpse";
}

function fallbackResult(d: CreepDimension): DiagnosticResult {
  const score = 50 + Math.floor(Math.random() * 30);
  return {
    score,
    tier: tierFromScore(score),
    verdict: `${d.label} CREEPS IN`,
    analysis: `Scaling ${d.label.toLowerCase()} multiplies the scope. ${d.blurb}`,
    mutation: `Cap the ${d.label.toLowerCase()} dimension behind a feature flag before it metastasizes.`,
    mutations: [
      `Cap the ${d.label.toLowerCase()} dimension behind a feature flag.`,
      `Schedule a quarterly purge of dead branches in ${d.label.toLowerCase()}.`,
    ],
    dimensions: [],
  };
}

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  const { sid, setCookie } = await getOrCreateSession(request, env);
  const debited = await debit(sid, CREEP_COST, env);
  if (!debited.ok) {
    const r = NextResponse.json(
      {
        error: "OUT_OF_CREDITS",
        credits: debited.record.credits,
        message: "Out of credits.",
      },
      { status: 402 }
    );
    if (setCookie) r.headers.append("Set-Cookie", setCookie);
    return r;
  }

  let body: CreepBody;
  try {
    body = (await request.json()) as CreepBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body?.dimension?.label || !body?.parentSummary) {
    return NextResponse.json(
      { error: "missing parentSummary or dimension" },
      { status: 400 }
    );
  }

  const llmRaw = await callLLM(
    env,
    creepScalePrompt({
      parentSummary: body.parentSummary,
      dimensionLabel: body.dimension.label,
      dimensionBlurb: body.dimension.blurb,
    })
  );
  const llm = tryParseJSON<LlmCreepJson>(llmRaw);

  const result: DiagnosticResult = llm
    ? {
        score: clampScore(llm.score ?? 60),
        tier: tierFromScore(clampScore(llm.score ?? 60)),
        verdict: (llm.verdict ?? `${body.dimension.label} CREEPS IN`)
          .toString()
          .toUpperCase()
          .slice(0, 60),
        analysis: llm.analysis ?? `Scaling ${body.dimension.label} multiplies the scope.`,
        mutation: llm.mutations?.[0] ?? `Cap ${body.dimension.label}.`,
        mutations: Array.isArray(llm.mutations)
          ? llm.mutations.slice(0, 4)
          : undefined,
        dimensions: Array.isArray(llm.dimensions)
          ? (llm.dimensions
              .slice(0, 4)
              .map(normalizeDimension)
              .filter(Boolean) as CreepDimension[])
          : [],
      }
    : fallbackResult(body.dimension);

  const r = NextResponse.json(result, {
    headers: { "x-credits": String(debited.record.credits) },
  });
  if (setCookie) r.headers.append("Set-Cookie", setCookie);
  return r;
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
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
