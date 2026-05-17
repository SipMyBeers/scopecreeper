/**
 * Signed HttpOnly cookie for the GitHub OAuth token.
 *
 * Format: `<base64url(token)>.<base64url(hmac-sha256(token, secret))>`
 * Edge-runtime safe (uses Web Crypto only).
 */

const COOKIE_NAME = "sc_gh";
const ONE_WEEK_SEC = 60 * 60 * 24 * 7;

function b64uEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64uEncodeString(str: string): string {
  return b64uEncode(new TextEncoder().encode(str));
}
function b64uDecodeString(s: string): string {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return b64uEncode(new Uint8Array(sig));
}

export async function signAuthCookie(token: string, secret: string): Promise<string> {
  const payload = b64uEncodeString(token);
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

export async function readAuthCookie(
  request: Request,
  secret: string
): Promise<string | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(/;\s*/)
    .map((p) => p.split("="))
    .find(([k]) => k === COOKIE_NAME);
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(secret, payload);
  if (expected !== sig) return null;
  try {
    return b64uDecodeString(payload);
  } catch {
    return null;
  }
}

export function buildSetCookie(value: string, opts?: { maxAge?: number; secure?: boolean }) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${opts?.maxAge ?? ONE_WEEK_SEC}`,
  ];
  if (opts?.secure ?? true) parts.push("Secure");
  return parts.join("; ");
}

export function buildClearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
