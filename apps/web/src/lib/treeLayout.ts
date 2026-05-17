import type { CreepDimension, CreepNode, ScanThread } from "@/core";

/** Build a minimal root-only tree from a thread that hasn't been
 *  drilled into yet. Mirrors `bootstrapTree` in `useCreepTree`. */
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

/**
 * Lays out a creep tree as a radial hex graph for the skill-tree view.
 *
 * - The root node is at depth 0.
 * - Each child gets an angular slice within the parent's slice.
 * - Position = (cx + r*cos(angle), cy + r*sin(angle)) with r = depth * R_STEP.
 * - "Pending" (un-drilled) dimensions are rendered as empty hex slots
 *   under their parent at the same angle as their would-be position.
 */

export interface FilledNode {
  kind: "filled";
  id: string;
  node: CreepNode;
  x: number;
  y: number;
  depth: number;
  angle: number;
  parentId: string | null;
}

export interface PendingNode {
  kind: "pending";
  id: string;            // synthetic id: `${parentNodeId}::${dimensionId}`
  parentId: string;
  dimension: CreepDimension;
  x: number;
  y: number;
  depth: number;
  angle: number;
}

export type LaidOutNode = FilledNode | PendingNode;

export interface TreeLayout {
  nodes: LaidOutNode[];
  edges: { fromId: string; toId: string; pending: boolean }[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

const R_STEP = 165;            // radial distance between depths
const FULL = Math.PI * 2;
const ROOT_ANGLE = -Math.PI / 2; // root "faces up" (children expand downward)

export function layoutCreepTree(
  thread: ScanThread,
  cx: number = 0,
  cy: number = 0
): TreeLayout {
  const tree = ensureTree(thread);

  const nodes: LaidOutNode[] = [];
  const edges: { fromId: string; toId: string; pending: boolean }[] = [];

  type Slot = {
    nodeId: string;
    angle: number;        // center angle
    span: number;         // angular span available
    depth: number;
  };

  function placeNode(slot: Slot) {
    const node = tree.nodes[slot.nodeId];
    if (!node) return;
    const r = slot.depth * R_STEP;
    const x = cx + Math.cos(slot.angle) * r;
    const y = cy + Math.sin(slot.angle) * r;
    nodes.push({
      kind: "filled",
      id: node.id,
      node,
      x,
      y,
      depth: slot.depth,
      angle: slot.angle,
      parentId: node.parentId,
    });
    if (node.parentId) {
      edges.push({ fromId: node.parentId, toId: node.id, pending: false });
    }

    // Compute combined children list: drilled + pending dimensions.
    const drilledChildren = node.childIds
      .map((cid) => tree.nodes[cid])
      .filter(Boolean) as CreepNode[];
    const drilledDimIds = new Set(
      drilledChildren.map((c) => c.dimension?.id).filter(Boolean) as string[]
    );
    const pendingDims = (node.result.dimensions ?? []).filter(
      (d) => !drilledDimIds.has(d.id)
    );
    const totalChildren = drilledChildren.length + pendingDims.length;
    if (totalChildren === 0) return;

    // Children fan out across (parent_angle ± span/2) with a wider spread
    // at deeper levels to keep them legible.
    const baseSpan = slot.depth === 0 ? FULL : Math.min(slot.span, Math.PI * 1.1);
    const childSpan = baseSpan / totalChildren;
    const startAngle = slot.angle - baseSpan / 2 + childSpan / 2;

    // Drilled children first, then pending.
    drilledChildren.forEach((child, i) => {
      placeNode({
        nodeId: child.id,
        angle: startAngle + i * childSpan,
        span: childSpan * 1.6,
        depth: slot.depth + 1,
      });
    });
    pendingDims.forEach((dim, j) => {
      const i = drilledChildren.length + j;
      const angle = startAngle + i * childSpan;
      const r = (slot.depth + 1) * R_STEP;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      const pid = `${node.id}::${dim.id}`;
      nodes.push({
        kind: "pending",
        id: pid,
        parentId: node.id,
        dimension: dim,
        x: px,
        y: py,
        depth: slot.depth + 1,
        angle,
      });
      edges.push({ fromId: node.id, toId: pid, pending: true });
    });
  }

  placeNode({
    nodeId: tree.rootId,
    angle: ROOT_ANGLE,
    span: FULL,
    depth: 0,
  });

  // Bounds for the viewBox.
  let minX = cx, maxX = cx, minY = cy, maxY = cy;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y);
  }
  return { nodes, edges, bounds: { minX, minY, maxX, maxY } };
}
