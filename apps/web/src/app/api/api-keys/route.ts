/**
 * GET    /api/api-keys           → list current user's API key metadata
 * POST   /api/api-keys           → create a new key { label }; returns the
 *                                   full key ONCE (caller must save it).
 * DELETE /api/api-keys?hash=...  → revoke by hashPrefix
 *
 * All three require an authenticated session (cookie-based). API keys
 * cannot be used to manage other API keys.
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import { createKey, listKeysForSid, revokeKey } from "@/lib/api-keys";
import { getOrCreateSession } from "@/lib/session";

export const runtime = "edge";

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  delete?: (key: string) => Promise<void>;
}
interface Env {
  KV_QUOTAS?: KV;
  AUTH_SECRET?: string;
}
function getEnv(): Env { return getCfEnv<Env>(); }

/** Refuse if the caller authenticated via a Bearer key — keys can't manage keys. */
function requireCookieSession(request: Request): { error: Response } | null {
  const auth = request.headers.get("authorization");
  if (auth && auth.startsWith("Bearer sk_sc_live_")) {
    return {
      error: NextResponse.json(
        { error: "api keys cannot be managed by another api key" },
        { status: 403 }
      ),
    };
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  const env = getEnv();
  if (!env.KV_QUOTAS) {
    return NextResponse.json({ error: "kv not configured" }, { status: 503 });
  }
  const refuse = requireCookieSession(request);
  if (refuse) return refuse.error;
  const { sid, setCookie } = await getOrCreateSession(request, env);
  const keys = await listKeysForSid(env.KV_QUOTAS, sid);
  const r = NextResponse.json({ keys });
  if (setCookie) r.headers.append("Set-Cookie", setCookie);
  return r;
}

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  if (!env.KV_QUOTAS) {
    return NextResponse.json({ error: "kv not configured" }, { status: 503 });
  }
  const refuse = requireCookieSession(request);
  if (refuse) return refuse.error;
  const { sid, setCookie } = await getOrCreateSession(request, env);

  let body: { label?: string };
  try { body = (await request.json()) as { label?: string }; }
  catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }

  try {
    const { key, meta } = await createKey(env.KV_QUOTAS, sid, body.label ?? "default");
    const r = NextResponse.json({ key, meta });
    if (setCookie) r.headers.append("Set-Cookie", setCookie);
    return r;
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const env = getEnv();
  if (!env.KV_QUOTAS) {
    return NextResponse.json({ error: "kv not configured" }, { status: 503 });
  }
  const refuse = requireCookieSession(request);
  if (refuse) return refuse.error;
  const { sid, setCookie } = await getOrCreateSession(request, env);
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash");
  if (!hash) return NextResponse.json({ error: "missing hash" }, { status: 400 });
  const ok = await revokeKey(env.KV_QUOTAS, sid, hash);
  const r = NextResponse.json({ ok });
  if (setCookie) r.headers.append("Set-Cookie", setCookie);
  return r;
}
