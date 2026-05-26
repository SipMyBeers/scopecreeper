/**
 * POST /api/projects/:id/analyze
 *
 * Runs the theory-vs-actual analysis pipeline on the project and stores the
 * result back on the project. Returns the full project with `analysis` set.
 *
 * Pro-gated. Synchronous (the audit + LLM passes complete inside the 30s
 * Worker wall budget for the v1 sizes we cap at).
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import {
  getOrCreateSession,
  hasLegacyCredits,
  isPro,
  readSession,
} from "@/lib/session";
import { getProject, saveProject } from "@/lib/projects";
import { analyzeProject } from "@/lib/project-analysis";

export const runtime = "edge";

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  delete?: (key: string) => Promise<void>;
}
interface Env {
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  KV_PROJECTS?: KV;
  KV_QUOTAS?: KV;
  AUTH_SECRET?: string;
}
function getEnv(): Env { return getCfEnv<Env>(); }

async function requirePro(
  request: Request,
  env: Env
): Promise<
  | { ok: true; sid: string; setCookie: string | null }
  | { ok: false; response: Response }
> {
  const { sid, setCookie } = await getOrCreateSession(request, env);
  const record = await readSession(sid, env);
  if (!record || (!isPro(record) && !hasLegacyCredits(record))) {
    const r = NextResponse.json(
      { error: "PRO_REQUIRED", message: "Projects are a Pro feature." },
      { status: 402 }
    );
    if (setCookie) r.headers.append("Set-Cookie", setCookie);
    return { ok: false, response: r };
  }
  return { ok: true, sid, setCookie };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const env = getEnv();
  if (!env.KV_PROJECTS) {
    return NextResponse.json({ error: "projects store not configured" }, { status: 503 });
  }
  if (!env.AI) {
    return NextResponse.json({ error: "AI binding not configured" }, { status: 503 });
  }
  const auth = await requirePro(request, env);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const project = await getProject(env.KV_PROJECTS, auth.sid, id);
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (project.inputs.length === 0) {
    return NextResponse.json(
      { error: "project has no inputs — add a repo, chatlog, or doc first" },
      { status: 400 }
    );
  }

  // ?debug=1 surfaces prompt size + raw LLM response head for diagnostics.
  const url = new URL(request.url);
  const debug = url.searchParams.get("debug") === "1";

  try {
    let debugInfo: { promptBytes: number; rawLen: number; rawHead: string } | undefined;
    const analysis = await analyzeProject(project, env.AI, {
      onDebug: (info) => { debugInfo = info; },
    });
    const next = { ...project, analysis };
    await saveProject(env.KV_PROJECTS, next);
    const r = NextResponse.json({ project: next, debug: debug ? debugInfo : undefined });
    if (auth.setCookie) r.headers.append("Set-Cookie", auth.setCookie);
    return r;
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}
