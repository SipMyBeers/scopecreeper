/** Public shared types — used by both the web app and the Pages Function. */

export type RatingTier = "corpse" | "sweetspot" | "abyss" | "delusion";

export interface DiagnosticResult {
  /** 0–100 delusion score. */
  score: number;
  tier: RatingTier;
  verdict: string;
  analysis: string;
  /** One mutation suggestion. */
  mutation: string;
  /** Optional extended list of mutations from the LLM. */
  mutations?: string[];
  /** Raw reality + illusion components for the UI to inspect. */
  realityScore?: number;
  illusionScore?: number;
  /** Creep dimensions specific to this project — each one is a CYOA branch. */
  dimensions?: CreepDimension[];
}

export interface CreepDimension {
  /** Short ID, e.g. "api_surface" — used as the path segment in the tree. */
  id: string;
  /** Display name, e.g. "API SURFACE". */
  label: string;
  /** One-line description shown under the label. */
  blurb: string;
}

/**
 * A node in the creep tree. The root node is the original DELUSION
 * scan; each child is the LLM's projection of what happens if the user
 * "scales" the chosen dimension. Children are themselves nodes (so the
 * tree can grow N levels deep).
 */
export interface CreepNode {
  id: string;
  parentId: string | null;
  /** The dimension this node is scaling, or `null` for the root. */
  dimension: CreepDimension | null;
  /** What the creeping along this dimension looks like (LLM output). */
  result: DiagnosticResult;
  /** Child node ids (sub-dimensions the user has scaled further). */
  childIds: string[];
  createdAt: number;
}

export type ScanKind = "repo" | "chatlog";

export interface ScanInput {
  kind: ScanKind;
  /** Repo URL ("owner/repo" or full https://) or chatlog text. */
  payload: string;
  /** Optional secondary illusion prompt for repo scans. */
  illusion?: string;
}

export interface ScanThread {
  id: string;
  createdAt: number;
  input: ScanInput;
  result: DiagnosticResult;
  /** Optional title — derived from input if not set. */
  title?: string;
  /**
   * Optional creep tree built by drilling into dimensions. Keyed by
   * node id; `rootId` is the entry point. Missing on legacy threads.
   */
  tree?: {
    rootId: string;
    nodes: Record<string, CreepNode>;
  };
}
