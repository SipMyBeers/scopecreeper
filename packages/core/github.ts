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

/** A single public repo from a user's profile, normalized for LLM consumption. */
export interface UserRepoSummary {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  size: number;
  pushedAt: string | null;
  createdAt: string | null;
  archived: boolean;
  topics: string[];
}

/** Top-level GitHub user metadata. */
export interface GitHubUserMeta {
  login: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  publicRepos: number;
  followers: number;
  createdAt: string | null;
}

/**
 * Parse a GitHub username from:
 *   @username
 *   github.com/username        (no second path segment)
 *   https://github.com/username
 * Returns null if input looks like an owner/repo or full chatlog.
 */
export function parseUserUrl(input: string): { username: string } | null {
  const trimmed = input.trim();
  if (/^@[\w-]+$/.test(trimmed)) return { username: trimmed.slice(1) };
  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w-]+)\/?$/i
  );
  if (urlMatch) return { username: urlMatch[1] };
  return null;
}

/** Fetch a GitHub user's public profile + top 30 repos (sorted by pushed_at). */
export async function fetchUserProfile(
  username: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ user: GitHubUserMeta; repos: UserRepoSummary[] }> {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "scopecreeper-diagnostic",
  };

  const [userRes, reposRes] = await Promise.all([
    fetchImpl(`https://api.github.com/users/${username}`, { headers }),
    fetchImpl(
      `https://api.github.com/users/${username}/repos?sort=pushed&per_page=30&type=public`,
      { headers }
    ),
  ]);

  if (!userRes.ok) {
    throw new Error(
      `GitHub user not found: ${username} (${userRes.status})`
    );
  }

  const userData = (await userRes.json()) as Record<string, unknown>;
  const reposData = reposRes.ok
    ? ((await reposRes.json()) as Record<string, unknown>[])
    : [];

  const user: GitHubUserMeta = {
    login: String(userData.login ?? username),
    name: (userData.name as string | null) ?? null,
    avatarUrl: (userData.avatar_url as string | null) ?? null,
    bio: (userData.bio as string | null) ?? null,
    publicRepos: Number(userData.public_repos ?? 0),
    followers: Number(userData.followers ?? 0),
    createdAt: (userData.created_at as string | null) ?? null,
  };

  const repos: UserRepoSummary[] = reposData
    .filter((r) => !r.fork)
    .map((r) => ({
      name: String(r.name ?? ""),
      fullName: String(r.full_name ?? `${username}/${r.name}`),
      description: (r.description as string | null) ?? null,
      language: (r.language as string | null) ?? null,
      stars: Number(r.stargazers_count ?? 0),
      forks: Number(r.forks_count ?? 0),
      size: Number(r.size ?? 0),
      pushedAt: (r.pushed_at as string | null) ?? null,
      createdAt: (r.created_at as string | null) ?? null,
      archived: Boolean(r.archived ?? false),
      topics: Array.isArray(r.topics) ? (r.topics as string[]) : [],
    }));

  return { user, repos };
}
