/**
 * GET /api/auth/github/callback?code=...&state=...
 *
 * Exchanges the OAuth code for an access token, signs it into an
 * HttpOnly cookie, redirects back to the original page.
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import { buildSetCookie, signAuthCookie } from "@/lib/auth-cookie";

export const runtime = "edge";

interface Env {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  AUTH_SECRET?: string;
}
function getEnv(): Env { return getCfEnv<Env>(); }

export async function GET(request: Request): Promise<Response> {
  const env = getEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "OAuth not configured" },
      { status: 503 }
    );
  }
  const secret = env.AUTH_SECRET ?? `${env.GITHUB_CLIENT_SECRET}::sc-auth`;

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/auth/github/callback`,
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.json(
      { error: "token exchange failed" },
      { status: 502 }
    );
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    return NextResponse.json(
      { error: "no access_token in response" },
      { status: 502 }
    );
  }

  const cookieValue = await signAuthCookie(tokenData.access_token, secret);
  let returnTo = "/";
  try {
    returnTo = atob(state);
    if (!returnTo.startsWith("/")) returnTo = "/";
  } catch {
    /* fall through */
  }

  const response = NextResponse.redirect(`${url.origin}${returnTo}`, 302);
  response.headers.append(
    "Set-Cookie",
    buildSetCookie(cookieValue, { secure: url.protocol === "https:" })
  );
  return response;
}
