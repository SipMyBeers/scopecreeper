/**
 * GET /api/session
 *
 * Returns the current anonymous session + credit balance. Issues a
 * brand-new session with FREE_CREDITS on first visit. Always sets a
 * cookie if a new session was created.
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import { getOrCreateSession } from "@/lib/session";

export const runtime = "edge";

interface Env {
  KV_QUOTAS?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  };
  AUTH_SECRET?: string;
}
function getEnv(): Env { return getCfEnv<Env>(); }

export async function GET(request: Request): Promise<Response> {
  const env = getEnv();
  const { sid, record, setCookie } = await getOrCreateSession(request, env);
  const response = NextResponse.json({
    sid,
    credits: record.credits,
    lifetimePaid: record.lifetimePaid,
  });
  if (setCookie) response.headers.append("Set-Cookie", setCookie);
  return response;
}
