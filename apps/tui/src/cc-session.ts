/**
 * Claude Code session discovery + parsing.
 *
 * CC writes one JSONL file per session at:
 *   ~/.claude/projects/{slashes-to-dashes}/{session-uuid}.jsonl
 *
 * Each line is one event: user message, assistant reply (possibly
 * containing tool_use blocks), or tool_result. We tail the newest
 * file for a repo and surface tool calls so the user can see in
 * real time which files the AI is touching and whether they drift.
 */
import { existsSync, statSync, readdirSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

const HOME = process.env.HOME ?? "";
const CC_ROOT = join(HOME, ".claude", "projects");

/** Encode a repo path the way Claude Code does for its projects dir. */
function encodeRepoPath(repoPath: string): string {
  return repoPath.replace(/\//g, "-");
}

export interface CcSessionInfo {
  jsonlPath: string;
  sessionId: string;
  projectDir: string;
  mtime: number;
  sizeBytes: number;
}

/**
 * Find the newest Claude Code session jsonl that's tied to this repo.
 * Searches for project directories whose encoded name starts with the
 * encoded repo path (catches sub-directory sessions like cwd inside
 * `repo/apps/mcp`).
 */
export function findActiveSession(repoPath: string): CcSessionInfo | null {
  if (!existsSync(CC_ROOT)) return null;
  const encoded = encodeRepoPath(repoPath);
  let best: CcSessionInfo | null = null;
  for (const projectDir of readdirSync(CC_ROOT)) {
    if (!projectDir.startsWith(encoded)) continue;
    const dirPath = join(CC_ROOT, projectDir);
    let files: string[];
    try { files = readdirSync(dirPath); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith(".jsonl")) continue;
      const full = join(dirPath, f);
      try {
        const st = statSync(full);
        const candidate: CcSessionInfo = {
          jsonlPath: full,
          sessionId: f.replace(".jsonl", ""),
          projectDir,
          mtime: st.mtimeMs,
          sizeBytes: st.size,
        };
        if (!best || candidate.mtime > best.mtime) best = candidate;
      } catch { /* skip */ }
    }
  }
  return best;
}

export type CcEvent =
  | { kind: "user"; text: string; ts: number }
  | { kind: "assistant-text"; text: string; ts: number }
  | { kind: "tool-use"; tool: string; filePath?: string; command?: string; ts: number }
  | { kind: "meta"; text: string; ts: number };

interface RawJsonl {
  type?: string;
  timestamp?: string;
  message?: {
    role?: string;
    content?: unknown;
  };
}

/**
 * Parse one JSONL line into the small set of events the TUI cares about.
 * Returns null for noise (system reminders, tool_result wrappers we don't
 * care to surface).
 */
export function parseLine(line: string): CcEvent[] {
  if (!line.trim()) return [];
  let obj: RawJsonl;
  try { obj = JSON.parse(line); } catch { return []; }

  const ts = obj.timestamp ? new Date(obj.timestamp).getTime() : Date.now();
  const out: CcEvent[] = [];

  if (obj.type === "user" && obj.message?.role === "user") {
    const c = obj.message.content;
    if (typeof c === "string") {
      if (!c.includes("<system-reminder>") && !c.startsWith("<command-")) {
        out.push({ kind: "user", text: c.slice(0, 200), ts });
      }
    } else if (Array.isArray(c)) {
      // Skip tool_result-only user messages — those are just SDK plumbing.
      const hasOnlyToolResults = c.every((b: { type?: string }) => b.type === "tool_result");
      if (!hasOnlyToolResults) {
        for (const block of c) {
          const b = block as { type?: string; text?: string };
          if (b.type === "text" && typeof b.text === "string" && !b.text.includes("<system-reminder>")) {
            out.push({ kind: "user", text: b.text.slice(0, 200), ts });
          }
        }
      }
    }
  }

  if (obj.type === "assistant" && obj.message?.role === "assistant" && Array.isArray(obj.message.content)) {
    for (const block of obj.message.content) {
      const b = block as { type?: string; text?: string; name?: string; input?: Record<string, unknown> };
      if (b.type === "text" && typeof b.text === "string" && b.text.trim()) {
        out.push({ kind: "assistant-text", text: b.text.slice(0, 240), ts });
      }
      if (b.type === "tool_use" && b.name) {
        const filePath = typeof b.input?.file_path === "string" ? b.input.file_path as string : undefined;
        const command = typeof b.input?.command === "string" ? (b.input.command as string).slice(0, 80) : undefined;
        out.push({ kind: "tool-use", tool: b.name, filePath, command, ts });
      }
    }
  }

  return out;
}

/**
 * Read and parse the existing contents of a jsonl, returning the parsed
 * events. Used to seed the panel with the session's recent history
 * before tailing further appends.
 */
export async function readSessionEvents(jsonlPath: string, tailLines = 60): Promise<CcEvent[]> {
  try {
    const raw = await readFile(jsonlPath, "utf8");
    const lines = raw.split("\n").filter(Boolean).slice(-tailLines);
    return lines.flatMap(parseLine);
  } catch {
    return [];
  }
}

/**
 * Crude drift heuristic — return true if the touched file is "outside"
 * what's declared in the scope doc. False positives are fine; this is
 * just to color-code the panel.
 */
export function pathDrifts(filePath: string | undefined, scopeDoc: string): boolean {
  if (!filePath) return false;
  if (!scopeDoc) return false;
  const not = scopeDoc.match(/##\s*What this project is NOT[\s\S]*?(?=##|$)/i)?.[0] ?? "";
  const deferred = scopeDoc.match(/##\s*Explicitly deferred[\s\S]*?(?=##|$)/i)?.[0] ?? "";
  const blocked = (not + "\n" + deferred).toLowerCase();
  const lower = filePath.toLowerCase();
  // Word-level match against the NOT/deferred sections.
  const words = blocked.split(/[^a-z0-9]+/).filter((w) => w.length > 4);
  return words.some((w) => lower.includes(w));
}
