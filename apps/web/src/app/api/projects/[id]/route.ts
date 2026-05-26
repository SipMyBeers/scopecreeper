/**
 * GET    /api/projects/:id   → full Project JSON
 * DELETE /api/projects/:id   → delete
 *
 * Both Pro-gated. Owner is enforced via session sid.
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import {
  getOrCreateSession,
  hasLegacyCredits,
  isPro,
  readSession,
} from "@/lib/session";
import { deleteProject, getProject } from "@/lib/projects";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const env = getEnv();
  if (!env.KV_PROJECTS) {
    return NextResponse.json({ error: "projects store not configured" }, { status: 503 });
  }
  const auth = await requirePro(request, env);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const project = await getProject(env.KV_PROJECTS, auth.sid, id);
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const r = NextResponse.json({ project });
  if (auth.setCookie) r.headers.append("Set-Cookie", auth.setCookie);
  return r;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const env = getEnv();
  if (!env.KV_PROJECTS) {
    return NextResponse.json({ error: "projects store not configured" }, { status: 503 });
  }
  const auth = await requirePro(request, env);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = await deleteProject(env.KV_PROJECTS, auth.sid, id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  const r = NextResponse.json({ ok: true });
  if (auth.setCookie) r.headers.append("Set-Cookie", auth.setCookie);
  return r;
}
