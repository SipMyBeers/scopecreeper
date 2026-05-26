/**
 * POST /api/audit
 *
 * Body: { repo: "owner/name" }
 * Response: AuditReport JSON
 *
 * Pro-only OR consumes one AUDIT_ONCE credit if available.
 * Runs synchronously inline (no queue) within Worker limits — 30s wall,
 * 200 files / 30MB total.
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import { runAudit } from "@/lib/audit-runner";
import { recordAudit } from "@/lib/leaderboard";
import { getOrCreateSession, isPro, readSession } from "@/lib/session";

export const runtime = "edge";

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  list?: (opts: { prefix: string }) => Promise<{ keys: { name: string }[] }>;
  delete?: (key: string) => Promise<void>;
}
interface Env {
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  KV_QUOTAS?: KV;
  KV_LEADERBOARD?: KV;
  AUTH_SECRET?: string;
}
function getEnv(): Env { return getCfEnv<Env>(); }

interface AuditBody {
  repo?: string;
}

async function consumeAuditCredit(sid: string, env: Env): Promise<boolean> {
  const kv = env.KV_QUOTAS;
  if (!kv?.list || !kv.delete) return false;
  const { keys } = await kv.list({ prefix: `audit_credit:${sid}:` });
  if (keys.length === 0) return false;
  // Consume the oldest credit.
  await kv.delete(keys[0].name);
  return true;
}

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  const { sid, setCookie } = await getOrCreateSession(request, env);

  let body: AuditBody;
  try {
    body = (await request.json()) as AuditBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(body.repo)) {
    return NextResponse.json(
      { error: "missing or invalid repo (need 'owner/name')" },
      { status: 400 }
    );
  }

  // Entitlement: Pro OR a one-shot audit credit purchased via AUDIT_ONCE.
  const record = await readSession(sid, env);
  const allowed =
    (record && isPro(record)) ||
    (record && await consumeAuditCredit(sid, env));
  if (!allowed) {
    const r = NextResponse.json(
      {
        error: "PRO_REQUIRED",
        message: "Deep audit requires Pro ($9/mo) or a $5 audit credit.",
      },
      { status: 402 }
    );
    if (setCookie) r.headers.append("Set-Cookie", setCookie);
    return r;
  }

  try {
    const report = await runAudit(body.repo, env.AI);
    // Best-effort: record on the public leaderboard so /board has live data.
    // Audits are Pro-gated so this is naturally rate-limited.
    if (env.KV_LEADERBOARD) {
      try {
        await recordAudit(env.KV_LEADERBOARD, {
          repo: report.repo,
          delusionScore: report.delusionScore,
          findingCount: report.findings.length,
          filesScanned: report.filesScanned,
          scannedAt: report.scannedAt,
          truncated: report.truncated,
        });
      } catch (err) {
        console.error("leaderboard record failed:", err);
      }
    }
    const r = NextResponse.json(report);
    if (setCookie) r.headers.append("Set-Cookie", setCookie);
    return r;
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}
