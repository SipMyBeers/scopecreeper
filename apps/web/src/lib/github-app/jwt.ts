/**
 * Mint a GitHub App JWT signed with the App's RSA private key.
 *
 * The key MUST be in PKCS#8 PEM format. GitHub gives you PKCS#1 by default;
 * convert once with:
 *   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
 *     -in github-app.private-key.pem -out github-app.pkcs8.pem
 *
 * Then `wrangler pages secret put GH_APP_PRIVATE_KEY` with the PKCS8 file.
 *
 * Edge-runtime safe — uses only Web Crypto.
 */

function b64urlFromBuf(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlFromString(s: string): string {
  return b64urlFromBuf(new TextEncoder().encode(s));
}

/** Strip PEM headers + decode the base64 body into raw DER bytes. */
function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

let cachedKey: CryptoKey | null = null;
async function importKey(pem: string): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const der = pemToDer(pem);
  // ArrayBuffer-of-DER for importKey's PKCS8 format.
  const ab = new ArrayBuffer(der.byteLength);
  new Uint8Array(ab).set(der);
  cachedKey = await crypto.subtle.importKey(
    "pkcs8",
    ab,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return cachedKey;
}

export async function mintAppJwt(args: {
  appId: string;
  privateKeyPem: string;
}): Promise<string> {
  if (!args.appId) throw new Error("GH_APP_ID missing");
  if (!args.privateKeyPem) throw new Error("GH_APP_PRIVATE_KEY missing");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iat: now - 30, // slight backdating to absorb clock skew
    exp: now + 540, // GH allows max 10 min
    iss: args.appId,
  };

  const headerB64 = b64urlFromString(JSON.stringify(header));
  const payloadB64 = b64urlFromString(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await importKey(args.privateKeyPem);
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${b64urlFromBuf(sig)}`;
}
