"use client";

import { useState } from "react";

interface Pack {
  id: "PACK_100" | "PACK_500";
  credits: number;
  priceUsd: number;
  flavor: string;
}

const PACKS: Pack[] = [
  { id: "PACK_100", credits: 100, priceUsd: 5,  flavor: "STARTER VIRUS" },
  { id: "PACK_500", credits: 500, priceUsd: 20, flavor: "PANDEMIC PACK" },
];

export default function BuyCreditsModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(pack: Pack) {
    setBusyId(pack.id);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `checkout failed: ${res.status}`);
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError((err as Error).message);
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(480px,92vw)] border border-[#39ff14]/50 p-4 flex flex-col gap-3"
        style={{
          background: "rgba(0,0,0,0.92)",
          color: "#39ff14",
          fontFamily: "var(--font-vt323), monospace",
          textShadow: "0 0 6px #39ff14",
          boxShadow: "0 0 24px rgba(57,255,20,0.35)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 11,
              letterSpacing: "0.2em",
            }}
          >
            REFILL CREDITS
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none opacity-80 hover:opacity-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-sm opacity-75 leading-snug">
          Each scan and each creep-dimension drill costs 1 credit. New
          sessions get 10 free credits.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => buy(pack)}
              disabled={busyId !== null}
              className="border border-[#39ff14]/40 hover:border-[#39ff14] p-3 text-left disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "rgba(57,255,20,0.05)",
                fontFamily: "var(--font-vt323), monospace",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-press-start-2p), monospace",
                  fontSize: 10,
                  letterSpacing: "0.15em",
                }}
              >
                {pack.flavor}
              </div>
              <div className="mt-1 text-2xl">{pack.credits} credits</div>
              <div className="mt-1 text-sm opacity-80">${pack.priceUsd}</div>
              <div className="mt-2 text-[11px] uppercase tracking-widest underline">
                {busyId === pack.id ? "redirecting…" : "buy →"}
              </div>
            </button>
          ))}
        </div>
        {error && (
          <p
            className="text-xs"
            style={{ color: "#ff007f", textShadow: "0 0 6px #ff007f" }}
          >
            ! {error}
          </p>
        )}
        <p className="text-[10px] opacity-50">
          checkout via stripe · payment is one-time, no subscription
        </p>
      </div>
    </div>
  );
}
