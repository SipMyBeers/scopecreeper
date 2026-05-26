/**
 * KV-backed shared-thread store. Distinct from `lib/threads.ts` which is the
 * browser localStorage helper. Threads are serialized JSON; slugs are short
 * URL-safe ids.
 */
import type { ScanThread } from "@/core";

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  delete?: (key: string) => Promise<void>;
}

const TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days
const SLUG_LEN = 8;
const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no l/o/0/1 — visual ambiguity

export function newSlug(): string {
  let out = "";
  const buf = new Uint8Array(SLUG_LEN);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < SLUG_LEN; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < SLUG_LEN; i++) {
    out += SLUG_ALPHABET[buf[i] % SLUG_ALPHABET.length];
  }
  return out;
}

export interface SharedThreadEnvelope {
  /** Stored verbatim. Avoid PII before write. */
  thread: ScanThread;
  /** Sid that created the share — for ownership/abuse traceback only. */
  createdBy: string;
  createdAt: number;
}

export async function putShared(
  kv: KV,
  slug: string,
  envelope: SharedThreadEnvelope
): Promise<void> {
  await kv.put(`share:${slug}`, JSON.stringify(envelope), {
    expirationTtl: TTL_SECONDS,
  });
}

export async function getShared(
  kv: KV,
  slug: string
): Promise<SharedThreadEnvelope | null> {
  const raw = await kv.get(`share:${slug}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SharedThreadEnvelope;
  } catch {
    return null;
  }
}
