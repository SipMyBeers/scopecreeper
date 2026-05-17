/**
 * POST /api/stripe/webhook
 *
 * Stripe will POST `checkout.session.completed` events here. We verify
 * the signature, then top up the session's credit balance in KV.
 *
 * Configure in Stripe Dashboard:
 *   - Endpoint: https://scopecreeper.pages.dev/api/stripe/webhook
 *   - Events:   checkout.session.completed
 *   - Signing secret → wrangler pages secret put STRIPE_WEBHOOK_SECRET
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import { credit } from "@/lib/session";
import { verifyStripeSignature } from "@/lib/stripe";

export const runtime = "edge";

interface Env {
  STRIPE_WEBHOOK_SECRET?: string;
  KV_QUOTAS?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  };
}
function getEnv(): Env { return getCfEnv<Env>(); }

interface StripeEvent {
  type: string;
  data: {
    object: {
      id?: string;
      client_reference_id?: string;
      payment_status?: string;
      amount_total?: number;
      metadata?: {
        sid?: string;
        pack_id?: string;
        credits?: string;
      };
    };
  };
}

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  const rawBody = await request.text();

  if (env.STRIPE_WEBHOOK_SECRET) {
    const ok = await verifyStripeSignature(
      rawBody,
      request.headers.get("stripe-signature"),
      env.STRIPE_WEBHOOK_SECRET
    );
    if (!ok) {
      return NextResponse.json(
        { error: "invalid signature" },
        { status: 400 }
      );
    }
  } else {
    // No secret configured — refuse in production, allow in dev.
    console.warn(
      "STRIPE_WEBHOOK_SECRET not set; skipping signature verification"
    );
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // Acknowledge anything else without action.
    return NextResponse.json({ received: true });
  }

  const obj = event.data.object;
  if (obj.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const sid = obj.metadata?.sid ?? obj.client_reference_id;
  const credits = Number(obj.metadata?.credits ?? 0);
  const amountCents = Number(obj.amount_total ?? 0);

  if (!sid || !credits) {
    return NextResponse.json(
      { error: "missing sid or credits in metadata" },
      { status: 400 }
    );
  }

  const next = await credit(sid, credits, amountCents, env);
  return NextResponse.json({
    received: true,
    sid,
    newBalance: next.credits,
    lifetimePaid: next.lifetimePaid,
  });
}
