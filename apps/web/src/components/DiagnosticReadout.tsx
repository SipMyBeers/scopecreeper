"use client";

import { useEffect, useState } from "react";
import type {
  CreepDimension,
  CreepNode,
  RatingTier,
} from "@/core";

const TIER_COLOR: Record<RatingTier, string> = {
  corpse: "#888",
  sweetspot: "#39ff14",
  abyss: "#ffb000",
  delusion: "#ff007f",
};

/**
 * Renders one node of the creep tree inside the arcade's CRT screen.
 * Animated score ticker, typewriter verdict, mutations, and a list
 * of dimension buttons the user can drill into for sub-creeps.
 */
export default function DiagnosticReadout({
  node,
  path,
  loading,
  outOfCredits,
  error,
  onDrillInto,
  onBack,
  onReset,
  onExport,
  onBuy,
}: {
  node: CreepNode;
  path: CreepNode[];
  loading: boolean;
  outOfCredits: boolean;
  error: string | null;
  onDrillInto: (dim: CreepDimension) => void;
  onBack: () => void;
  onReset: () => void;
  onExport?: () => void;
  onBuy: () => void;
}) {
  const result = node.result;
  const color = TIER_COLOR[result.tier];
  const dimensions = result.dimensions ?? [];

  // Score ticker.
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    setDisplayScore(0);
    const start = performance.now();
    const dur = 1100;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayScore(Math.round(result.score * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [result.score, node.id]);

  // Typewriter verdict.
  const verdict = result.verdict ?? "";
  const [typedVerdict, setTypedVerdict] = useState("");
  useEffect(() => {
    setTypedVerdict("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTypedVerdict(verdict.slice(0, i));
      if (i >= verdict.length) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [verdict, node.id]);

  const isRoot = node.parentId === null;
  const breadcrumb = path
    .map((n) => (n.dimension ? n.dimension.label : "ROOT"))
    .join(" › ");

  return (
    <div
      className="absolute inset-0 flex flex-col p-1 overflow-hidden"
      style={{
        background: "rgba(0,0,0,0.92)",
        color,
        textShadow: `0 0 4px ${color}`,
        fontFamily: "var(--font-vt323), monospace",
        animation: "fx-readout-in 0.3s ease-out",
      }}
    >
      {/* Breadcrumb */}
      <div
        className="text-[7px] uppercase tracking-[0.25em] opacity-70 text-center truncate"
        style={{ fontFamily: "var(--font-press-start-2p), monospace" }}
      >
        {breadcrumb}
      </div>

      {/* Score */}
      <div className="text-center">
        <div
          className="leading-none"
          style={{
            fontSize: "clamp(20px, 4vw, 56px)",
            fontFamily: "var(--font-press-start-2p), monospace",
            fontWeight: 700,
          }}
        >
          {String(displayScore).padStart(3, "0")}
        </div>
        <div
          className="mt-0.5 text-[8px] uppercase tracking-[0.3em] opacity-85"
          style={{ fontFamily: "var(--font-press-start-2p), monospace" }}
        >
          {result.tier}
        </div>
      </div>

      {/* Verdict */}
      <div
        className="mt-1 px-1 text-center uppercase"
        style={{ fontSize: "clamp(8px, 0.95vw, 13px)" }}
      >
        {typedVerdict}
        <span className="opacity-60 animate-pulse">_</span>
      </div>

      {/* Dimensions (choose-your-own-adventure) */}
      {dimensions.length > 0 && (
        <div
          className="mt-1 flex-1 overflow-y-auto"
          style={{ fontSize: "clamp(7px, 0.78vw, 11px)" }}
        >
          <div className="opacity-60 mb-1 uppercase tracking-widest text-[8px]">
            scale a dimension:
          </div>
          <ul className="flex flex-col gap-1">
            {dimensions.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => onDrillInto(d)}
                  disabled={loading || outOfCredits}
                  className="w-full text-left px-1 py-0.5 border border-current/30 hover:border-current/80 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "rgba(0,0,0,0.5)" }}
                >
                  <span className="opacity-90">▸ {d.label}</span>
                  {d.blurb && (
                    <span className="opacity-60"> · {d.blurb}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mutations */}
      {result.mutations && result.mutations.length > 0 && (
        <div
          className="mt-1 text-left opacity-75"
          style={{ fontSize: "clamp(7px, 0.78vw, 11px)", lineHeight: 1.2 }}
        >
          {result.mutations.slice(0, 1).map((m, i) => (
            <div key={i} className="pl-2 relative">
              <span className="absolute left-0 top-0">!</span>
              {m}
            </div>
          ))}
        </div>
      )}

      {/* Status row */}
      {loading && (
        <div
          className="mt-1 text-center text-[8px] uppercase tracking-widest"
          style={{ color }}
        >
          CREEPING<span className="animate-pulse">…</span>
        </div>
      )}
      {error && error !== "OUT_OF_CREDITS" && (
        <div
          className="mt-1 text-center text-[8px] uppercase tracking-widest"
          style={{ color: "#ff007f" }}
        >
          ! {error}
        </div>
      )}
      {outOfCredits && (
        <div
          className="mt-1 text-center text-[8px] uppercase tracking-widest"
          style={{ color: "#ff007f", textShadow: "0 0 6px #ff007f" }}
        >
          OUT OF CREDITS
        </div>
      )}

      {/* Actions */}
      <div
        className="mt-1 flex gap-1 flex-wrap justify-center"
        style={{ fontSize: "clamp(7px, 0.75vw, 10px)" }}
      >
        {!isRoot && (
          <button
            onClick={onBack}
            className="px-1.5 py-0.5 border border-current/40 hover:border-current uppercase tracking-widest"
            style={{ background: "rgba(0,0,0,0.6)" }}
          >
            ◂ BACK
          </button>
        )}
        <button
          onClick={onReset}
          className="px-1.5 py-0.5 border border-current/40 hover:border-current uppercase tracking-widest"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          NEW SCAN
        </button>
        {outOfCredits ? (
          <button
            onClick={onBuy}
            className="px-1.5 py-0.5 border uppercase tracking-widest"
            style={{
              borderColor: "#ff007f",
              color: "#ff007f",
              textShadow: "0 0 6px #ff007f",
              background: "rgba(0,0,0,0.6)",
            }}
          >
            BUY CREDITS
          </button>
        ) : (
          onExport && (
            <button
              onClick={onExport}
              className="px-1.5 py-0.5 border border-current/40 hover:border-current uppercase tracking-widest"
              style={{ background: "rgba(0,0,0,0.6)" }}
            >
              EXPORT
            </button>
          )
        )}
      </div>
    </div>
  );
}
