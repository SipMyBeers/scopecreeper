import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";

const HOME = process.env.HOME ?? "";
const LOG_PATH = join(HOME, ".config", "scopecreeper", "justifications.json");
const DRIFT_THRESHOLD = Number(process.env.SC_DRIFT_THRESHOLD ?? 50);

export interface Justification {
  repo: string;
  path: string;
  hash: string;
  subject: string;
  score: number;
  tier: string;
  verdict: string;
  /** What the user typed when prompted. Empty string = dismissed without
   *  answering, which is itself a signal — we track those separately. */
  justification: string;
  ts: number;
}

interface LogFile {
  entries: Justification[];
}

async function readLog(): Promise<LogFile> {
  try {
    const raw = await readFile(LOG_PATH, "utf8");
    return JSON.parse(raw) as LogFile;
  } catch {
    return { entries: [] };
  }
}

async function writeLog(log: LogFile): Promise<void> {
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  await writeFile(LOG_PATH, JSON.stringify(log, null, 2));
}

export async function appendJustification(entry: Omit<Justification, "ts">): Promise<void> {
  const log = await readLog();
  log.entries.push({ ...entry, ts: Date.now() });
  // Keep last 500 max
  if (log.entries.length > 500) log.entries = log.entries.slice(-500);
  await writeLog(log);
}

export async function loadJustifications(): Promise<Justification[]> {
  const log = await readLog();
  return log.entries;
}

export function shouldPromptWhy(score: number): boolean {
  return score >= DRIFT_THRESHOLD;
}

export function summarizeJustifications(entries: Justification[]): {
  total: number;
  drifted: number;
  dismissed: number;
  perRepo: Record<string, number>;
} {
  const perRepo: Record<string, number> = {};
  let dismissed = 0;
  for (const e of entries) {
    perRepo[e.repo] = (perRepo[e.repo] ?? 0) + 1;
    if (!e.justification.trim()) dismissed++;
  }
  return {
    total: entries.length,
    drifted: entries.length,
    dismissed,
    perRepo,
  };
}
