"use client";

import { useEffect, useState } from "react";
import type { CreepArtifact } from "@/core";

interface GhUser {
  login: string;
  avatar_url: string;
}

interface GhRepo {
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}

const KIND_COLOR: Record<CreepArtifact["kind"], string> = {
  SHIPPABLE: "#39ff14",
  KILL: "#ff007f",
  ISSUE: "#5cb8ff",
  BADGE: "#ffb000",
};

/** ISSUE artifacts default to an Issue; everything else to a PR. */
function defaultMode(kind: CreepArtifact["kind"]): "issue" | "pr" {
  return kind === "ISSUE" ? "issue" : "pr";
}

export default function GitHubExportModal({
  artifact,
  onClose,
}: {
  artifact: CreepArtifact;
  onClose: () => void;
}) {
  const [user, setUser] = useState<GhUser | null | undefined>(undefined);
  const [repos, setRepos] = useState<GhRepo[]>([]);
  const [repoFilter, setRepoFilter] = useState("");
  const [pickedRepo, setPickedRepo] = useState<string | null>(null);
  const [mode, setMode] = useState<"issue" | "pr">(defaultMode(artifact.kind));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ url: string; kind: string } | null>(null);
  const color = KIND_COLOR[artifact.kind];

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const j = (await res.json()) as { user?: GhUser | null };
        setUser(j.user ?? null);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  // Once authed, fetch repos.
  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const res = await fetch("/api/github/repos", { credentials: "include" });
        if (!res.ok) {
          setError(`Couldn't load repos (${res.status}).`);
          return;
        }
        const j = (await res.json()) as { repos: GhRepo[] };
        setRepos(j.repos);
      } catch {
        setError("Network error loading repos.");
      }
    })();
  }, [user]);

  function login() {
    const returnTo = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/github?return_to=${encodeURIComponent(returnTo)}`;
  }

  async function go() {
    if (!pickedRepo) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/github/export-artifact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ artifact, repo: pickedRepo, mode }),
      });
      const j = (await res.json()) as {
        url?: string;
        kind?: string;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !j.url) {
        throw new Error(j.error || `export failed: ${res.status}`);
      }
      setDone({ url: j.url, kind: j.kind ?? mode });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(repoFilter.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(560px,94vw)] border p-4 flex flex-col gap-3"
        style={{
          background: "rgba(0,0,0,0.94)",
          borderColor: `${color}80`,
          color,
          fontFamily: "var(--font-vt323), monospace",
          textShadow: `0 0 6px ${color}`,
          boxShadow: `0 0 24px ${color}40`,
        }}
      >
        <div className="flex items-center justify-between">
          <h2
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 11,
              letterSpacing: "0.2em",
            }}
          >
            EXPORT → GITHUB
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none opacity-80 hover:opacity-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="text-[11px] opacity-70 uppercase tracking-widest">
          {artifact.kind} · {artifact.title.slice(0, 60)}
        </div>

        {/* === Auth gate === */}
        {user === undefined && (
          <div className="text-sm opacity-70">checking auth…</div>
        )}

        {user === null && (
          <div className="flex flex-col gap-2">
            <p className="text-sm opacity-85 leading-snug">
              Sign in with GitHub to commit this artifact to one of your repos.
              We only request <code>public_repo</code> scope.
            </p>
            <button
              onClick={login}
              className="px-3 py-3 border uppercase tracking-widest mt-1"
              style={{
                borderColor: color,
                color,
                background: "rgba(0,0,0,0.7)",
                fontSize: 13,
              }}
            >
              ▸ SIGN IN WITH GITHUB
            </button>
          </div>
        )}

        {user && !done && (
          <>
            <div className="flex items-center gap-2 text-[11px] opacity-70 uppercase tracking-widest">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatar_url}
                alt=""
                className="w-5 h-5 rounded-full"
                style={{ border: `1px solid ${color}80` }}
              />
              <span>signed in as {user.login}</span>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1.5">
              {(["issue", "pr"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex-1 px-2 py-1.5 border uppercase tracking-widest text-[11px]"
                  style={{
                    borderColor: mode === m ? color : `${color}40`,
                    background: mode === m ? `${color}15` : "rgba(0,0,0,0.5)",
                    color,
                  }}
                >
                  {m === "issue" ? "open issue" : "branch + PR"}
                </button>
              ))}
            </div>

            <input
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value)}
              placeholder="filter repos…"
              spellCheck={false}
              className="px-2 py-1 border outline-none bg-black"
              style={{
                borderColor: `${color}40`,
                color,
                fontFamily: "var(--font-vt323), monospace",
                fontSize: 14,
              }}
            />

            <div
              className="overflow-y-auto max-h-[40vh] border"
              style={{ borderColor: `${color}30` }}
            >
              {repos.length === 0 && !error && (
                <div className="p-3 text-sm opacity-60">loading repos…</div>
              )}
              {filteredRepos.map((r) => (
                <button
                  key={r.full_name}
                  onClick={() => setPickedRepo(r.full_name)}
                  className="w-full text-left px-2 py-1.5 flex justify-between items-center"
                  style={{
                    background:
                      pickedRepo === r.full_name ? `${color}20` : "transparent",
                    borderBottom: `1px solid ${color}10`,
                  }}
                >
                  <span className="truncate">{r.full_name}</span>
                  <span className="text-[10px] opacity-50 uppercase tracking-widest shrink-0 ml-2">
                    {r.private ? "private" : "public"} · {r.default_branch}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={go}
              disabled={!pickedRepo || busy}
              className="px-3 py-3 border uppercase tracking-widest disabled:opacity-40 mt-1"
              style={{
                borderColor: color,
                color,
                background: "rgba(0,0,0,0.7)",
                fontSize: 13,
              }}
            >
              {busy
                ? "shipping…"
                : pickedRepo
                  ? `▸ ${mode === "issue" ? "OPEN ISSUE" : "OPEN PR"} ON ${pickedRepo}`
                  : "pick a repo first"}
            </button>
          </>
        )}

        {done && (
          <div className="flex flex-col gap-2">
            <div
              className="border p-3 flex flex-col gap-1"
              style={{ borderColor: color, background: `${color}10` }}
            >
              <div
                className="text-[10px] uppercase tracking-widest opacity-90"
                style={{ fontFamily: "var(--font-press-start-2p), monospace" }}
              >
                ▸ SHIPPED · {done.kind.toUpperCase()}
              </div>
              <a
                href={done.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline break-all"
              >
                {done.url}
              </a>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-2 border uppercase tracking-widest"
              style={{ borderColor: color, color, background: "rgba(0,0,0,0.7)", fontSize: 12 }}
            >
              done
            </button>
          </div>
        )}

        {error && (
          <p
            className="text-xs"
            style={{ color: "#ff007f", textShadow: "0 0 6px #ff007f" }}
          >
            ! {error}
          </p>
        )}
      </div>
    </div>
  );
}
