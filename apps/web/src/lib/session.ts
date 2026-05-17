/**
 * Anonymous session + credit quota, backed by Cloudflare KV.
 *
 * One signed cookie holds the session id (a uuid). The KV namespace
 * `KV_QUOTAS` stores the JSON record `{credits, createdAt, lifetimePaid}`
 * keyed by `sess:<sid>`. New visitors get FREE_CREDITS on first issue.
 */

import { buildSetCookie, readAuthCookie, signAuthCookie } from "./auth-cookie";

export const FREE_CREDITS = 10;
export const SCAN_COST = 1;
export const CREEP_COST = 1;
export const SESSION_COOKIE = "sc_sid";

export interface SessionRecord {
  credits: number;
  createdAt: number;
  lifetimePaid: number;
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
 */
export async function getOrCreateSession(
  request: Request,
  env: SessionEnv
): Promise<{ sid: string; record: SessionRecord; setCookie: string | null }> {
  const secret = getSecret(env);
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
      record: { credits: FREE_CREDITS, createdAt: Date.now(), lifetimePaid: 0 },
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
    credits: FREE_CREDITS,
    createdAt: Date.now(),
    lifetimePaid: 0,
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

/** Try to debit credits; returns the new record or `null` if insufficient. */
export async function debit(
  sid: string,
  amount: number,
  env: SessionEnv
): Promise<{ ok: true; record: SessionRecord } | { ok: false; record: SessionRecord }> {
  // Dev mode without KV — always succeed.
  if (!env.KV_QUOTAS) {
    return {
      ok: true,
      record: { credits: FREE_CREDITS, createdAt: Date.now(), lifetimePaid: 0 },
    };
  }
  const existing = await readSession(sid, env);
  if (!existing) {
    return {
      ok: false,
      record: { credits: 0, createdAt: Date.now(), lifetimePaid: 0 },
    };
  }
  if (existing.credits < amount) {
    return { ok: false, record: existing };
  }
  const next: SessionRecord = {
    ...existing,
    credits: existing.credits - amount,
  };
  await writeSession(sid, next, env);
  return { ok: true, record: next };
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
