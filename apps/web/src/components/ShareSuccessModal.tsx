"use client";

import { useState } from "react";
import type { ScanThread } from "@/core";

interface Props {
  thread: ScanThread;
  shareUrl: string;
  onClose: () => void;
}

function tweetText(thread: ScanThread): string {
  const r = thread.result;
  const tier = r.tier.toUpperCase();
  const seed = thread.input.payload.replace(/\s+/g, " ").slice(0, 60);
  // 280 chars total budget. URL eats ~23. Leave room for the @-handle.
  return `My @scopecreeper score: ${r.score}/100 · ${tier}\n"${seed}"\nRoast yours →`;
}

export default function ShareSuccessModal({ thread, shareUrl, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function tweet() {
    const intent =
      "https://twitter.com/intent/tweet?text=" +
      encodeURIComponent(tweetText(thread)) +
      "&url=" +
      encodeURIComponent(shareUrl);
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(480px,94vw)] border p-4 flex flex-col gap-3"
        style={{
          borderColor: "#39ff14",
          background: "rgba(0,0,0,0.94)",
          color: "#39ff14",
          fontFamily: "var(--font-vt323), monospace",
          textShadow: "0 0 6px #39ff14",
          boxShadow: "0 0 24px rgba(57,255,20,0.35)",
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
            ▸ SHARED · LIVE
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none opacity-80 hover:opacity-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="text-sm opacity-80 leading-snug">
          Read-only public URL. Anyone with the link can view your skill-tree.
        </div>

        <div
          className="px-2 py-2 border break-all text-sm"
          style={{ borderColor: "rgba(57,255,20,0.4)", background: "rgba(0,0,0,0.5)" }}
        >
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#39ff14" }}
          >
            {shareUrl}
          </a>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={copy}
            className="px-3 py-2 border uppercase tracking-widest"
            style={{
              borderColor: "#39ff14",
              color: "#39ff14",
              background: "rgba(0,0,0,0.7)",
              fontSize: 13,
            }}
          >
            {copied ? "COPIED" : "COPY LINK"}
          </button>
          <button
            onClick={tweet}
            className="px-3 py-2 border uppercase tracking-widest"
            style={{
              borderColor: "#5cb8ff",
              color: "#5cb8ff",
              background: "rgba(0,0,0,0.7)",
              textShadow: "0 0 4px #5cb8ff",
              fontSize: 13,
            }}
          >
            ▸ POST TO X
          </button>
        </div>

        <details className="text-[11px] opacity-70">
          <summary className="cursor-pointer uppercase tracking-widest">
            preview tweet
          </summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs opacity-85">
            {tweetText(thread)} {shareUrl}
          </pre>
        </details>
      </div>
    </div>
  );
}
