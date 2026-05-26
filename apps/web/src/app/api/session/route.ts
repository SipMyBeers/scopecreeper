/**
 * GET /api/session
 *
 * Returns the current anonymous session + credit balance. Issues a
 * brand-new session with FREE_CREDITS on first visit. Always sets a
 * cookie if a new session was created.
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import { FREE_SCANS_PER_MONTH, getOrCreateSession, isPro } from "@/lib/session";

export const runtime = "edge";

interface Env {
  KV_QUOTAS?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  };
  AUTH_SECRET?: string;
}
function getEnv(): Env { return getCfEnv<Env>(); }

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: Request): Promise<Response> {
  const env = getEnv();
  const { sid, record, setCookie } = await getOrCreateSession(request, env);
  const month = currentMonth();
  const freeScansUsed =
    record.freeScansMonth === month ? record.freeScansThisMonth ?? 0 : 0;
  const freeScansRemaining = Math.max(0, FREE_SCANS_PER_MONTH - freeScansUsed);
  const response = NextResponse.json({
    sid,
    credits: record.credits,
    lifetimePaid: record.lifetimePaid,
    tier: record.tier ?? "free",
    isPro: isPro(record),
    proExpiresAt: record.proExpiresAt ?? null,
    freeScansRemaining,
    freeScansPerMonth: FREE_SCANS_PER_MONTH,
  });
  if (setCookie) response.headers.append("Set-Cookie", setCookie);
  return response;
}
