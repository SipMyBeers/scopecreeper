/**
 * GET /api/auth/github?return_to=/
 *
 * Redirects the user to GitHub for OAuth. Requires GITHUB_CLIENT_ID in env.
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";

export const runtime = "edge";

interface Env {
  GITHUB_CLIENT_ID?: string;
}
function getEnv(): Env { return getCfEnv<Env>(); }

export function GET(request: Request): Response {
  const env = getEnv();
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to") || "/";
  const clientId = env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "GitHub OAuth is not configured on this deployment. Set GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET.",
      },
      { status: 503 }
    );
  }

  const redirectUri = `${url.origin}/api/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "public_repo",
    state: btoa(returnTo).replace(/=+$/, ""),
  });
  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params}`,
    302
  );
}
