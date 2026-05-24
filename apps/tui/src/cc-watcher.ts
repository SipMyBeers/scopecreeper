/**
 * Tail a Claude Code session jsonl. Re-reads only new bytes when the file
 * grows so we don't redo work for long sessions.
 */
import chokidar from "chokidar";
import { open, type FileHandle } from "fs/promises";
import { parseLine, type CcEvent } from "./cc-session.js";

interface Tail {
  watcher: ReturnType<typeof chokidar.watch>;
  handle: FileHandle | null;
  offset: number;
  buffer: string;
}

const tails: Map<string, Tail> = new Map();

export type TailCallback = (events: CcEvent[]) => void;

export async function tailSession(jsonlPath: string, fromByte: number, cb: TailCallback): Promise<() => void> {
  const existing = tails.get(jsonlPath);
  if (existing) {
    existing.watcher.close();
    existing.handle?.close();
    tails.delete(jsonlPath);
  }

  const handle = await open(jsonlPath, "r");
  const tail: Tail = { watcher: chokidar.watch(jsonlPath, { ignoreInitial: true }), handle, offset: fromByte, buffer: "" };
  tails.set(jsonlPath, tail);

  const drain = async () => {
    if (!tail.handle) return;
    const stat = await tail.handle.stat();
    if (stat.size <= tail.offset) return;
    const length = stat.size - tail.offset;
    const buf = Buffer.allocUnsafe(length);
    await tail.handle.read(buf, 0, length, tail.offset);
    tail.offset = stat.size;
    tail.buffer += buf.toString("utf8");
    const lines = tail.buffer.split("\n");
    tail.buffer = lines.pop() ?? ""; // keep trailing partial
    const events = lines.flatMap(parseLine);
    if (events.length) cb(events);
  };

  tail.watcher.on("change", () => { drain().catch(() => {}); });

  return () => {
    tail.watcher.close();
    tail.handle?.close().catch(() => {});
    tails.delete(jsonlPath);
  };
}
