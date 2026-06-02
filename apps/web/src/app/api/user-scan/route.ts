import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import { scanUser, type UserScanEnv } from "@/lib/user-scan";

export const runtime = "edge";

export async function POST(request: Request): Promise<Response> {
  const env = getCfEnv<UserScanEnv>();

  let body: { username?: string };
  try {
    body = (await request.json()) as { username?: string };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const username = body?.username?.trim();
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  try {
    const result = await scanUser(username, env);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "scan failed";
    const status = msg.includes("not found") ? 404 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(request: Request): Promise<Response> {
  const env = getCfEnv<UserScanEnv>();
  const url = new URL(request.url);
  const username = url.searchParams.get("username")?.trim();

  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  try {
    const result = await scanUser(username, env);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "scan failed";
    const status = msg.includes("not found") ? 404 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
