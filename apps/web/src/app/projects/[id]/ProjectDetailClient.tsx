"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type {
  ClaimedFeature,
  DriftEntry,
  Project,
  ProjectAnalysis,
  ProjectChatlogInput,
  ProjectDocInput,
  ProjectInput,
  ProjectRepoInput,
  ShippedSurface,
} from "@/core";
import { extractFile } from "@/lib/pdf-extract";

const STATUS_COLOR: Record<DriftEntry["status"], string> = {
  matched: "#39ff14",
  "claimed-only": "#ff007f",
  "shipped-only": "#ffb000",
};
const STATUS_LABEL: Record<DriftEntry["status"], string> = {
  matched: "MATCHED",
  "claimed-only": "CREEP",
  "shipped-only": "SILENT",
};

type Tab = "repo" | "chatlog" | "doc";

export default function ProjectDetailClient({
  initialProject,
}: {
  initialProject: Project;
}) {
  const [project, setProject] = useState<Project>(initialProject);
  const [addTab, setAddTab] = useState<Tab>("repo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/projects/${project.id}`, {
      credentials: "include",
    });
    if (res.ok) {
      const j = (await res.json()) as { project: Project };
      setProject(j.project);
    }
  }, [project.id]);

  async function addInput(body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/inputs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `add failed (${res.status})`);
        return;
      }
      const j = (await res.json()) as { project: Project };
      setProject(j.project);
    } finally {
      setBusy(false);
    }
  }

  async function removeInput(inputId: string) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/projects/${project.id}/inputs?inputId=${encodeURIComponent(inputId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        const j = (await res.json()) as { project: Project };
        setProject(j.project);
      }
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/analyze`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `analysis failed (${res.status})`);
        return;
      }
      const j = (await res.json()) as { project: Project };
      setProject(j.project);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-black text-[#e8ffe8] px-4 py-8"
      style={{
        fontFamily: "var(--font-vt323), monospace",
        background:
          "radial-gradient(ellipse at top, #0a0612 0%, #050308 60%, #000 100%)",
      }}
    >
      <article className="max-w-6xl mx-auto flex flex-col gap-5">
        <header className="flex items-center justify-between flex-wrap gap-3 border-b border-[#39ff14]/30 pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/projects"
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{
                fontFamily: "var(--font-press-start-2p), monospace",
                color: "#39ff14",
                textShadow: "0 0 6px #39ff14",
              }}
            >
              ◂ PROJECTS
            </Link>
            <span className="opacity-50">/</span>
            <h1
              className="leading-none"
              style={{
                fontFamily: "var(--font-press-start-2p), monospace",
                fontSize: "clamp(16px, 2.6vw, 24px)",
                color: "#ff007f",
                textShadow: "0 0 8px #ff007f",
              }}
            >
              {project.name}
            </h1>
          </div>
          <button
            onClick={() => void refresh()}
            disabled={busy}
            className="text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100"
            style={{ color: "#39ff14" }}
          >
            refresh
          </button>
        </header>

        {/* Inputs section */}
        <section className="flex flex-col gap-3">
          <h2
            className="uppercase tracking-widest"
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 11,
              color: "#39ff14",
              textShadow: "0 0 6px #39ff14",
            }}
          >
            ▸ INPUTS ({project.inputs.length}/30)
          </h2>

          {project.inputs.length === 0 ? (
            <p className="opacity-70 text-sm">
              No inputs yet. Add a repo, a chatlog with your AI agent, or a
              spec/PRD doc below.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {project.inputs.map((i) => (
                <InputRow key={i.id} input={i} onRemove={() => removeInput(i.id)} />
              ))}
            </ul>
          )}

          {/* Add new input tabs */}
          <div className="border" style={{ borderColor: "rgba(57,255,20,0.3)" }}>
            <div className="flex border-b" style={{ borderColor: "rgba(57,255,20,0.2)" }}>
              {(["repo", "chatlog", "doc"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setAddTab(t)}
                  className="px-3 py-2 uppercase tracking-widest text-xs flex-1"
                  style={{
                    color: addTab === t ? "#39ff14" : "#5a8c5a",
                    background: addTab === t ? "rgba(57,255,20,0.08)" : "transparent",
                    borderRight: "1px solid rgba(57,255,20,0.15)",
                    textShadow: addTab === t ? "0 0 4px #39ff14" : "none",
                  }}
                >
                  ▸ {t}
                </button>
              ))}
            </div>
            <div className="p-3">
              {addTab === "repo" && (
                <AddRepoForm busy={busy} onAdd={(repo) => addInput({ kind: "repo", repo })} />
              )}
              {addTab === "chatlog" && (
                <AddChatlogForm
                  busy={busy}
                  onAdd={(title, text) => addInput({ kind: "chatlog", title, text })}
                />
              )}
              {addTab === "doc" && (
                <AddDocForm
                  busy={busy}
                  onAdd={(title, text, mime) => addInput({ kind: "doc", title, text, mime })}
                />
              )}
            </div>
          </div>

          {error && (
            <div
              className="px-3 py-2 border text-sm"
              style={{
                borderColor: "#ff007f",
                color: "#ff007f",
                background: "rgba(255,0,127,0.06)",
              }}
            >
              ! {error}
            </div>
          )}
        </section>

        {/* Analyze CTA */}
        <section className="flex items-center justify-between flex-wrap gap-3 border-t border-[#39ff14]/20 pt-3">
          <div className="text-sm opacity-80">
            {project.analysis
              ? `analyzed ${new Date(project.analysis.computedAt).toLocaleString()}`
              : "no analysis yet — add inputs and run."}
          </div>
          <button
            onClick={() => void analyze()}
            disabled={busy || project.inputs.length === 0}
            className="px-4 py-2 border uppercase tracking-widest disabled:opacity-40"
            style={{
              borderColor: "#ff007f",
              color: "#ff007f",
              background: "rgba(0,0,0,0.7)",
              fontSize: 13,
              textShadow: "0 0 6px #ff007f",
            }}
          >
            {busy ? "ANALYZING…" : project.analysis ? "▸ RE-ANALYZE" : "▸ RUN ANALYSIS"}
          </button>
        </section>

        {project.analysis && <AnalysisView analysis={project.analysis} project={project} />}
      </article>
    </main>
  );
}

function InputRow({
  input,
  onRemove,
}: {
  input: ProjectInput;
  onRemove: () => void;
}) {
  const color =
    input.kind === "repo" ? "#5cb8ff" : input.kind === "chatlog" ? "#ffb000" : "#39ff14";
  let summary = "";
  if (input.kind === "repo") {
    const r = input as ProjectRepoInput;
    summary = r.repo + (r.meta.description ? ` — ${r.meta.description.slice(0, 80)}` : "");
  } else if (input.kind === "chatlog") {
    const c = input as ProjectChatlogInput;
    summary = `${c.title} · ${c.turns} turns · ${c.wordCount} words`;
  } else {
    const d = input as ProjectDocInput;
    summary = `${d.title} · ${d.mime} · ${d.bytes} bytes`;
  }
  return (
    <li
      className="flex items-center gap-2 border px-2 py-1.5 flex-wrap"
      style={{ borderColor: `${color}40`, background: `${color}06` }}
    >
      <span
        className="text-[10px] uppercase tracking-widest w-16"
        style={{ color, fontFamily: "var(--font-press-start-2p), monospace", fontSize: 9 }}
      >
        {input.kind}
      </span>
      <span className="flex-1 min-w-[160px] truncate text-sm" style={{ color: "#dddddd" }}>
        {summary}
      </span>
      <button
        onClick={onRemove}
        className="text-[10px] opacity-50 hover:opacity-90 uppercase tracking-widest"
        style={{ color }}
      >
        remove
      </button>
    </li>
  );
}

function AddRepoForm({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (repo: string) => void;
}) {
  const [repo, setRepo] = useState("");
  return (
    <div className="flex gap-2 flex-wrap">
      <input
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        placeholder="owner/name (e.g. vercel/next.js)"
        spellCheck={false}
        className="flex-1 min-w-[200px] bg-transparent border px-2 py-1.5 outline-none"
        style={{
          borderColor: "rgba(92,184,255,0.4)",
          color: "#5cb8ff",
          fontFamily: "var(--font-vt323), monospace",
          fontSize: 16,
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && repo.trim()) {
            onAdd(repo.trim());
            setRepo("");
          }
        }}
      />
      <button
        onClick={() => {
          if (repo.trim()) {
            onAdd(repo.trim());
            setRepo("");
          }
        }}
        disabled={busy || !repo.trim()}
        className="px-3 py-1.5 border uppercase tracking-widest disabled:opacity-40"
        style={{
          borderColor: "#5cb8ff",
          color: "#5cb8ff",
          background: "rgba(0,0,0,0.5)",
          fontSize: 12,
        }}
      >
        + REPO
      </button>
    </div>
  );
}

function AddChatlogForm({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (title: string, text: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="title (e.g. 'GPT plan for the launch')"
        spellCheck={false}
        className="bg-transparent border px-2 py-1.5 outline-none"
        style={{
          borderColor: "rgba(255,176,0,0.4)",
          color: "#ffb000",
          fontFamily: "var(--font-vt323), monospace",
          fontSize: 16,
        }}
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="paste a chatlog — ChatGPT / Claude / anything with User: / Assistant: turns…"
        spellCheck={false}
        rows={6}
        className="bg-transparent border px-2 py-1.5 outline-none resize-y"
        style={{
          borderColor: "rgba(255,176,0,0.4)",
          color: "#ffb000",
          fontFamily: "var(--font-vt323), monospace",
          fontSize: 14,
          minHeight: 120,
        }}
      />
      <button
        onClick={() => {
          if (title.trim() && text.trim()) {
            onAdd(title.trim(), text);
            setTitle("");
            setText("");
          }
        }}
        disabled={busy || !title.trim() || !text.trim()}
        className="self-start px-3 py-1.5 border uppercase tracking-widest disabled:opacity-40"
        style={{
          borderColor: "#ffb000",
          color: "#ffb000",
          background: "rgba(0,0,0,0.5)",
          fontSize: 12,
        }}
      >
        + CHATLOG
      </button>
    </div>
  );
}

function AddDocForm({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (title: string, text: string, mime: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [mime, setMime] = useState("text/markdown");
  const [extracting, setExtracting] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const { text: extracted, mime: detected } = await extractFile(file);
      setText(extracted.slice(0, 80 * 1024));
      setMime(detected);
      if (!title) setTitle(file.name);
    } catch (err) {
      alert(`extraction failed: ${(err as Error).message}`);
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="title (e.g. 'PRD v0.3' or 'roadmap.md')"
        spellCheck={false}
        className="bg-transparent border px-2 py-1.5 outline-none"
        style={{
          borderColor: "rgba(57,255,20,0.4)",
          color: "#39ff14",
          fontFamily: "var(--font-vt323), monospace",
          fontSize: 16,
        }}
      />
      <label
        className="border px-3 py-2 cursor-pointer flex items-center justify-between text-sm"
        style={{ borderColor: "rgba(57,255,20,0.4)", color: "#39ff14", background: "rgba(0,0,0,0.3)" }}
      >
        <span>{extracting ? "extracting…" : "▸ UPLOAD .md / .txt / .pdf"}</span>
        <input
          type="file"
          accept=".md,.txt,.pdf,text/markdown,text/plain,application/pdf"
          onChange={handleFile}
          className="hidden"
        />
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="...or paste doc body here directly"
        spellCheck={false}
        rows={6}
        className="bg-transparent border px-2 py-1.5 outline-none resize-y"
        style={{
          borderColor: "rgba(57,255,20,0.4)",
          color: "#39ff14",
          fontFamily: "var(--font-vt323), monospace",
          fontSize: 14,
          minHeight: 120,
        }}
      />
      <button
        onClick={() => {
          if (title.trim() && text.trim()) {
            onAdd(title.trim(), text, mime);
            setTitle("");
            setText("");
            setMime("text/markdown");
          }
        }}
        disabled={busy || !title.trim() || !text.trim()}
        className="self-start px-3 py-1.5 border uppercase tracking-widest disabled:opacity-40"
        style={{
          borderColor: "#39ff14",
          color: "#39ff14",
          background: "rgba(0,0,0,0.5)",
          fontSize: 12,
        }}
      >
        + DOC
      </button>
    </div>
  );
}

function AnalysisView({
  analysis,
  project,
}: {
  analysis: ProjectAnalysis;
  project: Project;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-[#39ff14]/30 pt-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2
          className="uppercase tracking-widest"
          style={{
            fontFamily: "var(--font-press-start-2p), monospace",
            fontSize: 12,
            color: "#39ff14",
            textShadow: "0 0 6px #39ff14",
          }}
        >
          ▸ THEORY vs ACTUAL
        </h2>
        <span className="text-sm opacity-70">
          {analysis.matchedPct}% MATCHED · {analysis.claimed.length} CLAIMS · {analysis.shipped.length} SHIPPED · {analysis.delta.length} DELTA ENTRIES
        </span>
      </div>
      <p
        className="text-sm leading-snug"
        style={{
          color: "#ff007f",
          textShadow: "0 0 6px #ff007f",
          fontSize: 16,
          letterSpacing: "0.05em",
        }}
      >
        ▸ {analysis.prognosis}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ClaimedColumn claimed={analysis.claimed} project={project} />
        <ShippedColumn shipped={analysis.shipped} />
        <DeltaColumn delta={analysis.delta} />
      </div>

      {analysis.creepier.length > 0 && (
        <CreepierPanel creepier={analysis.creepier} />
      )}
    </section>
  );
}

function ClaimedColumn({
  claimed,
  project,
}: {
  claimed: ClaimedFeature[];
  project: Project;
}) {
  const titleOf = (id: string) => {
    const input = project.inputs.find((i) => i.id === id);
    if (!input) return id.slice(0, 8);
    return "title" in input ? input.title : input.id.slice(0, 8);
  };
  return (
    <div
      className="border p-3 flex flex-col gap-2"
      style={{ borderColor: "#ff007f", background: "rgba(255,0,127,0.04)" }}
    >
      <h3
        className="uppercase tracking-widest"
        style={{
          fontFamily: "var(--font-press-start-2p), monospace",
          fontSize: 10,
          color: "#ff007f",
          textShadow: "0 0 4px #ff007f",
        }}
      >
        CLAIMED · {claimed.length}
      </h3>
      {claimed.length === 0 ? (
        <p className="text-xs opacity-60">no claims extracted</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {claimed.map((c) => (
            <li key={c.id} className="flex flex-col gap-0.5">
              <span className="text-sm font-bold" style={{ color: "#ff007f" }}>
                {c.title}
              </span>
              {c.description && (
                <span className="text-xs opacity-80 leading-snug">{c.description}</span>
              )}
              <span className="text-[10px] opacity-50 uppercase tracking-widest">
                from {c.source.kind} :: {titleOf(c.source.inputId)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ShippedColumn({ shipped }: { shipped: ShippedSurface[] }) {
  return (
    <div
      className="border p-3 flex flex-col gap-2"
      style={{ borderColor: "#39ff14", background: "rgba(57,255,20,0.04)" }}
    >
      <h3
        className="uppercase tracking-widest"
        style={{
          fontFamily: "var(--font-press-start-2p), monospace",
          fontSize: 10,
          color: "#39ff14",
          textShadow: "0 0 4px #39ff14",
        }}
      >
        SHIPPED · {shipped.length}
      </h3>
      {shipped.length === 0 ? (
        <p className="text-xs opacity-60">no shipped surfaces detected</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shipped.map((s) => (
            <li key={s.id} className="flex flex-col gap-0.5">
              <span className="text-sm font-bold" style={{ color: "#39ff14" }}>
                {s.title}
              </span>
              <span className="text-[10px] opacity-60 uppercase tracking-widest">
                {s.kind} · {s.evidence.file}
                {s.evidence.line ? `:${s.evidence.line}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DeltaColumn({ delta }: { delta: DriftEntry[] }) {
  return (
    <div
      className="border p-3 flex flex-col gap-2"
      style={{ borderColor: "#ffb000", background: "rgba(255,176,0,0.04)" }}
    >
      <h3
        className="uppercase tracking-widest"
        style={{
          fontFamily: "var(--font-press-start-2p), monospace",
          fontSize: 10,
          color: "#ffb000",
          textShadow: "0 0 4px #ffb000",
        }}
      >
        DELTA · {delta.length}
      </h3>
      {delta.length === 0 ? (
        <p className="text-xs opacity-60">no drift entries</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {delta.map((d) => {
            const color = STATUS_COLOR[d.status];
            return (
              <li key={d.id} className="flex flex-col gap-0.5">
                <span
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color, fontFamily: "var(--font-press-start-2p), monospace", fontSize: 8 }}
                >
                  ◆ {STATUS_LABEL[d.status]}
                </span>
                <span className="text-sm font-bold" style={{ color }}>
                  {d.claim?.title ?? d.shipped?.title ?? "—"}
                </span>
                {d.rationale && (
                  <span className="text-xs opacity-80 leading-snug">{d.rationale}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CreepierPanel({ creepier }: { creepier: Project["analysis"] extends infer A ? (A extends ProjectAnalysis ? A["creepier"] : never) : never }) {
  return (
    <div
      className="border p-4 mt-2 flex flex-col gap-3"
      style={{ borderColor: "#ff007f", background: "rgba(255,0,127,0.06)" }}
    >
      <h3
        className="uppercase tracking-widest"
        style={{
          fontFamily: "var(--font-press-start-2p), monospace",
          fontSize: 11,
          color: "#ff007f",
          textShadow: "0 0 6px #ff007f",
        }}
      >
        ▸ HOW IT COULD GET CREEPIER
      </h3>
      <p className="text-sm opacity-80 leading-snug">
        Project directions you could still wander into. Higher creep = more delusional.
      </p>
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {creepier.map((c) => (
          <li
            key={c.id}
            className="border p-2 flex flex-col gap-1"
            style={{ borderColor: "rgba(255,0,127,0.4)", background: "rgba(0,0,0,0.5)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="uppercase tracking-widest"
                style={{
                  fontFamily: "var(--font-press-start-2p), monospace",
                  fontSize: 9,
                  color: "#ff007f",
                }}
              >
                {c.label}
              </span>
              <span
                className="text-[10px]"
                style={{
                  color: c.creep && c.creep > 70 ? "#ff007f" : "#ffb000",
                  fontFamily: "var(--font-press-start-2p), monospace",
                }}
              >
                CR·{c.creep ?? "—"}
              </span>
            </div>
            <p className="text-xs opacity-90 leading-snug">{c.blurb}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
