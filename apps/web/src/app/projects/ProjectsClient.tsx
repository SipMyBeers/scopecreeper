"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";

interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  inputCount: number;
  hasAnalysis: boolean;
}

function shortAgo(ts: number): string {
  const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export default function ProjectsClient() {
  const { session } = useSession();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [proRequired, setProRequired] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (res.status === 402) {
        setProRequired(true);
        setProjects([]);
        return;
      }
      if (!res.ok) {
        setError(`Couldn't load projects (${res.status}).`);
        setProjects([]);
        return;
      }
      const json = (await res.json()) as { projects: ProjectSummary[] };
      setProjects(json.projects);
    } catch {
      setError("Network error.");
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function create() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.status === 402) {
        setProRequired(true);
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `create failed (${res.status})`);
        return;
      }
      setNewName("");
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete project "${name}"?`)) return;
    const res = await fetch(`/api/projects/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) await refresh();
  }

  if (proRequired) {
    return (
      <div
        className="border p-5 flex flex-col gap-2"
        style={{
          borderColor: "#ffb000",
          background: "rgba(255,176,0,0.06)",
          color: "#ffb000",
        }}
      >
        <h2
          className="uppercase tracking-widest"
          style={{ fontFamily: "var(--font-press-start-2p), monospace", fontSize: 12 }}
        >
          ▸ PRO REQUIRED
        </h2>
        <p className="opacity-90 text-base leading-snug">
          Projects bundle a repo + chatlogs + docs into a single workspace and
          run a theory-vs-actual diff. Pro is $9/mo — unlimited projects, 5
          deep-audits/mo, all leaf artifacts, share links.
        </p>
        <a
          href="/?upgrade=projects"
          className="mt-1 px-3 py-2 border uppercase tracking-widest text-sm self-start"
          style={{
            borderColor: "#ffb000",
            color: "#ffb000",
            background: "rgba(0,0,0,0.6)",
            textShadow: "0 0 4px #ffb000",
          }}
        >
          ▸ UPGRADE TO PRO
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Create */}
      <div
        className="border p-3 flex gap-2 flex-wrap"
        style={{ borderColor: "rgba(57,255,20,0.4)", background: "rgba(0,0,0,0.5)" }}
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="new project name..."
          spellCheck={false}
          className="flex-1 min-w-[180px] bg-transparent border-none outline-none"
          style={{
            color: "#39ff14",
            fontFamily: "var(--font-vt323), monospace",
            fontSize: 16,
            textShadow: "0 0 4px #39ff14",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void create();
          }}
        />
        <button
          onClick={create}
          disabled={!newName.trim() || creating}
          className="px-3 py-1.5 border uppercase tracking-widest disabled:opacity-40"
          style={{
            borderColor: "#39ff14",
            color: "#39ff14",
            background: "rgba(0,0,0,0.5)",
            fontSize: 12,
            textShadow: "0 0 4px #39ff14",
          }}
        >
          {creating ? "CREATING…" : "+ NEW"}
        </button>
      </div>

      {error && (
        <div
          className="px-3 py-2 border text-sm"
          style={{ borderColor: "#ff007f", color: "#ff007f", background: "rgba(255,0,127,0.06)" }}
        >
          ! {error}
        </div>
      )}

      {/* List */}
      {projects === null ? (
        <div className="opacity-60 text-sm">loading projects…</div>
      ) : projects.length === 0 ? (
        <div
          className="border p-6 text-center opacity-80"
          style={{ borderColor: "rgba(57,255,20,0.25)", background: "rgba(0,0,0,0.45)" }}
        >
          No projects yet. Name one above and hit + NEW.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((p) => (
            <li
              key={p.id}
              className="border px-3 py-2 flex items-center justify-between gap-2 flex-wrap"
              style={{
                borderColor: "rgba(57,255,20,0.35)",
                background: "rgba(57,255,20,0.03)",
              }}
            >
              <Link
                href={`/projects/${p.id}`}
                className="flex-1 min-w-[160px] truncate"
                style={{
                  color: "#39ff14",
                  fontSize: 18,
                  textShadow: "0 0 4px #39ff14",
                }}
              >
                {p.name}
              </Link>
              <span className="text-[11px] opacity-60 uppercase tracking-widest">
                {p.inputCount} inputs · {p.hasAnalysis ? "analyzed" : "raw"} · {shortAgo(p.updatedAt)} ago
              </span>
              <button
                onClick={() => remove(p.id, p.name)}
                className="text-[11px] opacity-50 hover:opacity-90 uppercase tracking-widest"
                style={{
                  color: "#ff007f",
                  fontFamily: "var(--font-vt323), monospace",
                }}
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Tiny status footer */}
      {session?.isPro && (
        <div className="text-[10px] opacity-50 uppercase tracking-widest pt-2 border-t border-[#39ff14]/10">
          ▸ PRO ACTIVE · {projects?.length ?? 0} projects
        </div>
      )}
    </div>
  );
}
