"use client";

import { useCallback, useEffect, useState } from "react";

export interface SessionState {
  sid: string;
  credits: number;
  lifetimePaid: number;
  tier?: "free" | "pro";
  isPro?: boolean;
  proExpiresAt?: number | null;
  freeScansRemaining?: number;
  freeScansPerMonth?: number;
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

  /** Optimistic local quota adjustment for snappy UI (server is truth).
   *  Burns legacy credits first, then decrements free-scan remaining if Pro
   *  isn't active. Pro = no-op. */
  const adjustCredits = useCallback((delta: number) => {
    setSession((s) => {
      if (!s) return s;
      if (s.isPro) return s;
      const credits = Number.isFinite(s.credits) ? s.credits : 0;
      if (credits > 0) {
        return { ...s, credits: Math.max(0, credits + delta) };
      }
      const remaining = s.freeScansRemaining ?? 0;
      return {
        ...s,
        freeScansRemaining: Math.max(0, remaining + delta),
      };
    });
  }, []);

  return { session, refresh, adjustCredits };
}
