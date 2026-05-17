"use client";

import { useCallback, useEffect, useState } from "react";

export interface SessionState {
  sid: string;
  credits: number;
  lifetimePaid: number;
}

export function useSession() {
  const [session, setSession] = useState<SessionState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/session", { credentials: "include" });
      if (!res.ok) return;
      setSession((await res.json()) as SessionState);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Optimistic local credit adjustment for snappy UI (server is truth). */
  const adjustCredits = useCallback((delta: number) => {
    setSession((s) => {
      if (!s) return s;
      const cur = Number.isFinite(s.credits) ? s.credits : 0;
      return { ...s, credits: Math.max(0, cur + delta) };
    });
  }, []);

  return { session, refresh, adjustCredits };
}
