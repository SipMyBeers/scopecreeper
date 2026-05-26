/**
 * Hall-of-shame board: top-N most-delusional public repos audited via /api/audit.
 *
 * KV layout:
 *   entry:<repo>          → JSON LeaderboardEntry (one per repo, latest result wins)
 *   index:by-score        → JSON [LeaderboardEntry[]] — denormalized sorted list,
 *                            kept under ~50 entries for cheap reads.
 *
 * The denormalized index is rebuilt on every write. KV reads are cheap; writes
 * are rate-limited by the audit flow (Pro-gated) so contention is fine.
 */

export interface LeaderboardEntry {
  repo: string;
  delusionScore: number;
  findingCount: number;
  filesScanned: number;
  scannedAt: number;
  truncated: boolean;
}

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  list?: (opts: { prefix: string; limit?: number }) => Promise<{ keys: { name: string }[] }>;
  delete?: (key: string) => Promise<void>;
}

const INDEX_KEY = "index:by-score";
const INDEX_SIZE = 50;
const TTL_SECONDS = 60 * 60 * 24 * 365;

export async function recordAudit(kv: KV, entry: LeaderboardEntry): Promise<void> {
  await kv.put(`entry:${entry.repo}`, JSON.stringify(entry), { expirationTtl: TTL_SECONDS });
  await rebuildIndex(kv);
}

async function rebuildIndex(kv: KV): Promise<void> {
  if (!kv.list) return;
  // Pull at most a few hundred entries — board is curated/small.
  const { keys } = await kv.list({ prefix: "entry:", limit: 256 });
  const entries: LeaderboardEntry[] = [];
  for (const k of keys) {
    const raw = await kv.get(k.name);
    if (!raw) continue;
    try {
      entries.push(JSON.parse(raw) as LeaderboardEntry);
    } catch {
      /* skip corrupt entry */
    }
  }
  entries.sort((a, b) => b.delusionScore - a.delusionScore);
  await kv.put(INDEX_KEY, JSON.stringify(entries.slice(0, INDEX_SIZE)), {
    expirationTtl: TTL_SECONDS,
  });
}

export async function getLeaderboard(kv: KV): Promise<LeaderboardEntry[]> {
  const raw = await kv.get(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}
