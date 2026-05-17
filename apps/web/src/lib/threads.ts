import type { ScanThread } from "@/core";

const KEY = "scopecreeper:threads";
const VERSION = 1;

interface Stored {
  v: number;
  threads: ScanThread[];
}

function safeRead(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (parsed?.v !== VERSION || !Array.isArray(parsed.threads)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeWrite(threads: ScanThread[]) {
  if (typeof window === "undefined") return;
  try {
    const data: Stored = { v: VERSION, threads };
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* quota or disabled — ignore */
  }
}

export function listThreads(): ScanThread[] {
  return safeRead()?.threads ?? [];
}

export function getThread(id: string): ScanThread | undefined {
  return listThreads().find((t) => t.id === id);
}

export function saveThread(t: ScanThread) {
  const all = listThreads();
  const idx = all.findIndex((x) => x.id === t.id);
  if (idx >= 0) all[idx] = t;
  else all.unshift(t);
  // Cap history at 50.
  safeWrite(all.slice(0, 50));
}

export function deleteThread(id: string) {
  safeWrite(listThreads().filter((t) => t.id !== id));
}

export function clearThreads() {
  safeWrite([]);
}

/** Quick title from a thread payload. */
export function deriveTitle(thread: ScanThread): string {
  if (thread.title) return thread.title;
  const p = thread.input.payload.trim();
  if (thread.input.kind === "repo") {
    const m = p.match(/([\w.-]+\/[\w.-]+)/);
    return (m?.[1] ?? p).toUpperCase();
  }
  return p.replace(/\s+/g, " ").slice(0, 48).toUpperCase();
}
