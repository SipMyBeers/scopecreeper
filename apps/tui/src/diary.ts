/**
 * Scope Creeper diary — per-repo, append-only log of every drift and
 * every decision made about it. Lives at <repo>/.scopecreeper-diary.md
 * so the file is committed alongside the code it describes.
 *
 * The diary is the SOURCE OF TRUTH that future AI sessions read to
 * understand "what has this project decided to be, and what has it
 * already rejected." Claude never writes to it — only the user
 * via the TUI's action picker writes new entries.
 */
import { existsSync } from "fs";
import { appendFile, writeFile, readFile } from "fs/promises";
import { join } from "path";

export type Action = "REDIRECT" | "EXPAND" | "KILL" | "ACCEPT" | "DISMISSED";

export interface DiaryEntry {
  ts: Date;
  hash: string;
  subject: string;
  driftScore: number;
  tier: string;
  verdict: string;
  analysis: string;
  /** What the user picked. */
  chosen: Action;
  /** Creep score of the chosen route (after action). */
  chosenScore: number;
  /** Optional user-typed reason / note. */
  note?: string;
}

const HEADER = (repoName: string) => `# Scope Creeper Diary · ${repoName}

This file is the append-only log of every drift detected in this repo and
every decision made about it. Each entry is a moment where past-you had
to defend a present-you choice.

Read this file before starting any new AI-driven work in this repo. The
patterns are loud after 20 entries.

> Managed by scope-creeper. Edit the prose if you want, but don't delete
> entries — that's how the loop loses memory.

---
`;

export function diaryPath(repoPath: string): string {
  return join(repoPath, ".scopecreeper-diary.md");
}

export async function appendDiary(repoPath: string, repoName: string, entry: DiaryEntry): Promise<void> {
  const path = diaryPath(repoPath);
  if (!existsSync(path)) {
    await writeFile(path, HEADER(repoName));
  }
  const md = formatEntry(entry);
  await appendFile(path, md);
}

function formatEntry(e: DiaryEntry): string {
  const ts = e.ts.toISOString().replace("T", " ").slice(0, 16);
  const lines = [
    "",
    `## ${ts} · ${e.chosen} · drift ${e.driftScore} → ${e.chosenScore}`,
    `**Commit:** \`${e.hash}\` — ${e.subject}`,
    `**Verdict:** ${e.verdict}`,
    `**Why drift:** ${e.analysis}`,
  ];
  if (e.note?.trim()) lines.push(`**Note:** ${e.note.trim()}`);
  lines.push("");
  return lines.join("\n");
}

export async function readDiary(repoPath: string): Promise<string> {
  try {
    return await readFile(diaryPath(repoPath), "utf8");
  } catch {
    return "";
  }
}

/**
 * Heuristic creep score per action — used to rank the picker options
 * before the user commits to one. Pure function; no LLM call.
 *
 *   REDIRECT — reverts the drift, low creep
 *   EXPAND   — legitimizes the drift in the scope doc (scope grows is itself a creep signal)
 *   KILL     — removes the drift entirely, zero creep
 *   ACCEPT   — keeps the drift as-is, same score as original
 */
export function scoreActions(originalDrift: number): Record<Action, number> {
  return {
    REDIRECT: Math.max(5, Math.round(originalDrift * 0.2)),
    EXPAND: Math.min(100, originalDrift + 15),
    KILL: 0,
    ACCEPT: originalDrift,
    DISMISSED: originalDrift,
  };
}
