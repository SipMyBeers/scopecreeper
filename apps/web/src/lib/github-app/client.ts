/**
 * Thin GitHub REST client bound to an installation token. Just the calls
 * the slash-command flow + drift check actually need.
 */

interface GhRequest {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  accept?: string;
}

export class GhClient {
  constructor(private token: string) {}

  async request<T = unknown>(req: GhRequest): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: req.accept ?? "application/vnd.github+json",
      "User-Agent": "scopecreeper-github-app",
    };
    if (req.body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(`https://api.github.com${req.path}`, {
      method: req.method ?? "GET",
      headers,
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`GH ${req.method ?? "GET"} ${req.path} → ${res.status}: ${detail.slice(0, 240)}`);
    }
    // Some endpoints (e.g., raw file contents with the raw media type) return text.
    if (req.accept && !req.accept.includes("json")) {
      return (await res.text()) as unknown as T;
    }
    return (await res.json()) as T;
  }

  // ---- typed helpers we actually use ----

  async getPullRequest(owner: string, repo: string, number: number): Promise<{
    title: string;
    body: string | null;
    head: { sha: string; ref: string };
    base: { ref: string };
    diff_url: string;
    user: { login: string };
    html_url: string;
  }> {
    return this.request({ path: `/repos/${owner}/${repo}/pulls/${number}` });
  }

  async getDiff(owner: string, repo: string, number: number): Promise<string> {
    return this.request<string>({
      path: `/repos/${owner}/${repo}/pulls/${number}`,
      accept: "application/vnd.github.v3.diff",
    });
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string | null> {
    try {
      const search = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      return await this.request<string>({
        path: `/repos/${owner}/${repo}/contents/${path}${search}`,
        accept: "application/vnd.github.raw",
      });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("→ 404")) return null;
      throw err;
    }
  }

  async createIssueComment(owner: string, repo: string, issueNumber: number, body: string): Promise<{ html_url: string }> {
    return this.request({
      method: "POST",
      path: `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      body: { body },
    });
  }

  async createCheckRun(owner: string, repo: string, args: {
    name: string;
    head_sha: string;
    status?: "queued" | "in_progress" | "completed";
    conclusion?: "success" | "neutral" | "failure" | "skipped" | "action_required";
    output?: { title: string; summary: string };
    details_url?: string;
  }): Promise<{ id: number; html_url: string }> {
    return this.request({
      method: "POST",
      path: `/repos/${owner}/${repo}/check-runs`,
      body: args,
    });
  }
}
