/**
 * Tiny edge-safe Stripe helper: only the calls we need, using `fetch`
 * against the REST API. Avoids the `stripe` npm package (Node http).
 */

export const PACKS = [
  { id: "PACK_100", credits: 100, priceUsd: 5,  priceCents: 500 },
  { id: "PACK_500", credits: 500, priceUsd: 20, priceCents: 2000 },
] as const;

export type PackId = (typeof PACKS)[number]["id"];

export function getPack(id: string): (typeof PACKS)[number] | null {
  return PACKS.find((p) => p.id === id) ?? null;
}

interface StripeCheckoutSession {
  id: string;
  url: string;
}

/** Stripe API version. Always pin so the integration is stable. */
const STRIPE_VERSION = "2026-02-25.clover";

export async function createCheckoutSession(args: {
  secretKey: string;
  packId: PackId;
  sid: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<StripeCheckoutSession> {
  const pack = getPack(args.packId);
  if (!pack) throw new Error(`Unknown pack: ${args.packId}`);

  const form = new URLSearchParams();
  form.append("mode", "payment");
  form.append("success_url", args.successUrl);
  form.append("cancel_url", args.cancelUrl);
  // Don't hardcode `payment_method_types` — Stripe will pick the right
  // ones based on the merchant's dashboard config (card + wallets + etc).
  form.append("line_items[0][quantity]", "1");
  form.append("line_items[0][price_data][currency]", "usd");
  form.append(
    "line_items[0][price_data][unit_amount]",
    String(pack.priceCents)
  );
  form.append(
    "line_items[0][price_data][product_data][name]",
    `Scope Creeper :: ${pack.credits} CREDITS`
  );
  form.append(
    "line_items[0][price_data][product_data][description]",
    `${pack.credits} scan/creep credits added to your anonymous session.`
  );
  // Stash session id + pack so the webhook knows who/what to credit.
  form.append("client_reference_id", args.sid);
  form.append("metadata[sid]", args.sid);
  form.append("metadata[pack_id]", pack.id);
  form.append("metadata[credits]", String(pack.credits));

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_VERSION,
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Stripe checkout create failed: ${res.status} ${t}`);
  }
  return (await res.json()) as StripeCheckoutSession;
}

/**
 * Verify a Stripe webhook signature (Web Crypto, edge-runtime safe).
 *
 * Stripe signs `${timestamp}.${rawBody}` with HMAC-SHA256 and sends
 * `stripe-signature: t=<ts>,v1=<sig>,v1=<other>,...`.
 */
export async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSec = 300
): Promise<boolean> {
  if (!header) return false;
  let ts: string | null = null;
  const v1: string[] = [];
  for (const part of header.split(/,\s*/)) {
    const [k, v] = part.split("=");
    if (!k || !v) continue;
    if (k === "t") ts = v;
    else if (k === "v1") v1.push(v);
  }
  if (!ts || v1.length === 0) return false;

  const tsNum = Number(ts);
  if (Math.abs(Date.now() / 1000 - tsNum) > toleranceSec) return false;

  const payload = `${ts}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  for (const candidate of v1) {
    if (timingSafeEq(candidate, expected)) return true;
  }
  return false;
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
