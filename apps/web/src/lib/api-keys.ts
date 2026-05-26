/**
 * API key issuance + validation. Keys are how the Scope Creeper MCP server
 * (and any other non-browser client) authenticates against the existing
 * tier-gated endpoints — same charge() / isPro() logic, different identity
 * extraction.
 *
 * Format: sk_sc_live_<32 url-safe chars>
 *
 * KV layout (in KV_QUOTAS):
 *   apikey:<sha256(key)>     → JSON ApiKeyRecord
 *   apikey-index:<sid>       → JSON ApiKeyMeta[] (so the user can list/revoke)
 *
 * We store the SHA-256 of the key, never the key itself. The user sees the
 * raw key exactly once at creation time, exactly like Stripe.
 */

const KEY_PREFIX = "sk_sc_live_";
const KEY_BYTES = 24; // 24 bytes → 32 base64url chars
const MAX_KEYS_PER_USER = 5;

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  delete?: (key: string) => Promise<void>;
}

export interface ApiKeyMeta {
  /** First 12 chars of the hash, for display/revoke. Never the secret itself. */
  hashPrefix: string;
  label: string;
  createdAt: number;
  lastUsedAt?: number;
}

export interface ApiKeyRecord extends ApiKeyMeta {
  sid: string;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function newApiKey(): string {
  const bytes = new Uint8Array(KEY_BYTES);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < KEY_BYTES; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return KEY_PREFIX + b64url(bytes);
}

export async function hashKey(key: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createKey(
  kv: KV,
  sid: string,
  label: string
): Promise<{ key: string; meta: ApiKeyMeta }> {
  // Check user's existing key count.
  const existing = await listKeysForSid(kv, sid);
  if (existing.length >= MAX_KEYS_PER_USER) {
    throw new Error(`api key limit reached (max ${MAX_KEYS_PER_USER} per user)`);
  }
  const key = newApiKey();
  const hash = await hashKey(key);
  const record: ApiKeyRecord = {
    sid,
    hashPrefix: hash.slice(0, 12),
    label: label.trim().slice(0, 60) || "default",
    createdAt: Date.now(),
  };
  await kv.put(`apikey:${hash}`, JSON.stringify(record));
  const next = [...existing, { ...record }];
  // Strip sid out of the index entries — it's identical to the lookup sid.
  await kv.put(
    `apikey-index:${sid}`,
    JSON.stringify(next.map(({ ...rest }) => rest))
  );
  return { key, meta: record };
}

export async function listKeysForSid(kv: KV, sid: string): Promise<ApiKeyMeta[]> {
  const raw = await kv.get(`apikey-index:${sid}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ApiKeyMeta[];
  } catch {
    return [];
  }
}

export async function revokeKey(
  kv: KV,
  sid: string,
  hashPrefix: string
): Promise<boolean> {
  const list = await listKeysForSid(kv, sid);
  const target = list.find((k) => k.hashPrefix === hashPrefix);
  if (!target) return false;
  const next = list.filter((k) => k.hashPrefix !== hashPrefix);
  await kv.put(`apikey-index:${sid}`, JSON.stringify(next));
  // We don't have the full hash to delete the apikey:<hash> entry, so we
  // mark the index as authoritative. Lookup also re-verifies the sid match
  // on the index — see resolveKey below. Cleanup would need a list-keys
  // scan; out of scope for v1.
  return true;
}

/** Resolve a presented Bearer token → owning sid, or null. Touches
 *  `lastUsedAt` opportunistically. */
export async function resolveKey(
  kv: KV,
  raw: string
): Promise<{ sid: string; hashPrefix: string } | null> {
  if (!raw.startsWith(KEY_PREFIX)) return null;
  const hash = await hashKey(raw);
  const recordRaw = await kv.get(`apikey:${hash}`);
  if (!recordRaw) return null;
  let record: ApiKeyRecord;
  try {
    record = JSON.parse(recordRaw) as ApiKeyRecord;
  } catch {
    return null;
  }
  // Verify the index still lists this key — gives us a cheap revoke path.
  const index = await listKeysForSid(kv, record.sid);
  if (!index.some((k) => k.hashPrefix === record.hashPrefix)) return null;
  // Update lastUsedAt (best-effort; don't block).
  void kv.put(
    `apikey:${hash}`,
    JSON.stringify({ ...record, lastUsedAt: Date.now() })
  ).catch(() => undefined);
  return { sid: record.sid, hashPrefix: record.hashPrefix };
}
