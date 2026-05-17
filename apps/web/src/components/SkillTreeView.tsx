"use client";

import { useEffect, useMemo } from "react";
import type {
  CreepDimension,
  CreepNode,
  RatingTier,
  ScanThread,
} from "@/core";
import { layoutCreepTree, type LaidOutNode } from "@/lib/treeLayout";

const TIER_COLOR: Record<RatingTier, string> = {
  corpse: "#888888",
  sweetspot: "#39ff14",
  abyss: "#ffb000",
  delusion: "#ff007f",
};

/** Hex node radius (point-to-point/2). 36 px = ~62 px tip-to-tip. */
const HEX_R = 36;

/** SVG path for a flat-top hexagon centered at (0,0). */
function hexPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

export default function SkillTreeView({
  thread,
  focusedId,
  onClose,
  onDrill,
  onFocus,
  loading,
  outOfCredits,
  error,
  credits,
  onBuyCredits,
}: {
  thread: ScanThread;
  focusedId: string | null;
  onClose: () => void;
  onDrill: (parentNode: CreepNode, dim: CreepDimension) => void;
  onFocus: (nodeId: string) => void;
  loading: boolean;
  outOfCredits: boolean;
  error: string | null;
  credits: number | null;
  onBuyCredits: () => void;
}) {
  const layout = useMemo(() => layoutCreepTree(thread, 0, 0), [thread]);

  // ESC to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Compute viewBox with padding.
  const PAD = HEX_R * 3;
  const minX = Math.min(0, layout.bounds.minX) - PAD;
  const minY = Math.min(0, layout.bounds.minY) - PAD;
  const w = Math.max(640, layout.bounds.maxX - minX + PAD);
  const h = Math.max(480, layout.bounds.maxY - minY + PAD);

  // Find focused for the side panel.
  const focusedFilled = layout.nodes.find(
    (n) => n.kind === "filled" && n.id === focusedId
  ) as Extract<LaidOutNode, { kind: "filled" }> | undefined;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black select-none"
      style={{
        background:
          "radial-gradient(ellipse at center, #0a0612 0%, #050308 60%, #000 100%)",
      }}
    >
      <div className="absolute inset-0 grid grid-cols-[1fr_360px] gap-0">
        {/* Tree canvas */}
        <div className="relative overflow-hidden">
          {/* Scanline overlay (CRT vibe) */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0 2px, transparent 2px 4px)",
              opacity: 0.25,
              zIndex: 10,
            }}
          />
          <svg
            viewBox={`${minX} ${minY} ${w} ${h}`}
            className="w-full h-full"
            style={{ filter: "drop-shadow(0 0 8px rgba(57,255,20,0.15))" }}
          >
            {/* Edges (lines between nodes) */}
            {layout.edges.map((e) => {
              const fromNode = layout.nodes.find((n) => n.id === e.fromId);
              const toNode = layout.nodes.find((n) => n.id === e.toId);
              if (!fromNode || !toNode) return null;
              const color =
                fromNode.kind === "filled"
                  ? TIER_COLOR[fromNode.node.result.tier]
                  : "#39ff14";
              return (
                <line
                  key={`${e.fromId}-${e.toId}`}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={color}
                  strokeWidth={2.5}
                  strokeDasharray={e.pending ? "6 6" : "0"}
                  opacity={e.pending ? 0.4 : 0.85}
                  style={{
                    filter: `drop-shadow(0 0 4px ${color})`,
                  }}
                />
              );
            })}

            {/* Nodes */}
            {layout.nodes.map((n) => {
              if (n.kind === "filled") {
                const color = TIER_COLOR[n.node.result.tier];
                const isFocus = n.id === focusedId;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    style={{ cursor: "pointer" }}
                    onClick={() => onFocus(n.id)}
                  >
                    {/* Hex backdrop */}
                    <path
                      d={hexPath(HEX_R)}
                      fill={isFocus ? `${color}33` : "rgba(0,0,0,0.85)"}
                      stroke={color}
                      strokeWidth={isFocus ? 3 : 2}
                      style={{
                        filter: `drop-shadow(0 0 ${isFocus ? 12 : 6}px ${color})`,
                      }}
                    />
                    {/* Score */}
                    <text
                      x={0}
                      y={-2}
                      textAnchor="middle"
                      fill={color}
                      style={{
                        fontFamily: "var(--font-press-start-2p), monospace",
                        fontSize: 12,
                        textShadow: `0 0 4px ${color}`,
                      }}
                    >
                      {String(n.node.result.score).padStart(3, "0")}
                    </text>
                    {/* Label below: tier or dimension */}
                    <text
                      x={0}
                      y={14}
                      textAnchor="middle"
                      fill={color}
                      opacity={0.85}
                      style={{
                        fontFamily: "var(--font-vt323), monospace",
                        fontSize: 12,
                      }}
                    >
                      {n.node.dimension
                        ? truncate(n.node.dimension.label, 11)
                        : "ROOT"}
                    </text>
                  </g>
                );
              }
              // Pending (drillable) hex
              const cost = "1";
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  style={{ cursor: outOfCredits || loading ? "not-allowed" : "pointer" }}
                  opacity={outOfCredits || loading ? 0.4 : 1}
                  onClick={() => {
                    if (outOfCredits || loading) return;
                    const parent = layout.nodes.find(
                      (p) => p.kind === "filled" && p.id === n.parentId
                    );
                    if (parent && parent.kind === "filled") {
                      onDrill(parent.node, n.dimension);
                    }
                  }}
                >
                  <path
                    d={hexPath(HEX_R * 0.85)}
                    fill="rgba(57,255,20,0.06)"
                    stroke="#39ff14"
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    style={{
                      filter: "drop-shadow(0 0 5px rgba(57,255,20,0.5))",
                      animation: "pending-pulse 2s ease-in-out infinite",
                    }}
                  />
                  <text
                    x={0}
                    y={-4}
                    textAnchor="middle"
                    fill="#39ff14"
                    style={{
                      fontFamily: "var(--font-vt323), monospace",
                      fontSize: 13,
                      opacity: 0.95,
                    }}
                  >
                    {truncate(n.dimension.label, 10)}
                  </text>
                  <text
                    x={0}
                    y={10}
                    textAnchor="middle"
                    fill="#39ff14"
                    opacity={0.6}
                    style={{
                      fontFamily: "var(--font-press-start-2p), monospace",
                      fontSize: 7,
                      letterSpacing: "0.15em",
                    }}
                  >
                    {cost} CR
                  </text>
                </g>
              );
            })}
          </svg>

          {/* HUD top */}
          <div
            className="absolute top-4 left-4 z-20 flex items-center gap-3"
            style={{
              fontFamily: "var(--font-vt323), monospace",
              color: "#39ff14",
              textShadow: "0 0 6px #39ff14",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-press-start-2p), monospace",
                fontSize: 11,
                letterSpacing: "0.2em",
              }}
            >
              SCOPE_TREE
            </span>
            <span style={{ opacity: 0.6, fontSize: 14 }}>
              :: {thread.input.kind === "repo" ? "REPO" : "CHATLOG"} ::
              {" "}
              {(thread.input.payload.match(/[\w.-]+\/[\w.-]+/)?.[0] ||
                thread.input.payload).slice(0, 36).toUpperCase()}
            </span>
          </div>

          {/* HUD bottom */}
          <div
            className="absolute bottom-4 left-4 z-20 flex items-center gap-4"
            style={{
              fontFamily: "var(--font-vt323), monospace",
              color: "#39ff14",
              fontSize: 14,
              textShadow: "0 0 4px #39ff14",
            }}
          >
            <span style={{ opacity: 0.7 }}>
              NODES · {layout.nodes.filter((n) => n.kind === "filled").length}
            </span>
            <span style={{ opacity: 0.7 }}>
              PENDING · {layout.nodes.filter((n) => n.kind === "pending").length}
            </span>
            {credits !== null && Number.isFinite(credits) && (
              <span style={{ opacity: 0.85 }}>
                CREDITS · {String(credits).padStart(3, "0")}
              </span>
            )}
            {outOfCredits && (
              <button
                onClick={onBuyCredits}
                className="px-2 py-1 border uppercase"
                style={{
                  borderColor: "#ff007f",
                  color: "#ff007f",
                  textShadow: "0 0 6px #ff007f",
                  background: "rgba(0,0,0,0.6)",
                  letterSpacing: "0.2em",
                  fontSize: 12,
                }}
              >
                BUY CREDITS
              </button>
            )}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 px-2 py-1 border uppercase tracking-widest"
            style={{
              background: "rgba(0,0,0,0.6)",
              borderColor: "#39ff14",
              color: "#39ff14",
              fontFamily: "var(--font-vt323), monospace",
              fontSize: 14,
              textShadow: "0 0 6px #39ff14",
            }}
            aria-label="Exit skill tree"
          >
            [ESC] EXIT
          </button>
        </div>

        {/* Side panel — focused node's readout */}
        <aside
          className="border-l border-[#39ff14]/30 p-4 overflow-y-auto"
          style={{
            background: "rgba(0,0,0,0.85)",
            color: "#39ff14",
            fontFamily: "var(--font-vt323), monospace",
            textShadow: "0 0 4px #39ff14",
          }}
        >
          {focusedFilled ? (
            <NodeDetail node={focusedFilled.node} loading={loading} error={error} />
          ) : (
            <div className="text-sm opacity-60">
              Select a node in the tree to inspect it.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function NodeDetail({
  node,
  loading,
  error,
}: {
  node: CreepNode;
  loading: boolean;
  error: string | null;
}) {
  const color = TIER_COLOR[node.result.tier];
  const muts = node.result.mutations?.length
    ? node.result.mutations
    : node.result.mutation
    ? [node.result.mutation]
    : [];
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[9px] uppercase tracking-[0.2em] opacity-70"
        style={{ fontFamily: "var(--font-press-start-2p), monospace" }}>
        {node.dimension ? node.dimension.label : "ROOT SCAN"}
      </div>
      <div
        className="leading-none"
        style={{
          fontSize: 56,
          fontFamily: "var(--font-press-start-2p), monospace",
          color,
          textShadow: `0 0 8px ${color}`,
        }}
      >
        {String(node.result.score).padStart(3, "0")}
      </div>
      <div className="text-xs uppercase tracking-widest" style={{ color }}>
        {node.result.tier} :: {node.result.verdict}
      </div>
      <p className="text-sm opacity-80">{node.result.analysis}</p>
      {muts.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-widest opacity-60">
            MUTATIONS
          </span>
          {muts.slice(0, 4).map((m, i) => (
            <div
              key={i}
              className="pl-2 relative text-sm opacity-90"
              style={{ color }}
            >
              <span className="absolute left-0 top-0">▸</span>
              {m}
            </div>
          ))}
        </div>
      )}
      {loading && (
        <div className="mt-2 text-xs opacity-60 uppercase tracking-widest">
          CREEPING…
        </div>
      )}
      {error && (
        <div className="mt-2 text-xs uppercase tracking-widest"
          style={{ color: "#ff007f", textShadow: "0 0 6px #ff007f" }}>
          ! {error}
        </div>
      )}
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
