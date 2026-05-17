"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScanInput, ScanThread } from "@/core";
import { scan } from "@/lib/api";
import {
  deleteThread as deleteFromStore,
  listThreads,
  saveThread,
} from "@/lib/threads";

export type ScanState = "idle" | "scanning" | "done" | "error" | "out_of_credits";

export interface UseScanHistory {
  threads: ScanThread[];
  currentThreadId: string | null;
  currentThread: ScanThread | null;
  state: ScanState;
  error: string | null;
  runScan: (input: ScanInput) => Promise<ScanThread | null>;
  openThread: (id: string | null) => void;
  deleteThread: (id: string) => void;
  /** Persist an updated thread (used by the creep-tree to add nodes). */
  updateThread: (next: ScanThread) => void;
  /** Returns to "idle" — the arcade returns to its default swirl state. */
  reset: () => void;
}

export function useScanHistory(): UseScanHistory {
  const [threads, setThreads] = useState<ScanThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setThreads(listThreads());
  }, []);

  const runScan = useCallback(async (input: ScanInput) => {
    if (!input.payload.trim()) return null;
    setState("scanning");
    setError(null);
    try {
      const result = await scan(input);
      if (!result) {
        setState("error");
        return null;
      }
      const thread: ScanThread = {
        id:
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2)),
        createdAt: Date.now(),
        input,
        result,
      };
      saveThread(thread);
      setThreads(listThreads());
      setCurrentThreadId(thread.id);
      setState("done");
      return thread;
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      setState(msg === "OUT_OF_CREDITS" ? "out_of_credits" : "error");
      return null;
    }
  }, []);

  const openThread = useCallback((id: string | null) => {
    setCurrentThreadId(id);
    setState(id ? "done" : "idle");
    setError(null);
  }, []);

  const deleteThread = useCallback(
    (id: string) => {
      deleteFromStore(id);
      setThreads(listThreads());
      setCurrentThreadId((cur) => (cur === id ? null : cur));
    },
    []
  );

  const updateThread = useCallback((next: ScanThread) => {
    saveThread(next);
    setThreads(listThreads());
  }, []);

  const reset = useCallback(() => {
    setCurrentThreadId(null);
    setState("idle");
    setError(null);
  }, []);

  const currentThread =
    threads.find((t) => t.id === currentThreadId) ?? null;

  return {
    threads,
    currentThreadId,
    currentThread,
    state,
    error,
    runScan,
    openThread,
    deleteThread,
    updateThread,
    reset,
  };
}
