/**
 * POST /api/checkout
 *
 * Body: { packId: "PACK_100" | "PACK_500" }
 * Response: { url: string }   // Stripe Checkout URL to redirect the user to
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import { getOrCreateSession } from "@/lib/session";
import { createCheckoutSession, getPack, PACKS, type PackId } from "@/lib/stripe";

export const runtime = "edge";

interface Env {
  STRIPE_SECRET_KEY?: string;
  KV_QUOTAS?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  };
}
function getEnv(): Env { return getCfEnv<Env>(); }

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not configured" },
      { status: 503 }
    );
  }

  let body: { packId?: string };
  try {
    body = (await request.json()) as { packId?: string };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const pack = getPack(body.packId ?? "");
  if (!pack) {
    return NextResponse.json(
      { error: "Unknown packId", available: PACKS.map((p) => p.id) },
      { status: 400 }
    );
  }

  const { sid, setCookie } = await getOrCreateSession(request, env);
  const url = new URL(request.url);
  const session = await createCheckoutSession({
    secretKey: env.STRIPE_SECRET_KEY,
    packId: pack.id as PackId,
    sid,
    successUrl: `${url.origin}/?purchase=success&pack=${pack.id}`,
    cancelUrl: `${url.origin}/?purchase=cancelled`,
  });

  const response = NextResponse.json({ url: session.url });
  if (setCookie) response.headers.append("Set-Cookie", setCookie);
  return response;
}
