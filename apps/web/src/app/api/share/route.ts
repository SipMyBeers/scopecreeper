/**
 * POST /api/share
 *
 * Body: { thread: ScanThread }
 * Response: { slug, url }
 *
 * Pro-only. Writes the serialized thread to KV_SHARED_THREADS under
 * `share:${slug}`. TTL 90 days.
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import type { ScanThread } from "@/core";
import { getOrCreateSession, readSession, isPro, hasLegacyCredits } from "@/lib/session";
import { newSlug, putShared } from "@/lib/shared-threads";

export const runtime = "edge";

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
}
interface Env {
  KV_QUOTAS?: KV;
  KV_SHARED_THREADS?: KV;
  AUTH_SECRET?: string;
}
function getEnv(): Env { return getCfEnv<Env>(); }

interface ShareBody {
  thread?: ScanThread;
}

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  if (!env.KV_SHARED_THREADS) {
    return NextResponse.json({ error: "share store not configured" }, { status: 503 });
  }

  const { sid, setCookie } = await getOrCreateSession(request, env);
  const record = await readSession(sid, env);
  // Pro-only — legacy-credit holders are also allowed during carrythrough
  // so existing pack purchasers can share before they exhaust credits.
  if (!record || (!isPro(record) && !hasLegacyCredits(record))) {
    const r = NextResponse.json(
      {
        error: "PRO_REQUIRED",
        message: "Share links are a Pro feature. Upgrade to share your trees.",
      },
      { status: 402 }
    );
    if (setCookie) r.headers.append("Set-Cookie", setCookie);
    return r;
  }

  let body: ShareBody;
  try {
    body = (await request.json()) as ShareBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.thread?.id || !body.thread?.result) {
    return NextResponse.json({ error: "missing thread" }, { status: 400 });
  }

  // Cap stored size to keep KV cheap.
  const serialized = JSON.stringify(body.thread);
  if (serialized.length > 256 * 1024) {
    return NextResponse.json(
      { error: "thread too large (>256KB)" },
      { status: 413 }
    );
  }

  const slug = newSlug();
  await putShared(env.KV_SHARED_THREADS, slug, {
    thread: body.thread,
    createdBy: sid,
    createdAt: Date.now(),
  });

  const origin = new URL(request.url).origin;
  const r = NextResponse.json({ slug, url: `${origin}/t/${slug}` });
  if (setCookie) r.headers.append("Set-Cookie", setCookie);
  return r;
}
