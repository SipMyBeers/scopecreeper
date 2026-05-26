"use client";

import { useState } from "react";

export default function BuyCreditsModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(body: Record<string, string>, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `checkout failed: ${res.status}`);
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(520px,94vw)] border border-[#39ff14]/50 p-4 flex flex-col gap-3"
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
            UPGRADE
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none opacity-80 hover:opacity-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <button
          onClick={() => go({ product: "PRO" }, "PRO")}
          disabled={busy !== null}
          className="border-2 p-4 text-left disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{
            borderColor: "#ffb000",
            background: "rgba(255,176,0,0.06)",
            color: "#ffb000",
            textShadow: "0 0 8px #ffb000",
            fontFamily: "var(--font-vt323), monospace",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 11,
              letterSpacing: "0.2em",
            }}
          >
            ▸ PRO · $9 / MONTH
          </div>
          <ul className="mt-2 text-sm opacity-90 space-y-0.5">
            <li>· Unlimited scans + drills</li>
            <li>· All 4 leaf artifacts (SHIPPABLE, KILL, ISSUE, BADGE)</li>
            <li>· Public share links + OG previews</li>
            <li>· 5 deep-audits per month included</li>
            <li>· Projects: bundle repo + chatlogs + docs, run theory-vs-actual diff</li>
          </ul>
          <div className="mt-2 text-[11px] uppercase tracking-widest opacity-90 underline">
            {busy === "PRO" ? "redirecting…" : "subscribe →"}
          </div>
        </button>

        <div className="text-[10px] opacity-50 uppercase tracking-widest text-center my-1">
          OR · one-shot
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              const repo = prompt("GitHub repo (owner/name):", "vercel/next.js");
              if (repo) void go({ product: "AUDIT", repo }, "AUDIT");
            }}
            disabled={busy !== null}
            className="border border-[#5cb8ff]/50 hover:border-[#5cb8ff] p-3 text-left disabled:opacity-40"
            style={{
              color: "#5cb8ff",
              background: "rgba(92,184,255,0.05)",
              fontFamily: "var(--font-vt323), monospace",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-press-start-2p), monospace",
                fontSize: 9,
                letterSpacing: "0.15em",
              }}
            >
              DEEP AUDIT
            </div>
            <div className="mt-1 text-xl">1 repo</div>
            <div className="mt-1 text-sm opacity-80">$5</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest opacity-70">
              {busy === "AUDIT" ? "redirecting…" : "buy →"}
            </div>
          </button>
          <button
            onClick={() => go({ packId: "PACK_100" }, "PACK_100")}
            disabled={busy !== null}
            className="border border-[#39ff14]/40 hover:border-[#39ff14] p-3 text-left disabled:opacity-40"
            style={{
              background: "rgba(57,255,20,0.05)",
              fontFamily: "var(--font-vt323), monospace",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-press-start-2p), monospace",
                fontSize: 9,
                letterSpacing: "0.15em",
              }}
            >
              CREDIT PACK
            </div>
            <div className="mt-1 text-xl">100 credits</div>
            <div className="mt-1 text-sm opacity-80">$5 · legacy</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest opacity-70">
              {busy === "PACK_100" ? "redirecting…" : "buy →"}
            </div>
          </button>
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
          checkout via stripe · cancel anytime from your account
        </p>
      </div>
    </div>
  );
}
