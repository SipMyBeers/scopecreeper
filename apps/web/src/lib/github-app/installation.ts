/**
 * Exchange a GH App JWT for a per-installation access token.
 *
 * Tokens last 1 hour. We cache them in KV_QUOTAS keyed by installation id
 * with a ~55-minute TTL so subsequent webhook events skip the round trip.
 */

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

const SAFETY_MARGIN_MS = 5 * 60 * 1000;

export async function getInstallationToken(args: {
  installationId: number;
  appJwt: string;
  kv?: KV;
}): Promise<string> {
  const cacheKey = `gh_install_token:${args.installationId}`;
  if (args.kv) {
    const raw = await args.kv.get(cacheKey);
    if (raw) {
      try {
        const cached = JSON.parse(raw) as CachedToken;
        if (cached.expiresAt - SAFETY_MARGIN_MS > Date.now()) {
          return cached.token;
        }
      } catch { /* fall through */ }
    }
  }

  const res = await fetch(
    `https://api.github.com/app/installations/${args.installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.appJwt}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "scopecreeper-github-app",
      },
    }
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`installation token exchange failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as { token: string; expires_at: string };
  const expiresAt = new Date(json.expires_at).getTime();
  if (args.kv) {
    await args.kv.put(
      cacheKey,
      JSON.stringify({ token: json.token, expiresAt }),
      { expirationTtl: 60 * 55 }
    );
  }
  return json.token;
}
