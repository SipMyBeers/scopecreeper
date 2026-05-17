/**
 * Browser-safe GitHub fetch + Reality Score computation.
 * Uses the global `fetch`; no axios, no SQLite.
 */

export interface RepoStats {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  size: number;
  pushedAt: string | null;
  openIssues: number;
  language: string | null;
  createdAt: string | null;
  archived: boolean;
}

/** Parse `owner/repo` or `https://github.com/owner/repo[...]` into parts. */
export function parseRepoUrl(
  input: string
): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\.git$/, "");
  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s?#]+)/i
  );
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const shortMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
  return null;
}

/** Hit the public GitHub API and return normalized stats. */
export async function fetchRepoStats(
  input: string,
  fetchImpl: typeof fetch = fetch
): Promise<RepoStats> {
  const parsed = parseRepoUrl(input);
  if (!parsed) throw new Error(`Not a valid GitHub repo: "${input}"`);
  const { owner, repo } = parsed;
  const res = await fetchImpl(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "scopecreeper-diagnostic",
      },
    }
  );
  if (!res.ok) {
    throw new Error(
      `GitHub API returned ${res.status} for ${owner}/${repo}`
    );
  }
  const data = (await res.json()) as Record<string, unknown>;
  return {
    owner,
    repo,
    fullName: String(data.full_name ?? `${owner}/${repo}`),
    description: (data.description as string | null) ?? null,
    stars: Number(data.stargazers_count ?? 0),
    forks: Number(data.forks_count ?? 0),
    size: Number(data.size ?? 0),
    pushedAt: (data.pushed_at as string | null) ?? null,
    openIssues: Number(data.open_issues_count ?? 0),
    language: (data.language as string | null) ?? null,
    createdAt: (data.created_at as string | null) ?? null,
    archived: Boolean(data.archived ?? false),
  };
}

/**
 * Reality Score (0–100). Heuristic kept consistent with the
 * original `IngestionEngine.scanGitHub` weighting.
 *
 *   stars   → up to 20
 *   size    → up to 30
 *   forks   → up to 20
 *   recency → 10 / 30 depending on whether the repo has been pushed
 *
 * Archived repos lose 15 points (they're frozen reality).
 */
export function calculateRealityScore(stats: RepoStats): number {
  const starWeight = Math.min(20, (stats.stars / 100) * 5);
  const sizeWeight = Math.min(30, (stats.size / 1000) * 2);
  const forksWeight = Math.min(20, (stats.forks / 10) * 2);

  const pushed = stats.pushedAt ? Date.parse(stats.pushedAt) : 0;
  const ageDays = pushed ? (Date.now() - pushed) / 86_400_000 : 9_999;
  let activityWeight: number;
  if (!pushed) activityWeight = 10;
  else if (ageDays < 30) activityWeight = 30;
  else if (ageDays < 180) activityWeight = 22;
  else if (ageDays < 365) activityWeight = 15;
  else activityWeight = 8;

  const archivePenalty = stats.archived ? -15 : 0;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(starWeight + sizeWeight + forksWeight + activityWeight + archivePenalty)
    )
  );
}
