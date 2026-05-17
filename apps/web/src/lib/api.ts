import type { DiagnosticResult, ScanInput, ScanThread } from "@/core";

export async function scan(input: ScanInput): Promise<DiagnosticResult> {
  const res = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.status === 402) {
    throw new Error("OUT_OF_CREDITS");
  }
  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: string };
      detail = j.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `scan failed: ${res.status}`);
  }
  return (await res.json()) as DiagnosticResult;
}

export interface ExportArgs {
  thread: ScanThread;
  target: "issue" | "commit";
  repo: string;
}
export interface ExportResult {
  url: string;
}

export async function exportThread(args: ExportArgs): Promise<ExportResult> {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (res.status === 401) {
    throw new Error("not_authenticated");
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || `export failed: ${res.status}`);
  }
  return (await res.json()) as ExportResult;
}

export interface AuthMe {
  login: string;
  avatar_url?: string;
}
export async function fetchMe(): Promise<AuthMe | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return null;
  const j = (await res.json()) as { user: AuthMe | null };
  return j.user;
}

/** Kicks off the GitHub OAuth login. Sets a signed cookie on return. */
export function loginWithGitHub(returnTo: string = window.location.pathname) {
  const search = new URLSearchParams({ return_to: returnTo });
  window.location.href = `/api/auth/github?${search.toString()}`;
}
