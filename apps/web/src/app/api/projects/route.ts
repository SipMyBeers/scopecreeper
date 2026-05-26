/**
 * GET  /api/projects        → list current user's projects
 * POST /api/projects        → create a new project { name }
 *
 * All Pro-gated (or legacy-credit holders during carrythrough).
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import {
  getOrCreateSession,
  hasLegacyCredits,
  isPro,
  readSession,
} from "@/lib/session";
import { createProject, listProjects } from "@/lib/projects";

export const runtime = "edge";

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  delete?: (key: string) => Promise<void>;
}
interface Env {
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

export async function GET(request: Request): Promise<Response> {
  const env = getEnv();
  if (!env.KV_PROJECTS) {
    return NextResponse.json({ error: "projects store not configured" }, { status: 503 });
  }
  const auth = await requirePro(request, env);
  if (!auth.ok) return auth.response;

  const projects = await listProjects(env.KV_PROJECTS, auth.sid);
  const r = NextResponse.json({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      inputCount: p.inputs.length,
      hasAnalysis: Boolean(p.analysis),
    })),
  });
  if (auth.setCookie) r.headers.append("Set-Cookie", auth.setCookie);
  return r;
}

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  if (!env.KV_PROJECTS) {
    return NextResponse.json({ error: "projects store not configured" }, { status: 503 });
  }
  const auth = await requirePro(request, env);
  if (!auth.ok) return auth.response;

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const project = await createProject(env.KV_PROJECTS, auth.sid, body.name ?? "Untitled Project");
  const r = NextResponse.json({ project });
  if (auth.setCookie) r.headers.append("Set-Cookie", auth.setCookie);
  return r;
}
