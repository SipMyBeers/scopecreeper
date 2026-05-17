/**
 * GET /api/auth/me
 *
 * Returns the authenticated GitHub user (if the signed cookie is valid).
 * 401 if no cookie / no valid token.
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import { readAuthCookie } from "@/lib/auth-cookie";

export const runtime = "edge";

interface Env {
  GITHUB_CLIENT_SECRET?: string;
  AUTH_SECRET?: string;
}
function getEnv(): Env { return getCfEnv<Env>(); }

export async function GET(request: Request): Promise<Response> {
  const env = getEnv();
  const secret = env.AUTH_SECRET ?? `${env.GITHUB_CLIENT_SECRET ?? ""}::sc-auth`;
  if (!secret) return NextResponse.json({ user: null }, { status: 200 });

  const token = await readAuthCookie(request, secret);
  if (!token) return NextResponse.json({ user: null }, { status: 200 });

  const ghRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "scopecreeper",
    },
  });
  if (!ghRes.ok) return NextResponse.json({ user: null }, { status: 200 });
  const u = (await ghRes.json()) as { login?: string; avatar_url?: string };
  return NextResponse.json({
    user: { login: u.login, avatar_url: u.avatar_url },
  });
}
