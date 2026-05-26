/**
 * POST /api/stripe/webhook
 *
 * Stripe events handled:
 *   checkout.session.completed           — fulfil one-shot purchases (packs, audits)
 *                                          and tag Pro subscriptions for indexing.
 *   customer.subscription.created/updated — set/extend Pro entitlement.
 *   customer.subscription.deleted        — downgrade to free.
 *   invoice.payment_failed               — apply 7-day grace period to Pro.
 *
 * Configure in Stripe Dashboard:
 *   - Endpoint: https://scopecreeper.pages.dev/api/stripe/webhook
 *   - Events:   checkout.session.completed, customer.subscription.created,
 *               customer.subscription.updated, customer.subscription.deleted,
 *               invoice.payment_failed
 *   - Signing secret → wrangler pages secret put STRIPE_WEBHOOK_SECRET
 */
import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf-env";
import {
  credit,
  findSessionByCustomerId,
  indexStripeCustomer,
  readSession,
  setFree,
  setPro,
  writeSession,
} from "@/lib/session";
import { verifyStripeSignature } from "@/lib/stripe";

export const runtime = "edge";

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
}
interface Env {
  STRIPE_WEBHOOK_SECRET?: string;
  KV_QUOTAS?: KV;
}
function getEnv(): Env { return getCfEnv<Env>(); }

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface StripeCheckoutSessionObj {
  id?: string;
  customer?: string;
  subscription?: string;
  client_reference_id?: string;
  payment_status?: string;
  amount_total?: number;
  mode?: "payment" | "subscription" | "setup";
  metadata?: {
    sid?: string;
    pack_id?: string;
    credits?: string;
    price_id?: string;
    repo?: string;
  };
}

interface StripeSubscriptionObj {
  id?: string;
  customer?: string;
  status?: string;
  current_period_end?: number; // unix seconds
  cancel_at_period_end?: boolean;
  metadata?: { sid?: string };
}

interface StripeInvoiceObj {
  customer?: string;
  subscription?: string;
}

interface StripeEvent {
  type: string;
  data: { object: unknown };
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
      return NextResponse.json({ error: "invalid signature" }, { status: 400 });
    }
  } else {
    console.warn("STRIPE_WEBHOOK_SECRET not set; skipping signature verification");
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        return await handleCheckoutCompleted(event.data.object as StripeCheckoutSessionObj, env);
      case "customer.subscription.created":
      case "customer.subscription.updated":
        return await handleSubscriptionUpsert(event.data.object as StripeSubscriptionObj, env);
      case "customer.subscription.deleted":
        return await handleSubscriptionDeleted(event.data.object as StripeSubscriptionObj, env);
      case "invoice.payment_failed":
        return await handleInvoiceFailed(event.data.object as StripeInvoiceObj, env);
      default:
        return NextResponse.json({ received: true, ignored: event.type });
    }
  } catch (err) {
    console.error("webhook handler failed:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(
  obj: StripeCheckoutSessionObj,
  env: Env
): Promise<Response> {
  if (obj.payment_status !== "paid") {
    return NextResponse.json({ received: true, reason: "not-paid" });
  }
  const sid = obj.metadata?.sid ?? obj.client_reference_id;
  if (!sid) {
    return NextResponse.json({ error: "missing sid in metadata" }, { status: 400 });
  }

  // Pro subscription: just index customer→sid; subscription.* will set entitlement.
  if (obj.mode === "subscription" || obj.metadata?.price_id === "PRO_MONTHLY") {
    if (obj.customer) {
      await indexStripeCustomer(obj.customer, sid, env);
    }
    return NextResponse.json({ received: true, sid, type: "pro_subscribed" });
  }

  // One-shot audit purchase.
  if (obj.metadata?.price_id === "AUDIT_ONCE") {
    const repo = obj.metadata?.repo;
    const existing = (await readSession(sid, env)) ?? {
      credits: 0,
      createdAt: Date.now(),
      lifetimePaid: 0,
      tier: "free" as const,
    };
    // Mark an audit credit on the session — consumed when the audit job is enqueued.
    await writeSession(
      sid,
      {
        ...existing,
        lifetimePaid: existing.lifetimePaid + (obj.amount_total ?? 0),
      },
      env
    );
    if (env.KV_QUOTAS && repo) {
      await env.KV_QUOTAS.put(
        `audit_credit:${sid}:${Date.now()}`,
        JSON.stringify({ repo, purchasedAt: Date.now() })
      );
    }
    return NextResponse.json({ received: true, sid, type: "audit_purchased", repo });
  }

  // Legacy credit pack.
  const credits = Number(obj.metadata?.credits ?? 0);
  if (!credits) {
    return NextResponse.json({ received: true, ignored: "unknown checkout product" });
  }
  const next = await credit(sid, credits, obj.amount_total ?? 0, env);
  return NextResponse.json({
    received: true,
    sid,
    type: "pack_credited",
    newBalance: next.credits,
  });
}

async function handleSubscriptionUpsert(
  sub: StripeSubscriptionObj,
  env: Env
): Promise<Response> {
  if (!sub.customer) {
    return NextResponse.json({ received: true, reason: "no-customer" });
  }
  const found = await findSessionByCustomerId(sub.customer, env);
  // Fall back to subscription metadata.sid if customer index isn't built yet.
  const sid = found?.sid ?? sub.metadata?.sid;
  if (!sid) {
    return NextResponse.json(
      { received: true, reason: "no-sid-mapping", customer: sub.customer },
      { status: 200 }
    );
  }
  // If we just discovered the customer via metadata, persist the index now.
  if (!found) await indexStripeCustomer(sub.customer, sid, env);

  if (sub.status === "active" || sub.status === "trialing") {
    const expires = sub.current_period_end
      ? sub.current_period_end * 1000 + GRACE_PERIOD_MS
      : undefined;
    await setPro(sid, env, {
      expiresAt: expires,
      stripeCustomerId: sub.customer,
      stripeSubscriptionId: sub.id,
    });
    return NextResponse.json({ received: true, sid, type: "pro_active", expires });
  }
  if (sub.status === "canceled" || sub.status === "incomplete_expired") {
    await setFree(sid, env);
    return NextResponse.json({ received: true, sid, type: "pro_cancelled" });
  }
  return NextResponse.json({ received: true, sid, type: "pro_status_ignored", status: sub.status });
}

async function handleSubscriptionDeleted(
  sub: StripeSubscriptionObj,
  env: Env
): Promise<Response> {
  if (!sub.customer) return NextResponse.json({ received: true });
  const found = await findSessionByCustomerId(sub.customer, env);
  if (!found) return NextResponse.json({ received: true, reason: "no-sid" });
  await setFree(found.sid, env);
  return NextResponse.json({ received: true, sid: found.sid, type: "pro_deleted" });
}

async function handleInvoiceFailed(
  inv: StripeInvoiceObj,
  env: Env
): Promise<Response> {
  if (!inv.customer) return NextResponse.json({ received: true });
  const found = await findSessionByCustomerId(inv.customer, env);
  if (!found) return NextResponse.json({ received: true, reason: "no-sid" });
  // Trim entitlement to 7 days from now, so a recovered payment doesn't trigger
  // an immediate downgrade and a missed retry does.
  await setPro(found.sid, env, {
    expiresAt: Date.now() + GRACE_PERIOD_MS,
    stripeCustomerId: inv.customer,
    stripeSubscriptionId: inv.subscription,
  });
  return NextResponse.json({ received: true, sid: found.sid, type: "pro_grace" });
}
