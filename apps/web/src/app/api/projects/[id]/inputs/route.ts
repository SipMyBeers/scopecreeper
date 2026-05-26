/**
 * POST /api/projects/:id/inputs
 *
 * Body shapes:
 *   { kind: "repo",    repo: "owner/name" }
 *   { kind: "chatlog", title: "...",  text: "..." }
 *   { kind: "doc",     title: "...",  mime: "text/markdown"|"text/plain"|"application/pdf",  text: "..." }
 *
 * Returns the updated project.
 * Pro-gated. Adding an input invalidates the cached analysis.
 *
 * DELETE /api/projects/:id/inputs?inputId=xxx → remove one input.
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import {
  getOrCreateSession,
  hasLegacyCredits,
  isPro,
  readSession,
} from "@/lib/session";
import {
  addInput,
  newId,
  removeInput,
} from "@/lib/projects";
import { parseChatlog } from "@/core";
import type {
  ProjectChatlogInput,
  ProjectDocInput,
  ProjectRepoInput,
} from "@/core";

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

const TEXT_CAP = 80 * 1024; // 80KB cap per chatlog/doc value

interface RepoBody { kind: "repo"; repo: string }
interface ChatlogBody { kind: "chatlog"; title?: string; text: string }
interface DocBody { kind: "doc"; title: string; mime: string; text: string }
type InputBody = RepoBody | ChatlogBody | DocBody;

/** Fetch a repo's README + package.json and a thin metadata dossier. */
async function fetchRepoSnapshot(repo: string): Promise<ProjectRepoInput["meta"]> {
  const meta: ProjectRepoInput["meta"] = {};
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "scopecreeper" },
    });
    if (r.ok) {
      const j = (await r.json()) as { description?: string; default_branch?: string };
      meta.description = j.description ?? undefined;
      meta.defaultBranch = j.default_branch;
    }
  } catch { /* ignore */ }

  const branch = meta.defaultBranch ?? "main";
  // README — try the standard branches.
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/readme`, {
      headers: { Accept: "application/vnd.github.raw", "User-Agent": "scopecreeper" },
    });
    if (r.ok) {
      const text = await r.text();
      meta.readmeExcerpt = text.slice(0, 8000);
    }
  } catch { /* ignore */ }

  // package.json — try root, fall back to default branch.
  try {
    const r = await fetch(
      `https://raw.githubusercontent.com/${repo}/${branch}/package.json`,
      { headers: { "User-Agent": "scopecreeper" } }
    );
    if (r.ok) {
      const text = await r.text();
      meta.packageJsonExcerpt = text.slice(0, 4000);
    }
  } catch { /* ignore */ }

  return meta;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const env = getEnv();
  if (!env.KV_PROJECTS) {
    return NextResponse.json({ error: "projects store not configured" }, { status: 503 });
  }
  const auth = await requirePro(request, env);
  if (!auth.ok) return auth.response;
  const { id: projectId } = await params;

  let body: InputBody;
  try {
    body = (await request.json()) as InputBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body || !body.kind) {
    return NextResponse.json({ error: "missing kind" }, { status: 400 });
  }

  try {
    if (body.kind === "repo") {
      if (!body.repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(body.repo)) {
        return NextResponse.json(
          { error: "repo must be 'owner/name'" },
          { status: 400 }
        );
      }
      const meta = await fetchRepoSnapshot(body.repo);
      const input: ProjectRepoInput = {
        kind: "repo",
        id: newId("in"),
        addedAt: Date.now(),
        repo: body.repo,
        meta,
      };
      const next = await addInput(env.KV_PROJECTS, auth.sid, projectId, input);
      if (!next) return NextResponse.json({ error: "not found" }, { status: 404 });
      const r = NextResponse.json({ project: next });
      if (auth.setCookie) r.headers.append("Set-Cookie", auth.setCookie);
      return r;
    }

    if (body.kind === "chatlog") {
      const text = (body.text ?? "").slice(0, TEXT_CAP);
      if (!text.trim()) {
        return NextResponse.json({ error: "empty chatlog" }, { status: 400 });
      }
      const parsed = parseChatlog(text);
      const input: ProjectChatlogInput = {
        kind: "chatlog",
        id: newId("in"),
        addedAt: Date.now(),
        title: (body.title ?? "Chatlog").slice(0, 80),
        text,
        turns: parsed.turns.length,
        wordCount: parsed.wordCount,
      };
      const next = await addInput(env.KV_PROJECTS, auth.sid, projectId, input);
      if (!next) return NextResponse.json({ error: "not found" }, { status: 404 });
      const r = NextResponse.json({ project: next });
      if (auth.setCookie) r.headers.append("Set-Cookie", auth.setCookie);
      return r;
    }

    if (body.kind === "doc") {
      const text = (body.text ?? "").slice(0, TEXT_CAP);
      if (!text.trim()) {
        return NextResponse.json({ error: "empty doc" }, { status: 400 });
      }
      const mime = (body.mime || "text/plain").slice(0, 64);
      const input: ProjectDocInput = {
        kind: "doc",
        id: newId("in"),
        addedAt: Date.now(),
        title: (body.title ?? "Document").slice(0, 80),
        mime,
        text,
        bytes: text.length,
      };
      const next = await addInput(env.KV_PROJECTS, auth.sid, projectId, input);
      if (!next) return NextResponse.json({ error: "not found" }, { status: 404 });
      const r = NextResponse.json({ project: next });
      if (auth.setCookie) r.headers.append("Set-Cookie", auth.setCookie);
      return r;
    }

    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
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
  const { id: projectId } = await params;
  const url = new URL(request.url);
  const inputId = url.searchParams.get("inputId");
  if (!inputId) return NextResponse.json({ error: "missing inputId" }, { status: 400 });
  const next = await removeInput(env.KV_PROJECTS, auth.sid, projectId, inputId);
  if (!next) return NextResponse.json({ error: "not found" }, { status: 404 });
  const r = NextResponse.json({ project: next });
  if (auth.setCookie) r.headers.append("Set-Cookie", auth.setCookie);
  return r;
}
