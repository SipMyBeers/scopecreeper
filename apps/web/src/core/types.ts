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
  /** Predicted delusion if the user picks this branch (0-100).
   *  Drives vertical placement in the skill-tree view. */
  creep?: number;
}

export type ArtifactKind = "SHIPPABLE" | "KILL" | "ISSUE" | "BADGE";

export interface CreepArtifact {
  kind: ArtifactKind;
  title: string;
  body: string;
  mime: string;
  labels?: string[];
  embed_markdown?: string;
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
  /** If present, this node is a terminal artifact rather than a branch. */
  artifact?: CreepArtifact;
  /** True for artifact terminal nodes — no further branches generated. */
  terminal?: boolean;
}

/* ============================================================ *
 *  Projects — Pro-tier workspaces. A project bundles multiple
 *  inputs (a repo, one or more chatlogs, one or more docs) into a
 *  single container that we can run theory-vs-actual analysis on.
 * ============================================================ */

export type ProjectInputKind = "repo" | "chatlog" | "doc";

export interface ProjectRepoInput {
  kind: "repo";
  id: string;
  addedAt: number;
  /** owner/name */
  repo: string;
  /** Snapshot of repo metadata grabbed at import time (README excerpt, etc). */
  meta: {
    description?: string;
    defaultBranch?: string;
    readmeExcerpt?: string;
    packageJsonExcerpt?: string;
    /** Audit findings folded in for the SHIPPED column. */
    findingsCount?: number;
    filesScanned?: number;
    delusionScore?: number;
  };
}

export interface ProjectChatlogInput {
  kind: "chatlog";
  id: string;
  addedAt: number;
  title: string;
  text: string; // raw chatlog body (capped at ~80KB)
  turns: number;
  wordCount: number;
}

export interface ProjectDocInput {
  kind: "doc";
  id: string;
  addedAt: number;
  title: string;
  /** Original file mime — text/markdown, text/plain, application/pdf. */
  mime: string;
  /** Extracted plain text. PDFs are extracted client-side via pdfjs. */
  text: string;
  bytes: number;
}

export type ProjectInput = ProjectRepoInput | ProjectChatlogInput | ProjectDocInput;

/** A single feature/claim extracted from theory inputs (chatlog/doc). */
export interface ClaimedFeature {
  id: string;
  title: string;
  description: string;
  /** Which input said this. */
  source: { inputId: string; kind: "chatlog" | "doc" };
}

/** A surface that actually exists in the repo. */
export interface ShippedSurface {
  id: string;
  /** Category of evidence — route, module, command, dependency, file. */
  kind: "route" | "module" | "command" | "dep" | "file";
  title: string;
  /** Where it lives. */
  evidence: { file: string; line?: number };
}

export interface DriftEntry {
  id: string;
  status: "matched" | "claimed-only" | "shipped-only";
  claim?: ClaimedFeature;
  shipped?: ShippedSurface;
  /** One-line explanation of how we paired (or didn't). */
  rationale: string;
}

export interface ProjectAnalysis {
  computedAt: number;
  claimed: ClaimedFeature[];
  shipped: ShippedSurface[];
  delta: DriftEntry[];
  /** AI-suggested deeper paths — "how it could get creepier". */
  creepier: CreepDimension[];
  /** Top-line drift summary number — % of claims matched in repo. */
  matchedPct: number;
  /** Bottom-line creep prognosis text. */
  prognosis: string;
}

export interface Project {
  id: string;
  ownerSid: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  inputs: ProjectInput[];
  analysis?: ProjectAnalysis;
}

export interface UserProfileResult {
  username: string;
  name: string | null;
  avatarUrl: string | null;
  publicRepos: number;
  analyzedCount: number;
  delusionScore: number;
  tier: RatingTier;
  verdict: string;
  analysis: string;
  patterns: string[];
  topRepos: import("./github").UserRepoSummary[];
  scannedAt: number;
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
