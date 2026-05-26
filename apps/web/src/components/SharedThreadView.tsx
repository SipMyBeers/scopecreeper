"use client";

import { useState } from "react";
import type { CreepNode, ScanThread } from "@/core";
import { layoutCreepTree } from "@/lib/treeLayout";
import { usePanZoom } from "@/hooks/usePanZoom";
import ArtifactPanel from "./ArtifactPanel";

const TIER_COLOR = {
  corpse: "#888888",
  sweetspot: "#39ff14",
  abyss: "#ffb000",
  delusion: "#ff007f",
} as const;

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

export default function SharedThreadView({
  slug,
  thread,
  createdAt,
}: {
  slug: string;
  thread: ScanThread;
  createdAt: number;
}) {
  const layout = layoutCreepTree(thread);
  const [selectedId, setSelectedId] = useState<string>(
    layout.nodes.find((n) => n.kind === "filled")?.id ?? ""
  );

  const PAD_Y = NODE_H + 40;
  const minX = layout.bounds.minX - ROOT_W;
  const minY = layout.bounds.minY - PAD_Y / 2;
  const w = Math.max(1000, layout.bounds.maxX - minX + NODE_W);
  const h = Math.max(540, layout.bounds.maxY - minY + PAD_Y);
  const { svgRef, viewBox, zoomBy, reset, scale } = usePanZoom({
    vx: minX, vy: minY, vw: w, vh: h,
  });

  const selected = layout.nodes.find((n) => n.kind === "filled" && n.id === selectedId);
  const selectedNode: CreepNode | null =
    selected && selected.kind === "filled" ? selected.node : null;

  const r = thread.result;
  const tierColor = TIER_COLOR[r.tier];

  return (
    <div
      className="min-h-screen bg-black text-[#e8ffe8] select-none"
      style={{
        background:
          "radial-gradient(ellipse at center, #0a0612 0%, #050308 60%, #000 100%)",
        fontFamily: "var(--font-vt323), monospace",
      }}
    >
      {/* Top banner */}
      <div className="px-6 py-3 border-b border-[#39ff14]/30 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              color: "#39ff14",
              textShadow: "0 0 6px #39ff14",
            }}
          >
            SCOPE CREEPER
          </a>
          <span className="opacity-50 text-sm">/ shared · {slug}</span>
        </div>
        <a
          href="/"
          className="px-3 py-1 border uppercase tracking-widest"
          style={{
            borderColor: "#39ff14",
            color: "#39ff14",
            fontSize: 12,
            textShadow: "0 0 4px #39ff14",
          }}
        >
          ▸ RUN YOUR OWN
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-0">
        <div className="relative h-[80vh] overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full h-full touch-none"
            preserveAspectRatio="xMinYMid meet"
            style={{ cursor: "grab" }}
          >
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

            {layout.nodes.map((n) => {
              if (n.kind === "filled") {
                const isRoot = n.node.parentId === null;
                const isTerminal = Boolean(n.node.artifact);
                const tierC = TIER_COLOR[n.node.result.tier];
                const color = isTerminal
                  ? (n.node.artifact!.kind === "SHIPPABLE" ? "#39ff14"
                    : n.node.artifact!.kind === "KILL" ? "#ff007f"
                    : n.node.artifact!.kind === "ISSUE" ? "#5cb8ff"
                    : "#ffb000")
                  : tierC;
                const isSelected = selectedId === n.id;
                const W = isRoot ? ROOT_W : NODE_W;
                const H = isRoot ? ROOT_H : NODE_H;
                return (
                  <g
                    key={n.id}
                    data-pz-stop
                    transform={`translate(${n.x - W / 2},${n.y - H / 2})`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedId(n.id)}
                  >
                    <rect
                      x={0} y={0} width={W} height={H} rx={6}
                      fill={isSelected ? `${color}25` : "rgba(0,0,0,0.85)"}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 2}
                      style={{ filter: `drop-shadow(0 0 ${isSelected ? 12 : 6}px ${color})` }}
                    />
                    <text
                      x={12} y={28}
                      fill={color}
                      style={{
                        fontFamily: "var(--font-press-start-2p), monospace",
                        fontSize: 16,
                        textShadow: `0 0 4px ${color}`,
                      }}
                    >
                      {String(n.node.result.score).padStart(3, "0")}
                    </text>
                    {!isRoot && (
                      <>
                        <text
                          x={W - 10} y={22} textAnchor="end" fill={color} opacity={0.85}
                          style={{ fontFamily: "var(--font-press-start-2p), monospace", fontSize: 8, letterSpacing: "0.15em" }}
                        >
                          {isTerminal ? `◆ ${n.node.artifact!.kind}` : n.node.result.tier.toUpperCase()}
                        </text>
                        <text x={12} y={50} fill={color} style={{ fontFamily: "var(--font-vt323), monospace", fontSize: 14 }}>
                          {(isTerminal ? n.node.artifact!.title : n.node.dimension?.label ?? "").slice(0, 22)}
                        </text>
                      </>
                    )}
                  </g>
                );
              }
              return null; // pending nodes hidden in read-only view
            })}
          </svg>

          {/* Score banner overlay top-left */}
          <div className="absolute top-4 left-4 z-20" style={{ color: tierColor }}>
            <div
              className="text-[10px] uppercase tracking-[0.2em] opacity-70"
              style={{ fontFamily: "var(--font-press-start-2p), monospace" }}
            >
              DELUSION
            </div>
            <div
              style={{
                fontSize: 64,
                lineHeight: 1,
                fontFamily: "var(--font-press-start-2p), monospace",
                textShadow: `0 0 8px ${tierColor}`,
              }}
            >
              {String(r.score).padStart(3, "0")}
            </div>
            <div className="mt-1 text-base uppercase tracking-widest">{r.tier}</div>
          </div>

          {/* Zoom controls */}
          <div
            data-pz-stop
            className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5"
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
                  fontFamily: "var(--font-press-start-2p), monospace",
                  fontSize: 12,
                  textShadow: "0 0 6px #39ff14",
                }}
              >
                {b.label}
              </button>
            ))}
            <div className="text-[8px] text-center mt-1 opacity-50" style={{ color: "#39ff14", fontSize: 11 }}>
              {Math.round(scale * 100)}%
            </div>
          </div>
        </div>

        <aside
          className="border-t lg:border-t-0 lg:border-l border-[#39ff14]/30 p-5 overflow-y-auto max-h-[80vh]"
          style={{ background: "rgba(0,0,0,0.92)" }}
        >
          {selectedNode?.artifact ? (
            <ArtifactPanel artifact={selectedNode.artifact} />
          ) : selectedNode ? (
            <FilledReadOnly node={selectedNode} />
          ) : (
            <div className="text-sm opacity-70">Click a card to inspect.</div>
          )}
          <div className="mt-6 pt-4 border-t border-[#39ff14]/20 text-[10px] opacity-50 uppercase tracking-widest">
            Shared {new Date(createdAt).toISOString().slice(0, 10)} · Read-only
          </div>
        </aside>
      </div>
    </div>
  );
}

function FilledReadOnly({ node }: { node: CreepNode }) {
  const color = TIER_COLOR[node.result.tier];
  const muts = node.result.mutations?.length
    ? node.result.mutations
    : node.result.mutation
    ? [node.result.mutation]
    : [];
  return (
    <div className="flex flex-col gap-3" style={{ color: "#39ff14" }}>
      <div
        className="text-[9px] uppercase tracking-[0.2em] opacity-70"
        style={{ fontFamily: "var(--font-press-start-2p), monospace" }}
      >
        {node.dimension ? node.dimension.label : "ROOT SCAN"}
      </div>
      <div
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
          <span className="text-[10px] uppercase tracking-widest opacity-60">MUTATIONS</span>
          {muts.slice(0, 4).map((m, i) => (
            <div key={i} className="pl-2 relative text-sm opacity-90" style={{ color }}>
              <span className="absolute left-0 top-0">▸</span>
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
