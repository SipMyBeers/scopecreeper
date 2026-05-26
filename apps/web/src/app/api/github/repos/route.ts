/**
 * GET /api/github/repos
 *
 * Returns the first ~50 of the authenticated user's repos for the picker.
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

interface GhRepo {
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  permissions?: { push?: boolean; admin?: boolean };
}

export async function GET(request: Request): Promise<Response> {
  const env = getEnv();
  const secret = env.AUTH_SECRET ?? `${env.GITHUB_CLIENT_SECRET ?? ""}::sc-auth`;
  const token = await readAuthCookie(request, secret);
  if (!token) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }
  const res = await fetch(
    "https://api.github.com/user/repos?per_page=50&sort=pushed&affiliation=owner,collaborator",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "scopecreeper",
      },
    }
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: `GitHub responded ${res.status}` },
      { status: 502 }
    );
  }
  const repos = (await res.json()) as GhRepo[];
  const filtered = repos
    .filter((r) => r.permissions?.push !== false)
    .map((r) => ({
      full_name: r.full_name,
      private: r.private,
      default_branch: r.default_branch,
      html_url: r.html_url,
    }));
  return NextResponse.json({ repos: filtered });
}
