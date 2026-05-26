"use client";

import { useState } from "react";
import type { CreepArtifact } from "@/core";
import GitHubExportModal from "./GitHubExportModal";

const KIND_COLOR: Record<CreepArtifact["kind"], string> = {
  SHIPPABLE: "#39ff14",
  KILL: "#ff007f",
  ISSUE: "#5cb8ff",
  BADGE: "#ffb000",
};

const KIND_LABEL: Record<CreepArtifact["kind"], string> = {
  SHIPPABLE: "SHIPPABLE V0",
  KILL: "KILL ORDER",
  ISSUE: "GITHUB ISSUE",
  BADGE: "README BADGE",
};

function downloadFile(name: string, body: string, mime: string) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function extForMime(mime: string): string {
  if (mime.startsWith("image/svg")) return "svg";
  if (mime === "text/markdown") return "md";
  return "txt";
}

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "artifact";
}

/** Render LLM-emitted SVG as a sandboxed <img> data-URL so any embedded
 *  script tags or javascript: URLs cannot execute. */
function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function ArtifactPanel({
  artifact,
  onShare,
}: {
  artifact: CreepArtifact;
  onShare?: () => void;
}) {
  const color = KIND_COLOR[artifact.kind];
  const [copied, setCopied] = useState(false);
  const [ghOpen, setGhOpen] = useState(false);

  async function copy() {
    const text =
      artifact.kind === "BADGE" && artifact.embed_markdown
        ? `${artifact.embed_markdown}\n\n${artifact.body}`
        : artifact.body;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function download() {
    const ext = extForMime(artifact.mime);
    downloadFile(`${slug(artifact.title)}.${ext}`, artifact.body, artifact.mime);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="text-[9px] uppercase tracking-[0.2em]"
        style={{
          fontFamily: "var(--font-press-start-2p), monospace",
          color,
          textShadow: `0 0 4px ${color}`,
        }}
      >
        {KIND_LABEL[artifact.kind]} :: TERMINAL
      </div>
      <div
        className="leading-tight"
        style={{
          fontSize: 22,
          fontFamily: "var(--font-press-start-2p), monospace",
          color,
          textShadow: `0 0 6px ${color}`,
          letterSpacing: "0.04em",
        }}
      >
        {artifact.title}
      </div>

      {artifact.labels && artifact.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {artifact.labels.map((l) => (
            <span
              key={l}
              className="px-1.5 py-0.5 border text-[10px] uppercase tracking-widest"
              style={{ borderColor: color, color, background: "rgba(0,0,0,0.5)" }}
            >
              {l}
            </span>
          ))}
        </div>
      )}

      {/* Body: render SVG as sandboxed <img>, markdown as monospace pre. */}
      {artifact.mime.startsWith("image/svg") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={svgDataUrl(artifact.body)}
          alt={artifact.title}
          className="mt-2 border p-2 bg-black max-w-full"
          style={{ borderColor: `${color}80` }}
        />
      ) : (
        <pre
          className="mt-2 text-[12px] leading-snug whitespace-pre-wrap break-words p-3 border overflow-y-auto max-h-[60vh]"
          style={{
            fontFamily: "var(--font-vt323), monospace",
            color: "#dddddd",
            background: "rgba(0,0,0,0.7)",
            borderColor: `${color}50`,
          }}
        >
          {artifact.body}
        </pre>
      )}

      {artifact.embed_markdown && (
        <div className="mt-1">
          <div className="text-[9px] uppercase tracking-[0.2em] opacity-70 mb-1">
            EMBED
          </div>
          <pre
            className="text-[11px] p-2 border bg-black/60 break-all whitespace-pre-wrap"
            style={{
              fontFamily: "var(--font-vt323), monospace",
              color,
              borderColor: `${color}40`,
            }}
          >
            {artifact.embed_markdown}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 mt-3">
        <button
          onClick={copy}
          className="px-2 py-2 border uppercase tracking-widest text-[11px]"
          style={{
            borderColor: color,
            color,
            background: "rgba(0,0,0,0.7)",
            textShadow: `0 0 4px ${color}`,
          }}
        >
          {copied ? "COPIED" : "COPY"}
        </button>
        <button
          onClick={download}
          className="px-2 py-2 border uppercase tracking-widest text-[11px]"
          style={{
            borderColor: color,
            color,
            background: "rgba(0,0,0,0.7)",
            textShadow: `0 0 4px ${color}`,
          }}
        >
          DOWNLOAD
        </button>
        <button
          onClick={onShare}
          disabled={!onShare}
          className="px-2 py-2 border uppercase tracking-widest text-[11px] disabled:opacity-40"
          style={{
            borderColor: color,
            color,
            background: "rgba(0,0,0,0.7)",
            textShadow: `0 0 4px ${color}`,
          }}
        >
          SHARE
        </button>
        <button
          onClick={() => setGhOpen(true)}
          className="px-2 py-2 border uppercase tracking-widest text-[11px]"
          style={{
            borderColor: color,
            color,
            background: "rgba(0,0,0,0.7)",
            textShadow: `0 0 4px ${color}`,
          }}
        >
          EXPORT ▸ GH
        </button>
      </div>

      {ghOpen && (
        <GitHubExportModal artifact={artifact} onClose={() => setGhOpen(false)} />
      )}
    </div>
  );
}
