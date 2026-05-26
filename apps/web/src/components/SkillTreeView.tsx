"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CreepDimension,
  CreepNode,
  RatingTier,
  ScanThread,
} from "@/core";
import { layoutCreepTree, type LaidOutNode } from "@/lib/treeLayout";
import { usePanZoom } from "@/hooks/usePanZoom";
import ArtifactPanel from "./ArtifactPanel";
import type { ArtifactKind } from "@/core";

const TIER_COLOR: Record<RatingTier, string> = {
  corpse: "#888888",
  sweetspot: "#39ff14",
  abyss: "#ffb000",
  delusion: "#ff007f",
};

function creepColor(creep: number): string {
  if (creep >= 96) return "#ff007f";
  if (creep >= 71) return "#ffb000";
  if (creep >= 31) return "#39ff14";
  return "#888888";
}

const NODE_W = 220;
const NODE_H = 76;
const ROOT_W = 260;
const ROOT_H = 100;

type Selected =
  | { kind: "filled"; nodeId: string }
  | { kind: "pending"; dimensionId: string; parentNodeId: string }
  | null;

export default function SkillTreeView({
  thread,
  focusedId,
  onClose,
  onDrill,
  onArtifact,
  onFocus,
  loading,
  outOfCredits,
  error,
  credits,
  onBuyCredits,
  isPro,
}: {
  thread: ScanThread;
  focusedId: string | null;
  onClose: () => void;
  onDrill: (parentNode: CreepNode, dim: CreepDimension) => void;
  onArtifact: (parentNode: CreepNode, dim: CreepDimension, kind: ArtifactKind) => void;
  onFocus: (nodeId: string) => void;
  loading: boolean;
  outOfCredits: boolean;
  error: string | null;
  credits: number | null;
  onBuyCredits: () => void;
  isPro: boolean;
}) {
  const rawLayout = useMemo(() => layoutCreepTree(thread), [thread]);

  // Subtree collapse — set of filled-node ids whose descendants are hidden.
  // Persisted in URL hash `#collapsed=id1,id2`.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const hash = window.location.hash;
    const m = hash.match(/collapsed=([^&]+)/);
    if (!m) return new Set();
    return new Set(decodeURIComponent(m[1]).split(",").filter(Boolean));
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const arr = Array.from(collapsed);
    const next = arr.length ? `#collapsed=${encodeURIComponent(arr.join(","))}` : "";
    if (window.location.hash !== next) {
      // Replace, not push, so back-button doesn't get spammed.
      const url = window.location.pathname + window.location.search + next;
      window.history.replaceState(null, "", url);
    }
  }, [collapsed]);

  // Apply collapse: hide any node whose ancestor chain contains a collapsed id.
  const layout = useMemo(() => {
    if (collapsed.size === 0) return rawLayout;
    const parentMap = new Map<string, string | null>();
    for (const n of rawLayout.nodes) {
      parentMap.set(n.id, n.kind === "filled" ? n.parentId : n.parentId);
    }
    const isHidden = (id: string): boolean => {
      let cur: string | null = id;
      // Skip the node itself — only ancestors trigger hide.
      cur = parentMap.get(cur) ?? null;
      while (cur) {
        if (collapsed.has(cur)) return true;
        cur = parentMap.get(cur) ?? null;
      }
      return false;
    };
    const nodes = rawLayout.nodes.filter((n) => !isHidden(n.id));
    const edges = rawLayout.edges.filter(
      (e) => !isHidden(e.toId) && !isHidden(e.fromId)
    );
    // Recompute bounds.
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    }
    return { nodes, edges, bounds: { minX, minY, maxX, maxY } };
  }, [rawLayout, collapsed]);

  // Local selection. Filled nodes also push to global focus (so the
  // creep hook knows which node to drill FROM next).
  const [selected, setSelected] = useState<Selected>({
    kind: "filled",
    nodeId: focusedId ?? layout.nodes.find((n) => n.kind === "filled")?.id ?? "",
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // viewBox sized to the laid-out nodes + padding for boxes.
  const PAD_Y = NODE_H + 40;
  const minX = layout.bounds.minX - ROOT_W;
  const minY = layout.bounds.minY - PAD_Y / 2;
  const w = Math.max(1000, layout.bounds.maxX - minX + NODE_W);
  const h = Math.max(540, layout.bounds.maxY - minY + PAD_Y);

  const { svgRef, viewBox, zoomBy, reset, scale } = usePanZoom({
    vx: minX, vy: minY, vw: w, vh: h,
  });

  // Count drilled children per filled node — only show collapse toggle when there ARE descendants.
  const childCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of rawLayout.nodes) {
      if (n.kind !== "filled") continue;
      const pid = n.node.parentId;
      if (!pid) continue;
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
    return counts;
  }, [rawLayout.nodes]);

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Pick the right card to render in the side panel.
  const selectedFilled =
    selected?.kind === "filled"
      ? (layout.nodes.find(
          (n) => n.kind === "filled" && n.id === selected.nodeId
        ) as Extract<LaidOutNode, { kind: "filled" }> | undefined)
      : undefined;
  const selectedPending =
    selected?.kind === "pending"
      ? (layout.nodes.find(
          (n) =>
            n.kind === "pending" &&
            n.dimension.id === selected.dimensionId &&
            n.parentId === selected.parentNodeId
        ) as Extract<LaidOutNode, { kind: "pending" }> | undefined)
      : undefined;

  const seedPreview = thread.input.payload.replace(/\s+/g, " ").slice(0, 120);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black select-none"
      style={{
        background:
          "radial-gradient(ellipse at center, #0a0612 0%, #050308 60%, #000 100%)",
      }}
    >
      <div className="absolute inset-0 grid grid-cols-[1fr_400px] gap-0">
        <div className="relative overflow-auto">
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
              fontSize: 14,
            }}
          >
            <span style={{ color: "#ff007f", textShadow: "0 0 6px #ff007f" }}>
              ↑ MORE DELUSIONAL
            </span>
            <span style={{ color: "#39ff14", textShadow: "0 0 6px #39ff14" }}>
              ↓ SHIPPABLE
            </span>
          </div>

          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full h-full touch-none"
            preserveAspectRatio="xMinYMid meet"
            style={{ cursor: "grab" }}
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
              const fromIsRoot = from.kind === "filled" && from.node.parentId === null;
              const fromHalfW = fromIsRoot ? ROOT_W / 2 : NODE_W / 2;
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
                const isRoot = n.node.parentId === null;
                const isTerminal = Boolean(n.node.artifact);
                const tierColor = TIER_COLOR[n.node.result.tier];
                const color = isTerminal
                  ? (n.node.artifact!.kind === "SHIPPABLE" ? "#39ff14"
                    : n.node.artifact!.kind === "KILL" ? "#ff007f"
                    : n.node.artifact!.kind === "ISSUE" ? "#5cb8ff"
                    : "#ffb000")
                  : tierColor;
                const isSelected =
                  selected?.kind === "filled" && selected.nodeId === n.id;
                const W = isRoot ? ROOT_W : NODE_W;
                const H = isRoot ? ROOT_H : NODE_H;
                const kids = childCount.get(n.id) ?? 0;
                const isCollapsed = collapsed.has(n.id);
                return (
                  <g
                    key={n.id}
                    data-pz-stop
                    transform={`translate(${n.x - W / 2},${n.y - H / 2})`}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelected({ kind: "filled", nodeId: n.id });
                      onFocus(n.id);
                    }}
                  >
                    <rect
                      x={0}
                      y={0}
                      width={W}
                      height={H}
                      rx={6}
                      fill={isSelected ? `${color}25` : "rgba(0,0,0,0.85)"}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 2}
                      style={{
                        filter: `drop-shadow(0 0 ${isSelected ? 12 : 6}px ${color})`,
                      }}
                    />
                    {kids > 0 && (
                      <g
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollapse(n.id);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <circle
                          cx={W - 14}
                          cy={H - 14}
                          r={9}
                          fill="rgba(0,0,0,0.85)"
                          stroke={color}
                          strokeWidth={1.5}
                          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                        />
                        <text
                          x={W - 14}
                          y={H - 10}
                          textAnchor="middle"
                          fill={color}
                          style={{
                            fontFamily: "var(--font-press-start-2p), monospace",
                            fontSize: 10,
                            pointerEvents: "none",
                          }}
                        >
                          {isCollapsed ? "+" : "−"}
                        </text>
                      </g>
                    )}
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
                    {isRoot ? (
                      <>
                        <text
                          x={W - 10}
                          y={22}
                          textAnchor="end"
                          fill={color}
                          opacity={0.9}
                          style={{
                            fontFamily: "var(--font-press-start-2p), monospace",
                            fontSize: 8,
                            letterSpacing: "0.2em",
                          }}
                        >
                          {thread.input.kind === "repo" ? "REPO" : "SEED"}
                        </text>
                        <foreignObject x={10} y={38} width={W - 20} height={H - 44}>
                          <div
                            style={{
                              fontFamily: "var(--font-vt323), monospace",
                              color: "#dddddd",
                              fontSize: 13,
                              lineHeight: 1.2,
                              overflow: "hidden",
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
                          {isTerminal ? `◆ ${n.node.artifact!.kind}` : n.node.result.tier.toUpperCase()}
                        </text>
                        <text
                          x={12}
                          y={50}
                          fill={color}
                          style={{
                            fontFamily: "var(--font-vt323), monospace",
                            fontSize: 14,
                          }}
                        >
                          {truncate(
                            isTerminal
                              ? n.node.artifact!.title
                              : n.node.dimension?.label ?? "",
                            22
                          )}
                        </text>
                        <text
                          x={12}
                          y={66}
                          fill="#cccccc"
                          style={{
                            fontFamily: "var(--font-vt323), monospace",
                            fontSize: 11,
                          }}
                        >
                          {isTerminal
                            ? "TERMINAL · OPEN TO VIEW"
                            : truncate(n.node.result.verdict, 28)}
                        </text>
                      </>
                    )}
                  </g>
                );
              }

              // Pending: clickable preview card
              const color = creepColor(n.creep);
              const isSelected =
                selected?.kind === "pending" &&
                selected.dimensionId === n.dimension.id &&
                selected.parentNodeId === n.parentId;
              return (
                <g
                  key={n.id}
                  data-pz-stop
                  transform={`translate(${n.x - NODE_W / 2},${n.y - NODE_H / 2})`}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setSelected({
                      kind: "pending",
                      dimensionId: n.dimension.id,
                      parentNodeId: n.parentId,
                    })
                  }
                >
                  <rect
                    x={0}
                    y={0}
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    fill={isSelected ? `${color}22` : "rgba(0,0,0,0.75)"}
                    stroke={color}
                    strokeDasharray={isSelected ? "0" : "4 4"}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    style={{
                      filter: `drop-shadow(0 0 ${isSelected ? 10 : 4}px ${color})`,
                      animation: isSelected
                        ? "none"
                        : "pending-pulse 2.4s ease-in-out infinite",
                    }}
                  />
                  {/* Top-right creep badge first so it claims space.
                       Label is then truncated to fit the remaining width. */}
                  <text
                    x={NODE_W - 10}
                    y={20}
                    textAnchor="end"
                    fill={color}
                    opacity={0.9}
                    style={{
                      fontFamily: "var(--font-press-start-2p), monospace",
                      fontSize: 8,
                      letterSpacing: "0.15em",
                    }}
                  >
                    CR·{n.creep}
                  </text>
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
                    {truncate(n.dimension.label, 16)}
                  </text>
                  <foreignObject x={12} y={30} width={NODE_W - 24} height={NODE_H - 34}>
                    <div
                      style={{
                        fontFamily: "var(--font-vt323), monospace",
                        color: "#cccccc",
                        fontSize: 12,
                        lineHeight: 1.15,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {n.dimension.blurb}
                    </div>
                  </foreignObject>
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

          {/* Zoom controls */}
          <div
            data-pz-stop
            className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5"
            style={{ fontFamily: "var(--font-press-start-2p), monospace" }}
          >
            {[
              { label: "+", action: () => zoomBy(1.25) },
              { label: "−", action: () => zoomBy(1 / 1.25) },
              { label: "0", action: reset },
            ].map((b) => (
              <button
                key={b.label}
                onClick={b.action}
                className="w-9 h-9 border tracking-widest"
                style={{
                  background: "rgba(0,0,0,0.7)",
                  borderColor: "#39ff14",
                  color: "#39ff14",
                  textShadow: "0 0 6px #39ff14",
                  fontSize: 12,
                }}
                aria-label={`zoom ${b.label}`}
              >
                {b.label}
              </button>
            ))}
            <div
              className="text-[8px] text-center mt-1 opacity-50"
              style={{
                fontFamily: "var(--font-vt323), monospace",
                color: "#39ff14",
                fontSize: 11,
              }}
            >
              {Math.round(scale * 100)}%
            </div>
          </div>

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

          {/* Keyboard hint */}
          <div
            className="absolute top-14 right-4 z-20 text-right opacity-50"
            style={{
              fontFamily: "var(--font-vt323), monospace",
              color: "#39ff14",
              fontSize: 11,
            }}
          >
            DRAG · WHEEL · +/− · 0 · ↑↓←→
          </div>
        </div>

        {/* Side panel */}
        <aside
          className="border-l border-[#39ff14]/30 p-5 overflow-y-auto"
          style={{
            background: "rgba(0,0,0,0.92)",
            color: "#39ff14",
            fontFamily: "var(--font-vt323), monospace",
            textShadow: "0 0 4px #39ff14",
          }}
        >
          {selectedFilled ? (
            selectedFilled.node.artifact ? (
              <ArtifactPanel artifact={selectedFilled.node.artifact} />
            ) : (
              <FilledDetail node={selectedFilled.node} loading={loading} error={error} />
            )
          ) : selectedPending ? (
            <PendingPreview
              dimension={selectedPending.dimension}
              creep={selectedPending.creep}
              loading={loading}
              outOfCredits={outOfCredits}
              onDeploy={() => {
                const parent = layout.nodes.find(
                  (p) =>
                    p.kind === "filled" && p.id === selectedPending.parentId
                );
                if (parent && parent.kind === "filled") {
                  onDrill(parent.node, selectedPending.dimension);
                  setSelected({ kind: "filled", nodeId: parent.id });
                }
              }}
              onArtifact={(kind) => {
                const parent = layout.nodes.find(
                  (p) =>
                    p.kind === "filled" && p.id === selectedPending.parentId
                );
                if (parent && parent.kind === "filled") {
                  onArtifact(parent.node, selectedPending.dimension, kind);
                }
              }}
              onBuy={onBuyCredits}
              isPro={isPro}
            />
          ) : (
            <div className="text-sm opacity-70 leading-snug">
              Click a card on the left to inspect it.
              <br />
              <br />
              Dashed cards are <span style={{ color: "#39ff14" }}>project paths</span> you
              can deploy for 1 credit. Solid cards are scans you have already run.
              <br />
              <br />
              Higher rows = more delusional.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function FilledDetail({
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
      <p className="text-sm opacity-80 leading-snug">{node.result.analysis}</p>
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

function PendingPreview({
  dimension,
  creep,
  loading,
  outOfCredits,
  onDeploy,
  onArtifact,
  onBuy,
  isPro,
}: {
  dimension: CreepDimension;
  creep: number;
  loading: boolean;
  outOfCredits: boolean;
  onDeploy: () => void;
  onArtifact: (kind: ArtifactKind) => void;
  onBuy: () => void;
  isPro: boolean;
}) {
  const color = creepColor(creep);
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
        UNDEPLOYED PATH
      </div>
      <div
        className="leading-none"
        style={{
          fontSize: 26,
          fontFamily: "var(--font-press-start-2p), monospace",
          color,
          textShadow: `0 0 6px ${color}`,
          letterSpacing: "0.05em",
        }}
      >
        {dimension.label}
      </div>
      <p
        className="text-base opacity-85 leading-snug"
        style={{ color: "#dddddd" }}
      >
        {dimension.blurb}
      </p>
      <div
        className="mt-2 px-3 py-2 border"
        style={{
          borderColor: color,
          background: `${color}10`,
          color,
        }}
      >
        <div className="text-[9px] uppercase tracking-[0.2em] opacity-80">
          PREDICTED CREEP
        </div>
        <div
          className="text-3xl mt-1"
          style={{
            fontFamily: "var(--font-press-start-2p), monospace",
            textShadow: `0 0 6px ${color}`,
          }}
        >
          {String(creep).padStart(3, "0")}
        </div>
        <div className="text-xs opacity-75 mt-1 uppercase tracking-widest">
          {creep >= 96
            ? "TOTAL TIMELINE EXTINCTION"
            : creep >= 71
            ? "AGGRESSIVELY OVER-SCOPED"
            : creep >= 31
            ? "CONTROLLED DRIFT — SHIP IT"
            : "BORING BUT SHIPPABLE"}
        </div>
      </div>
      <div className="mt-3">
        {outOfCredits ? (
          <button
            onClick={onBuy}
            className="w-full px-3 py-3 border uppercase tracking-widest"
            style={{
              borderColor: "#ff007f",
              color: "#ff007f",
              textShadow: "0 0 6px #ff007f",
              background: "rgba(0,0,0,0.6)",
              fontSize: 14,
            }}
          >
            BUY CREDITS TO DEPLOY
          </button>
        ) : (
          <button
            onClick={onDeploy}
            disabled={loading}
            className="w-full px-3 py-3 border uppercase tracking-widest hover:bg-current/10 disabled:opacity-50"
            style={{
              borderColor: color,
              color,
              textShadow: `0 0 6px ${color}`,
              background: "rgba(0,0,0,0.7)",
              fontSize: 14,
            }}
          >
            {loading ? "DEPLOYING…" : "▸ DEPLOY PATH · 1 CREDIT"}
          </button>
        )}
        <div className="text-[10px] opacity-50 mt-2 uppercase tracking-widest">
          {loading
            ? "Generating sub-paths…"
            : "Deploying spawns this branch + its own sub-paths."}
        </div>
      </div>

      {/* Artifact terminals — converge to a concrete deliverable. */}
      {!outOfCredits && (
        <div className="mt-3">
          <div className="text-[9px] uppercase tracking-[0.2em] opacity-70 mb-1.5">
            OR CONVERGE
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { kind: "KILL" as ArtifactKind, label: "KILL", color: "#ff007f", hint: "abandon plan", free: true },
              { kind: "SHIPPABLE" as ArtifactKind, label: "SHIPPABLE", color: "#39ff14", hint: "1-pg PRD", free: false },
              { kind: "ISSUE" as ArtifactKind, label: "ISSUE", color: "#5cb8ff", hint: "GH issue", free: false },
              { kind: "BADGE" as ArtifactKind, label: "BADGE", color: "#ffb000", hint: "README badge", free: false },
            ]).map((b) => {
              const locked = !b.free && !isPro;
              return (
                <button
                  key={b.kind}
                  disabled={loading}
                  onClick={() => (locked ? onBuy() : onArtifact(b.kind))}
                  className="px-2 py-2 border uppercase tracking-widest text-left disabled:opacity-40 relative"
                  style={{
                    borderColor: b.color,
                    color: b.color,
                    background: "rgba(0,0,0,0.7)",
                    fontSize: 11,
                    textShadow: `0 0 4px ${b.color}`,
                    opacity: locked ? 0.78 : 1,
                  }}
                  title={locked ? `${b.label} is a Pro feature — upgrade to unlock` : `Generate ${b.label} artifact`}
                >
                  <div>▸ {b.label}{locked ? " · PRO" : ""}</div>
                  <div className="text-[9px] opacity-70 normal-case tracking-normal mt-0.5">
                    {b.hint}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-[10px] opacity-50 mt-2 uppercase tracking-widest">
            KILL is free · others unlock with Pro · terminal output
          </div>
        </div>
      )}
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
