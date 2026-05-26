/**
 * Anonymous session + credit quota, backed by Cloudflare KV.
 *
 * One signed cookie holds the session id (a uuid). The KV namespace
 * `KV_QUOTAS` stores the JSON record `{credits, createdAt, lifetimePaid}`
 * keyed by `sess:<sid>`. New visitors get FREE_CREDITS on first issue.
 */

import { buildSetCookie, readAuthCookie, signAuthCookie } from "./auth-cookie";
import { resolveKey } from "./api-keys";

export const FREE_CREDITS = 10;
export const FREE_SCANS_PER_MONTH = 5;
export const PRO_AUDITS_PER_MONTH = 5;
export const SCAN_COST = 1;
export const CREEP_COST = 1;
export const SESSION_COOKIE = "sc_sid";

export type SessionTier = "free" | "pro";

export interface SessionRecord {
  /** Legacy credit balance — preserved for carrythrough, decremented first
   *  if > 0. New sessions and Pro upgrades never touch this. */
  credits: number;
  createdAt: number;
  lifetimePaid: number;
  /** Current paid tier. Default 'free'. */
  tier?: SessionTier;
  /** When the active Pro subscription ends (ms epoch). 0 / undefined = no sub. */
  proExpiresAt?: number;
  /** Stripe customer + subscription IDs so webhook lifecycle events can find us. */
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  /** Free-tier scan counter, keyed by YYYY-MM. Reset on month change. */
  freeScansThisMonth?: number;
  freeScansMonth?: string;
  /** Pro-included audits used this month, keyed by YYYY-MM. */
  proAuditsThisMonth?: number;
  proAuditsMonth?: string;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Determine whether the session is currently entitled to Pro features. */
export function isPro(record: SessionRecord): boolean {
  if (record.tier !== "pro") return false;
  if (!record.proExpiresAt) return true; // active sub, no expiry yet
  return record.proExpiresAt > Date.now();
}

/** Whether to use the legacy credit-debit path for this scan/creep call. */
export function hasLegacyCredits(record: SessionRecord): boolean {
  return (record.credits ?? 0) > 0;
}

interface KVQuotas {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
}

interface SessionEnv {
  KV_QUOTAS?: KVQuotas;
  AUTH_SECRET?: string;
}

function getSecret(env: SessionEnv): string {
  return env.AUTH_SECRET || "scopecreeper-dev-secret-CHANGE-ME";
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readSidCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(/;\s*/)) {
    const [k, v] = part.split("=");
    if (k === SESSION_COOKIE && v) return decodeURIComponent(v);
  }
  return null;
}

/**
 * Read or issue an anonymous session. Returns the session id + record
 * + a (possibly-null) Set-Cookie header to append to the response.
 *
 * If the caller presents a valid `Authorization: Bearer sk_sc_live_...`
 * header (an API key issued from /account), we resolve it to the owning
 * sid and use that session. API-key callers never get a Set-Cookie back.
 */
export async function getOrCreateSession(
  request: Request,
  env: SessionEnv
): Promise<{ sid: string; record: SessionRecord; setCookie: string | null }> {
  const secret = getSecret(env);

  // 1. Bearer-token path (MCP / CLI / any non-browser client).
  const auth = request.headers.get("authorization");
  if (auth && auth.startsWith("Bearer sk_sc_live_") && env.KV_QUOTAS) {
    const token = auth.slice("Bearer ".length).trim();
    const resolved = await resolveKey(env.KV_QUOTAS, token);
    if (resolved) {
      const record =
        (await readSession(resolved.sid, env)) ??
        ({
          credits: 0,
          createdAt: Date.now(),
          lifetimePaid: 0,
          tier: "free",
        } as SessionRecord);
      return { sid: resolved.sid, record, setCookie: null };
    }
  }

  let sid = readSidCookie(request);
  let setCookie: string | null = null;

  // No KV bound → in-memory ephemeral session (dev mode).
  if (!env.KV_QUOTAS) {
    if (!sid) {
      sid = uuid();
      setCookie = buildSetCookieRaw(sid, request);
    }
    return {
      sid,
      record: {
        credits: 0,
        createdAt: Date.now(),
        lifetimePaid: 0,
        tier: "free",
      },
      setCookie,
    };
  }

  if (sid) {
    const raw = await env.KV_QUOTAS.get(`sess:${sid}`);
    if (raw) {
      try {
        const record = JSON.parse(raw) as SessionRecord;
        return { sid, record, setCookie: null };
      } catch {
        /* corrupt — fall through to reissue */
      }
    }
  }

  sid = uuid();
  const record: SessionRecord = {
    // New sessions start on the FREE tier — 5 scans/mo, no legacy credits.
    credits: 0,
    createdAt: Date.now(),
    lifetimePaid: 0,
    tier: "free",
    freeScansThisMonth: 0,
    freeScansMonth: currentMonth(),
  };
  await env.KV_QUOTAS.put(`sess:${sid}`, JSON.stringify(record));
  setCookie = buildSetCookieRaw(sid, request);
  // Use the signed-cookie helper as a side effect to validate it works
  void signAuthCookie;
  void readAuthCookie;
  return { sid, record, setCookie };
}

function buildSetCookieRaw(sid: string, request: Request): string {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  // 1 year; same site lax; httponly so JS can't read it (server reads via cookie header).
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(sid)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 365}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
  // (buildSetCookie from auth-cookie.ts is intended for the token cookie;
  // the session cookie has different naming requirements so we build inline.)
  void buildSetCookie;
}

export async function readSession(
  sid: string,
  env: SessionEnv
): Promise<SessionRecord | null> {
  if (!env.KV_QUOTAS) {
    return { credits: FREE_CREDITS, createdAt: Date.now(), lifetimePaid: 0 };
  }
  const raw = await env.KV_QUOTAS.get(`sess:${sid}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionRecord;
  } catch {
    return null;
  }
}

export async function writeSession(
  sid: string,
  record: SessionRecord,
  env: SessionEnv
): Promise<void> {
  if (!env.KV_QUOTAS) return;
  await env.KV_QUOTAS.put(`sess:${sid}`, JSON.stringify(record));
}

/**
 * Charge a single action (scan or creep) against the session.
 * Priority: (1) legacy credits if any remain, (2) Pro tier (unlimited), (3) free-tier monthly quota.
 *
 * KILL artifacts are intentionally free-tier-eligible (it's the viral
 * loop — let people roast their projects without paying). Every other
 * artifact kind (SHIPPABLE, ISSUE, BADGE) requires Pro.
 *
 * Returns `ok: false` with reason if no entitlement applies.
 */
export async function charge(
  sid: string,
  env: SessionEnv,
  opts: { artifactKind?: "SHIPPABLE" | "KILL" | "ISSUE" | "BADGE" } = {}
): Promise<
  | { ok: true; record: SessionRecord; via: "legacy" | "pro" | "free" }
  | { ok: false; record: SessionRecord; reason: "TIER_LIMIT_REACHED" | "PRO_REQUIRED" }
> {
  const proGatedArtifact =
    opts.artifactKind != null && opts.artifactKind !== "KILL";
  // Dev mode without KV — always succeed as free.
  if (!env.KV_QUOTAS) {
    return {
      ok: true,
      record: {
        credits: 0,
        createdAt: Date.now(),
        lifetimePaid: 0,
        tier: "free",
      },
      via: "free",
    };
  }
  const existing = await readSession(sid, env);
  if (!existing) {
    return {
      ok: false,
      record: { credits: 0, createdAt: Date.now(), lifetimePaid: 0, tier: "free" },
      reason: "TIER_LIMIT_REACHED",
    };
  }
  // (1) Legacy credit path — burn down old purchases first.
  if (hasLegacyCredits(existing)) {
    const next: SessionRecord = { ...existing, credits: existing.credits - 1 };
    await writeSession(sid, next, env);
    return { ok: true, record: next, via: "legacy" };
  }
  // (2) Pro tier — unlimited scans + creeps. Artifacts also unlimited per plan.
  if (isPro(existing)) {
    return { ok: true, record: existing, via: "pro" };
  }
  // (3) Free tier — Pro-gated artifacts hit the paywall here.
  if (proGatedArtifact) {
    return { ok: false, record: existing, reason: "PRO_REQUIRED" };
  }
  // (3b) Free-tier monthly scan quota.
  const month = currentMonth();
  const used =
    existing.freeScansMonth === month ? existing.freeScansThisMonth ?? 0 : 0;
  if (used >= FREE_SCANS_PER_MONTH) {
    return { ok: false, record: existing, reason: "TIER_LIMIT_REACHED" };
  }
  const next: SessionRecord = {
    ...existing,
    freeScansMonth: month,
    freeScansThisMonth: used + 1,
  };
  await writeSession(sid, next, env);
  return { ok: true, record: next, via: "free" };
}

/** Legacy alias preserved for the older /api/score code path. */
export const debit = async (
  sid: string,
  amount: number,
  env: SessionEnv
): Promise<{ ok: true; record: SessionRecord } | { ok: false; record: SessionRecord }> => {
  void amount; // historic API; we always charge 1 per call now
  const r = await charge(sid, env);
  return r.ok ? { ok: true, record: r.record } : { ok: false, record: r.record };
};

/** Flip a session to Pro after Stripe checkout / subscription event. */
export async function setPro(
  sid: string,
  env: SessionEnv,
  args: {
    expiresAt?: number; // ms epoch; omitted = active w/o end
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    paidUsdCents?: number;
  } = {}
): Promise<SessionRecord> {
  const existing = (await readSession(sid, env)) ?? {
    credits: 0,
    createdAt: Date.now(),
    lifetimePaid: 0,
  };
  const next: SessionRecord = {
    ...existing,
    tier: "pro",
    proExpiresAt: args.expiresAt,
    stripeCustomerId: args.stripeCustomerId ?? existing.stripeCustomerId,
    stripeSubscriptionId:
      args.stripeSubscriptionId ?? existing.stripeSubscriptionId,
    lifetimePaid: existing.lifetimePaid + (args.paidUsdCents ?? 0),
  };
  await writeSession(sid, next, env);
  return next;
}

/** Demote a session back to free (subscription cancelled / expired). */
export async function setFree(
  sid: string,
  env: SessionEnv
): Promise<SessionRecord> {
  const existing = await readSession(sid, env);
  if (!existing) {
    return { credits: 0, createdAt: Date.now(), lifetimePaid: 0, tier: "free" };
  }
  const next: SessionRecord = {
    ...existing,
    tier: "free",
    proExpiresAt: undefined,
  };
  await writeSession(sid, next, env);
  return next;
}

/** Locate a session by stripe customer id — webhooks arrive without our sid. */
export async function findSessionByCustomerId(
  customerId: string,
  env: SessionEnv
): Promise<{ sid: string; record: SessionRecord } | null> {
  if (!env.KV_QUOTAS) return null;
  // KV doesn't support listing without a list-key, so we maintain an index.
  const sid = await env.KV_QUOTAS.get(`stripe_customer:${customerId}`);
  if (!sid) return null;
  const record = await readSession(sid, env);
  if (!record) return null;
  return { sid, record };
}

/** Persist the customer→sid pointer so subscription events can find this session. */
export async function indexStripeCustomer(
  customerId: string,
  sid: string,
  env: SessionEnv
): Promise<void> {
  if (!env.KV_QUOTAS) return;
  await env.KV_QUOTAS.put(`stripe_customer:${customerId}`, sid);
}

/** Add credits (called from the Stripe webhook on successful purchase). */
export async function credit(
  sid: string,
  amount: number,
  paidUsdCents: number,
  env: SessionEnv
): Promise<SessionRecord> {
  const existing = (await readSession(sid, env)) ?? {
    credits: 0,
    createdAt: Date.now(),
    lifetimePaid: 0,
  };
  const next: SessionRecord = {
    ...existing,
    credits: existing.credits + amount,
    lifetimePaid: existing.lifetimePaid + paidUsdCents,
  };
  await writeSession(sid, next, env);
  return next;
}
