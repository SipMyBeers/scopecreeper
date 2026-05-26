/**
 * POST /api/checkout
 *
 * Body shapes:
 *   { product: "PRO" }                  → start a Pro subscription
 *   { product: "AUDIT", repo: "x/y" }   → buy a single deep audit
 *   { packId: "PACK_100" | "PACK_500" } → legacy credit pack (still supported)
 * Response: { url: string } (Stripe Checkout redirect target)
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import { getOrCreateSession } from "@/lib/session";
import {
  createAuditSession,
  createCheckoutSession,
  createProSubscriptionSession,
  getPack,
  PACKS,
  type PackId,
} from "@/lib/stripe";

export const runtime = "edge";

interface Env {
  STRIPE_SECRET_KEY?: string;
  KV_QUOTAS?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  };
}
function getEnv(): Env { return getCfEnv<Env>(); }

interface CheckoutBody {
  product?: "PRO" | "AUDIT";
  repo?: string;
  packId?: string;
}

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not configured" },
      { status: 503 }
    );
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { sid, setCookie } = await getOrCreateSession(request, env);
  const url = new URL(request.url);

  // --- Pro subscription ---
  if (body.product === "PRO") {
    const session = await createProSubscriptionSession({
      secretKey: env.STRIPE_SECRET_KEY,
      sid,
      successUrl: `${url.origin}/?purchase=success&product=pro`,
      cancelUrl: `${url.origin}/?purchase=cancelled`,
    });
    const response = NextResponse.json({ url: session.url });
    if (setCookie) response.headers.append("Set-Cookie", setCookie);
    return response;
  }

  // --- One-shot deep audit ---
  if (body.product === "AUDIT") {
    if (!body.repo) {
      return NextResponse.json({ error: "missing repo" }, { status: 400 });
    }
    const session = await createAuditSession({
      secretKey: env.STRIPE_SECRET_KEY,
      sid,
      repo: body.repo,
      successUrl: `${url.origin}/?purchase=success&product=audit&repo=${encodeURIComponent(body.repo)}`,
      cancelUrl: `${url.origin}/?purchase=cancelled`,
    });
    const response = NextResponse.json({ url: session.url });
    if (setCookie) response.headers.append("Set-Cookie", setCookie);
    return response;
  }

  // --- Legacy credit pack ---
  const pack = getPack(body.packId ?? "");
  if (!pack) {
    return NextResponse.json(
      {
        error: "Unknown product/packId",
        availableProducts: ["PRO", "AUDIT"],
        availablePacks: PACKS.map((p) => p.id),
      },
      { status: 400 }
    );
  }
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
