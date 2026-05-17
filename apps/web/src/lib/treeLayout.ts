import type { CreepDimension, CreepNode, ScanThread } from "@/core";

/**
 * Horizontal skill-tree layout. Reads left-to-right.
 *
 *   col 0:  root scan (the input seed)
 *   col 1:  pending dimensions + drilled children of root
 *   col 2+: deeper drilled children
 *
 * Vertical position is keyed to creep level — higher up = more
 * delusional path, lower = more shippable. Each column gets its rows
 * sorted top-down by descending creep.
 */

const COL_X = 240;     // horizontal distance between depths
const ROW_Y = 90;      // vertical slot height
const TOP_PAD = 40;    // breathing room above first row

function ensureTree(thread: ScanThread): NonNullable<ScanThread["tree"]> {
  if (thread.tree?.rootId && thread.tree.nodes[thread.tree.rootId]) {
    return thread.tree;
  }
  const rootId = thread.id + "::root";
  const root: CreepNode = {
    id: rootId,
    parentId: null,
    dimension: null,
    result: thread.result,
    childIds: [],
    createdAt: thread.createdAt,
  };
  return { rootId, nodes: { [rootId]: root } };
}

export interface FilledNode {
  kind: "filled";
  id: string;
  node: CreepNode;
  x: number;
  y: number;
  depth: number;
  /** Y-sort key (creep level). */
  creep: number;
  parentId: string | null;
}

export interface PendingNode {
  kind: "pending";
  id: string;          // `${parentNodeId}::${dimensionId}`
  parentId: string;
  dimension: CreepDimension;
  x: number;
  y: number;
  depth: number;
  creep: number;
}

export type LaidOutNode = FilledNode | PendingNode;

export interface TreeLayout {
  nodes: LaidOutNode[];
  edges: { fromId: string; toId: string; pending: boolean }[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** Estimate a dimension's vertical-sort creep value. */
function dimensionCreep(d: CreepDimension): number {
  return typeof d.creep === "number" ? d.creep : 50;
}

export function layoutCreepTree(thread: ScanThread): TreeLayout {
  const tree = ensureTree(thread);

  // Group everything by depth (column).
  type Slot = {
    nodeId: string;
    parentId: string | null;
    depth: number;
    creep: number;
    dimension: CreepDimension | null;
    node: CreepNode | null;          // null if pending
    pendingId?: string;
  };

  const slots: Slot[] = [];

  function walk(nodeId: string, depth: number) {
    const node = tree.nodes[nodeId];
    if (!node) return;
    slots.push({
      nodeId,
      parentId: node.parentId,
      depth,
      creep: node.result.score,
      dimension: node.dimension,
      node,
    });
    // Drilled children: recurse.
    const drilledDimIds = new Set<string>();
    for (const cid of node.childIds) {
      const child = tree.nodes[cid];
      if (child?.dimension?.id) drilledDimIds.add(child.dimension.id);
      walk(cid, depth + 1);
    }
    // Pending children: synthesize.
    for (const dim of node.result.dimensions ?? []) {
      if (drilledDimIds.has(dim.id)) continue;
      const pid = `${nodeId}::${dim.id}`;
      slots.push({
        nodeId: pid,
        parentId: nodeId,
        depth: depth + 1,
        creep: dimensionCreep(dim),
        dimension: dim,
        node: null,
        pendingId: pid,
      });
    }
  }

  walk(tree.rootId, 0);

  // Bucket slots by depth and sort each column by descending creep.
  const byDepth = new Map<number, Slot[]>();
  for (const s of slots) {
    const arr = byDepth.get(s.depth) ?? [];
    arr.push(s);
    byDepth.set(s.depth, arr);
  }
  for (const arr of byDepth.values()) {
    arr.sort((a, b) => b.creep - a.creep);
  }

  // Assign coordinates.
  const placement = new Map<string, { x: number; y: number }>();
  const maxColLen = Math.max(1, ...Array.from(byDepth.values(), (v) => v.length));
  for (const [depth, arr] of byDepth) {
    arr.forEach((s, idx) => {
      const x = depth * COL_X;
      // Center each column vertically around 0 so the canvas viewBox can be
      // computed easily, but anchor by top so growth doesn't shift earlier rows.
      const y = TOP_PAD + idx * ROW_Y - (maxColLen - 1) * ROW_Y / 2;
      placement.set(s.nodeId, { x, y });
    });
  }

  // Build laid-out nodes + edges.
  const nodes: LaidOutNode[] = [];
  const edges: { fromId: string; toId: string; pending: boolean }[] = [];

  for (const s of slots) {
    const pos = placement.get(s.nodeId)!;
    if (s.node) {
      nodes.push({
        kind: "filled",
        id: s.nodeId,
        node: s.node,
        x: pos.x,
        y: pos.y,
        depth: s.depth,
        creep: s.creep,
        parentId: s.parentId,
      });
      if (s.parentId) edges.push({ fromId: s.parentId, toId: s.nodeId, pending: false });
    } else if (s.dimension) {
      nodes.push({
        kind: "pending",
        id: s.nodeId,
        parentId: s.parentId!,
        dimension: s.dimension,
        x: pos.x,
        y: pos.y,
        depth: s.depth,
        creep: s.creep,
      });
      edges.push({ fromId: s.parentId!, toId: s.nodeId, pending: true });
    }
  }

  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y);
  }
  return { nodes, edges, bounds: { minX, minY, maxX, maxY } };
}
