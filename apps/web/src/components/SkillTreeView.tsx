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

/** Creep-level → color, mirroring the tier palette for pending nodes. */
function creepColor(creep: number): string {
  if (creep >= 96) return "#ff007f";
  if (creep >= 71) return "#ffb000";
  if (creep >= 31) return "#39ff14";
  return "#888888";
}

const NODE_W = 200;
const NODE_H = 64;
const ROOT_W = 240;
const ROOT_H = 90;

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
  const layout = useMemo(() => layoutCreepTree(thread), [thread]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // viewBox sized to the laid-out nodes + padding for boxes.
  const PAD_X = NODE_W;
  const PAD_Y = NODE_H + 40;
  const minX = layout.bounds.minX - PAD_X / 2;
  const minY = layout.bounds.minY - PAD_Y / 2;
  const w = Math.max(900, layout.bounds.maxX - minX + PAD_X);
  const h = Math.max(540, layout.bounds.maxY - minY + PAD_Y);

  const focusedFilled = layout.nodes.find(
    (n) => n.kind === "filled" && n.id === focusedId
  ) as Extract<LaidOutNode, { kind: "filled" }> | undefined;

  // Sample of the seed shown inside the root box.
  const seedPreview = thread.input.payload.replace(/\s+/g, " ").slice(0, 96);

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
        <div className="relative overflow-auto">
          {/* Scanline overlay */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0 2px, transparent 2px 4px)",
              opacity: 0.18,
              zIndex: 10,
            }}
          />

          {/* Y-axis creep label */}
          <div
            aria-hidden
            className="absolute left-2 inset-y-0 z-20 flex flex-col items-center justify-between py-12 pointer-events-none"
            style={{
              fontFamily: "var(--font-vt323), monospace",
              color: "#ff007f",
              textShadow: "0 0 6px #ff007f",
              fontSize: 14,
            }}
          >
            <span>↑ MORE DELUSIONAL</span>
            <span style={{ color: "#39ff14", textShadow: "0 0 6px #39ff14" }}>
              ↓ SHIPPABLE
            </span>
          </div>

          <svg
            viewBox={`${minX} ${minY} ${w} ${h}`}
            className="w-full h-full"
            preserveAspectRatio="xMinYMid meet"
          >
            {/* Edges */}
            {layout.edges.map((e) => {
              const from = layout.nodes.find((n) => n.id === e.fromId);
              const to = layout.nodes.find((n) => n.id === e.toId);
              if (!from || !to) return null;
              const color =
                from.kind === "filled"
                  ? TIER_COLOR[from.node.result.tier]
                  : "#39ff14";
              // Bezier curve from right of source to left of target.
              const fromHalfW = from.id === thread.id + "::root" ? ROOT_W / 2 : NODE_W / 2;
              const toHalfW = NODE_W / 2;
              const x1 = from.x + fromHalfW;
              const x2 = to.x - toHalfW;
              const midX = (x1 + x2) / 2;
              const path = `M ${x1} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${x2} ${to.y}`;
              return (
                <path
                  key={`${e.fromId}-${e.toId}`}
                  d={path}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={e.pending ? "6 5" : "0"}
                  fill="none"
                  opacity={e.pending ? 0.35 : 0.8}
                  style={{ filter: `drop-shadow(0 0 3px ${color})` }}
                />
              );
            })}

            {/* Nodes */}
            {layout.nodes.map((n) => {
              if (n.kind === "filled") {
                const color = TIER_COLOR[n.node.result.tier];
                const isRoot = n.node.parentId === null;
                const isFocus = n.id === focusedId;
                const W = isRoot ? ROOT_W : NODE_W;
                const H = isRoot ? ROOT_H : NODE_H;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x - W / 2},${n.y - H / 2})`}
                    style={{ cursor: "pointer" }}
                    onClick={() => onFocus(n.id)}
                  >
                    <rect
                      x={0}
                      y={0}
                      width={W}
                      height={H}
                      rx={6}
                      fill={isFocus ? `${color}25` : "rgba(0,0,0,0.85)"}
                      stroke={color}
                      strokeWidth={isFocus ? 3 : 2}
                      style={{
                        filter: `drop-shadow(0 0 ${isFocus ? 12 : 6}px ${color})`,
                      }}
                    />
                    {/* Score */}
                    <text
                      x={12}
                      y={28}
                      fill={color}
                      style={{
                        fontFamily: "var(--font-press-start-2p), monospace",
                        fontSize: 16,
                        textShadow: `0 0 4px ${color}`,
                      }}
                    >
                      {String(n.node.result.score).padStart(3, "0")}
                    </text>
                    {/* Label + blurb */}
                    {isRoot ? (
                      <>
                        <text
                          x={W - 10}
                          y={28}
                          textAnchor="end"
                          fill={color}
                          opacity={0.85}
                          style={{
                            fontFamily: "var(--font-press-start-2p), monospace",
                            fontSize: 8,
                            letterSpacing: "0.15em",
                          }}
                        >
                          {(thread.input.kind === "repo" ? "REPO" : "INPUT").toString()}
                        </text>
                        <foreignObject x={10} y={36} width={W - 20} height={H - 40}>
                          <div
                            style={{
                              fontFamily: "var(--font-vt323), monospace",
                              color: "#cccccc",
                              fontSize: 13,
                              lineHeight: 1.15,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {seedPreview}
                          </div>
                        </foreignObject>
                      </>
                    ) : (
                      <>
                        <text
                          x={W - 10}
                          y={22}
                          textAnchor="end"
                          fill={color}
                          opacity={0.85}
                          style={{
                            fontFamily: "var(--font-press-start-2p), monospace",
                            fontSize: 8,
                            letterSpacing: "0.15em",
                          }}
                        >
                          {n.node.result.tier.toUpperCase()}
                        </text>
                        <text
                          x={12}
                          y={48}
                          fill={color}
                          style={{
                            fontFamily: "var(--font-vt323), monospace",
                            fontSize: 14,
                          }}
                        >
                          {truncate(n.node.dimension?.label ?? "", 22)}
                        </text>
                      </>
                    )}
                  </g>
                );
              }

              // Pending hex → drillable project card.
              const color = creepColor(n.creep);
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x - NODE_W / 2},${n.y - NODE_H / 2})`}
                  style={{
                    cursor: outOfCredits || loading ? "not-allowed" : "pointer",
                  }}
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
                  <rect
                    x={0}
                    y={0}
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    fill="rgba(0,0,0,0.75)"
                    stroke={color}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    style={{
                      filter: `drop-shadow(0 0 4px ${color})`,
                      animation: "pending-pulse 2s ease-in-out infinite",
                    }}
                  />
                  <text
                    x={12}
                    y={22}
                    fill={color}
                    style={{
                      fontFamily: "var(--font-press-start-2p), monospace",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {truncate(n.dimension.label, 22)}
                  </text>
                  <foreignObject x={12} y={28} width={NODE_W - 60} height={NODE_H - 32}>
                    <div
                      style={{
                        fontFamily: "var(--font-vt323), monospace",
                        color: "#cccccc",
                        fontSize: 11,
                        lineHeight: 1.15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {n.dimension.blurb}
                    </div>
                  </foreignObject>
                  <text
                    x={NODE_W - 10}
                    y={22}
                    textAnchor="end"
                    fill={color}
                    opacity={0.7}
                    style={{
                      fontFamily: "var(--font-press-start-2p), monospace",
                      fontSize: 8,
                      letterSpacing: "0.15em",
                    }}
                  >
                    1 CR · {n.creep}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* HUD top */}
          <div
            className="absolute top-4 left-12 z-20 flex items-center gap-3"
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
            <span style={{ opacity: 0.65, fontSize: 14 }}>
              :: {thread.input.kind === "repo" ? "REPO" : "INPUT"}
            </span>
          </div>

          {/* HUD bottom */}
          <div
            className="absolute bottom-4 left-12 z-20 flex items-center gap-4"
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

          {/* New-user hint */}
          <div
            className="absolute bottom-4 right-4 z-20 max-w-[280px] px-3 py-2 border"
            style={{
              background: "rgba(0,0,0,0.55)",
              borderColor: "rgba(57,255,20,0.35)",
              color: "#39ff14",
              fontFamily: "var(--font-vt323), monospace",
              fontSize: 13,
              lineHeight: 1.25,
              textShadow: "0 0 4px #39ff14",
            }}
          >
            Pick a branch on the right → spend 1 credit → that project
            gets its own sub-paths. Higher rows = more delusional.
          </div>
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
              Click a card to inspect it. Click a dashed card on the right
              to drill into that project path (1 credit).
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
      <div
        className="text-[9px] uppercase tracking-[0.2em] opacity-70"
        style={{ fontFamily: "var(--font-press-start-2p), monospace" }}
      >
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
        <div
          className="mt-2 text-xs uppercase tracking-widest"
          style={{ color: "#ff007f", textShadow: "0 0 6px #ff007f" }}
        >
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
