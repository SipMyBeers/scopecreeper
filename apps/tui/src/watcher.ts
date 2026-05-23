import chokidar from "chokidar";
import { join } from "path";
import { getLatestCommit, type CommitInfo } from "./discovery.js";

export type CommitCallback = (repoPath: string, commit: CommitInfo) => void;

const watchers: Map<string, ReturnType<typeof chokidar.watch>> = new Map();
const lastHashes: Map<string, string> = new Map();

export function watchRepo(repoPath: string, onCommit: CommitCallback): void {
  if (watchers.has(repoPath)) return;

  // Seed the last known hash so we don't fire on startup
  const initial = getLatestCommit(repoPath);
  if (initial) lastHashes.set(repoPath, initial.hash);

  const target = join(repoPath, ".git", "COMMIT_EDITMSG");
  const watcher = chokidar.watch(target, { ignoreInitial: true, usePolling: false });

  watcher.on("change", () => {
    const commit = getLatestCommit(repoPath);
    if (!commit) return;
    if (lastHashes.get(repoPath) === commit.hash) return;
    lastHashes.set(repoPath, commit.hash);
    onCommit(repoPath, commit);
  });

  watchers.set(repoPath, watcher);
}

export function unwatchAll(): void {
  for (const w of watchers.values()) w.close();
  watchers.clear();
}
