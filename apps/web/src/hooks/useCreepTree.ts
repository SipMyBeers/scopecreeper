"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CreepDimension,
  CreepNode,
  DiagnosticResult,
  ScanThread,
} from "@/core";

interface CreepResponse extends DiagnosticResult {
  // Server returns `dimensions` on the result itself.
}

function newNodeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

/** Build the initial tree from a fresh scan thread (one root node). */
function bootstrapTree(thread: ScanThread): NonNullable<ScanThread["tree"]> {
  if (thread.tree?.rootId && thread.tree.nodes[thread.tree.rootId]) {
    return thread.tree;
  }
  const rootId = newNodeId();
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

export interface CreepTreeState {
  /** The current tree (always set if `thread` is). */
  tree: NonNullable<ScanThread["tree"]> | null;
  /** Currently focused node id. */
  focusedId: string | null;
  focusedNode: CreepNode | null;
  /** Path from root to focused (root first). */
  path: CreepNode[];
  loading: boolean;
  error: string | null;
  outOfCredits: boolean;
  drillInto: (dim: CreepDimension) => Promise<void>;
  focus: (nodeId: string | null) => void;
  back: () => void;
  reset: () => void;
}

/**
 * State + actions for navigating a creep tree off a single scan thread.
 * Calls /api/creep when drilling into a new dimension. Persists the
 * updated tree back through the supplied `onChange` (which the caller
 * uses to save into the thread store / hook).
 */
export function useCreepTree(args: {
  thread: ScanThread | null;
  onChange: (next: ScanThread) => void;
  onCreditsChange?: () => void;
}): CreepTreeState {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);

  // Always materialize a tree for the current thread (creates one if missing).
  const tree = useMemo(() => {
    if (!args.thread) return null;
    return bootstrapTree(args.thread);
  }, [args.thread]);

  // Persist the bootstrapped tree to the thread the first time we see
  // a thread without one — so consumers (SkillTreeView, etc.) that
  // also derive a tree from the thread share the same root id.
  useEffect(() => {
    if (!args.thread || args.thread.tree?.rootId) return;
    if (tree) args.onChange({ ...args.thread, tree });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.thread?.id]);

  // Default focus = root.
  const effectiveFocusedId =
    focusedId && tree?.nodes[focusedId] ? focusedId : tree?.rootId ?? null;

  const focusedNode =
    effectiveFocusedId && tree ? tree.nodes[effectiveFocusedId] : null;

  const path: CreepNode[] = useMemo(() => {
    if (!tree || !focusedNode) return [];
    const out: CreepNode[] = [];
    let cur: CreepNode | undefined = focusedNode;
    while (cur) {
      out.unshift(cur);
      cur = cur.parentId ? tree.nodes[cur.parentId] : undefined;
    }
    return out;
  }, [tree, focusedNode]);

  const drillInto = useCallback(
    async (dim: CreepDimension) => {
      if (!args.thread || !tree || !focusedNode) return;
      setLoading(true);
      setError(null);
      setOutOfCredits(false);
      try {
        const parentSummary = [
          `Score: ${focusedNode.result.score}/100`,
          `Tier:  ${focusedNode.result.tier}`,
          `Verdict: ${focusedNode.result.verdict}`,
          focusedNode.result.analysis,
          focusedNode.dimension
            ? `(this node scaled "${focusedNode.dimension.label}": ${focusedNode.dimension.blurb})`
            : `(root scan; original input: ${args.thread.input.payload.slice(0, 240)})`,
        ].join("\n");

        const res = await fetch("/api/creep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentSummary, dimension: dim }),
        });
        if (res.status === 402) {
          setOutOfCredits(true);
          throw new Error("OUT_OF_CREDITS");
        }
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `creep failed: ${res.status}`);
        }
        const result = (await res.json()) as CreepResponse;
        args.onCreditsChange?.();

        const id = newNodeId();
        const node: CreepNode = {
          id,
          parentId: focusedNode.id,
          dimension: dim,
          result,
          childIds: [],
          createdAt: Date.now(),
        };
        const nextTree: NonNullable<ScanThread["tree"]> = {
          rootId: tree.rootId,
          nodes: {
            ...tree.nodes,
            [focusedNode.id]: {
              ...focusedNode,
              childIds: [...focusedNode.childIds, id],
            },
            [id]: node,
          },
        };
        args.onChange({ ...args.thread, tree: nextTree });
        setFocusedId(id);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [args, tree, focusedNode]
  );

  const focus = useCallback((nodeId: string | null) => {
    setFocusedId(nodeId);
    setError(null);
    setOutOfCredits(false);
  }, []);

  const back = useCallback(() => {
    if (!tree || !focusedNode?.parentId) return;
    setFocusedId(focusedNode.parentId);
  }, [tree, focusedNode]);

  const reset = useCallback(() => {
    setFocusedId(tree?.rootId ?? null);
    setError(null);
    setOutOfCredits(false);
  }, [tree]);

  return {
    tree,
    focusedId: effectiveFocusedId,
    focusedNode,
    path,
    loading,
    error,
    outOfCredits,
    drillInto,
    focus,
    back,
    reset,
  };
}
