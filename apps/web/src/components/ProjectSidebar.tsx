"use client";

import { useState } from "react";
import type { ScanThread, RatingTier } from "@/core";
import { deriveTitle } from "@/lib/threads";

const TIER_COLOR: Record<RatingTier, string> = {
  corpse: "#888",
  sweetspot: "#39ff14",
  abyss: "#ffb000",
  delusion: "#ff007f",
};

function shortAgo(ts: number): string {
  const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export default function ProjectSidebar({
  threads,
  currentThreadId,
  onOpen,
  onDelete,
}: {
  threads: ScanThread[];
  currentThreadId: string | null;
  onOpen: (id: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="absolute top-0 left-0 h-full z-40 flex"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="h-full transition-[width] duration-300 ease-out overflow-hidden"
        style={{
          width: open ? "min(340px, 22vw)" : "0",
          pointerEvents: open ? "auto" : "none",
          background: "rgba(0, 0, 0, 0.82)",
          borderRight: open ? "1px solid rgba(57,255,20,0.35)" : "none",
          backdropFilter: "blur(2px)",
        }}
      >
        <div className="h-full p-3 flex flex-col gap-3 font-mono text-[#39ff14]">
          <div
            className="flex items-center justify-between border-b border-[#39ff14]/30 pb-2"
            style={{ textShadow: "0 0 6px #39ff14" }}
          >
            <span
              style={{ fontFamily: "var(--font-press-start-2p)", fontSize: 10 }}
            >
              SCAN HISTORY
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-[#39ff14] hover:text-white px-2"
              aria-label="Collapse panel"
              style={{
                fontFamily: "var(--font-vt323), monospace",
                fontSize: 18,
              }}
            >
              ×
            </button>
          </div>

          {/* "New scan" returns the CRT to its idle swirl. */}
          <button
            onClick={() => onOpen(null)}
            className="text-left px-2 py-1 border border-[#39ff14]/40 hover:border-[#39ff14] uppercase tracking-widest"
            style={{
              fontFamily: "var(--font-vt323), monospace",
              fontSize: 13,
              background: "rgba(57,255,20,0.04)",
            }}
          >
            + NEW SCAN
          </button>

          <ul className="flex flex-col gap-2 overflow-y-auto">
            {threads.length === 0 && (
              <li
                className="opacity-60 px-1"
                style={{
                  fontFamily: "var(--font-vt323), monospace",
                  fontSize: 13,
                }}
              >
                No scans yet. Drop a payload to begin.
              </li>
            )}
            {threads.map((t, i) => {
              const color = TIER_COLOR[t.result.tier];
              const active = t.id === currentThreadId;
              return (
                <li
                  key={t.id}
                  className="border px-2 py-2 transition-colors"
                  style={{
                    borderColor: active
                      ? color
                      : "rgba(57,255,20,0.15)",
                    background: active
                      ? `${color}15`
                      : "rgba(57,255,20,0.03)",
                    animation: `fx-row-in 0.35s ease-out ${i * 0.04}s both`,
                  }}
                >
                  <button
                    onClick={() => onOpen(t.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="truncate"
                        style={{
                          fontFamily: "var(--font-vt323), monospace",
                          fontSize: 14,
                          color,
                          textShadow: `0 0 6px ${color}`,
                          maxWidth: "70%",
                        }}
                      >
                        {deriveTitle(t)}
                      </span>
                      <span
                        className="text-[10px] uppercase tracking-[0.2em]"
                        style={{
                          color,
                          opacity: 0.85,
                          fontFamily: "var(--font-vt323), monospace",
                          fontSize: 12,
                        }}
                      >
                        {t.result.tier}
                      </span>
                    </div>
                    <div className="mt-1.5 h-[3px] w-full bg-[#39ff14]/10 relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0"
                        style={{
                          width: `${t.result.score}%`,
                          background: color,
                          boxShadow: `0 0 6px ${color}`,
                        }}
                      />
                    </div>
                    <div
                      className="mt-1 flex items-center justify-between text-[10px] opacity-60"
                      style={{
                        color,
                        fontFamily: "var(--font-vt323), monospace",
                        fontSize: 11,
                      }}
                    >
                      <span>DELUSION {t.result.score}%</span>
                      <span>{shortAgo(t.createdAt)} ago</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${deriveTitle(t)}?`)) onDelete(t.id);
                    }}
                    className="mt-1 text-[10px] opacity-50 hover:opacity-90"
                    aria-label="Delete thread"
                    style={{
                      fontFamily: "var(--font-vt323), monospace",
                      fontSize: 11,
                      color,
                    }}
                  >
                    delete
                  </button>
                </li>
              );
            })}
          </ul>

          <div
            className="mt-auto text-[10px] opacity-50"
            style={{
              fontFamily: "var(--font-vt323), monospace",
              fontSize: 12,
            }}
          >
            $ scope-creeper --status :: {threads.length} HOSTS
          </div>
        </div>
      </div>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Expand project panel"
          className="h-full"
          style={{
            width: "24px",
            pointerEvents: "auto",
            background:
              "linear-gradient(90deg, rgba(57,255,20,0.18), rgba(0,0,0,0.0))",
            borderRight: "1px solid rgba(57,255,20,0.45)",
            cursor: "pointer",
          }}
        >
          <span
            className="block"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              color: "#39ff14",
              fontFamily: "var(--font-vt323), monospace",
              fontSize: 14,
              letterSpacing: "0.4em",
              textShadow: "0 0 6px #39ff14",
            }}
          >
            HISTORY · {threads.length}
          </span>
        </button>
      )}
    </div>
  );
}
