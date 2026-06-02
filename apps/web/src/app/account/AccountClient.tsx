"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";

interface ApiKeyMeta {
  hashPrefix: string;
  label: string;
  createdAt: number;
  lastUsedAt?: number;
}

function shortAgo(ts?: number): string {
  if (!ts) return "never";
  const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function AccountClient() {
  const { session } = useSession();
  const [keys, setKeys] = useState<ApiKeyMeta[] | null>(null);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys", { credentials: "include" });
      if (!res.ok) {
        setError(`load failed (${res.status})`);
        setKeys([]);
        return;
      }
      const j = (await res.json()) as { keys: ApiKeyMeta[] };
      setKeys(j.keys);
    } catch {
      setError("network error");
      setKeys([]);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function create() {
    if (!label.trim() || creating) return;
    setCreating(true);
    setError(null);
    setNewKey(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label: label.trim() }),
      });
      const j = (await res.json()) as { key?: string; error?: string };
      if (!res.ok) {
        setError(j.error ?? `create failed (${res.status})`);
        return;
      }
      setNewKey(j.key ?? null);
      setLabel("");
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  async function revoke(hashPrefix: string, kLabel: string) {
    if (!confirm(`Revoke key "${kLabel}" (${hashPrefix})? MCP clients using it will stop working.`)) return;
    await fetch(`/api/api-keys?hash=${encodeURIComponent(hashPrefix)}`, {
      method: "DELETE",
      credentials: "include",
    });
    await refresh();
  }

  async function upgradeToPro() {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ product: "PRO" }),
    });
    const j = (await res.json()) as { url?: string; error?: string };
    if (j.url) window.location.href = j.url;
    else setError(j.error ?? "checkout failed");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm opacity-80">
        Tier:{" "}
        <span style={{ color: session?.isPro ? "#ffb000" : "#39ff14", textShadow: `0 0 4px ${session?.isPro ? "#ffb000" : "#39ff14"}` }}>
          {session?.isPro ? "PRO" : "FREE"}
        </span>
        {" · "}
        {session?.isPro
          ? "unlimited scans, all artifacts, audits, projects"
          : `${session?.freeScansRemaining ?? "?"} / ${session?.freeScansPerMonth ?? "?"} free scans this month`}
      </div>

      {/* Pro upgrade banner for free users */}
      {!session?.isPro && (
        <div
          className="border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "rgba(255,176,0,0.5)", background: "rgba(255,176,0,0.05)" }}
        >
          <div className="flex flex-col gap-1">
            <div
              className="uppercase tracking-widest"
              style={{ fontFamily: "var(--font-press-start-2p), monospace", fontSize: 11, color: "#ffb000", textShadow: "0 0 6px #ffb000" }}
            >
              ▸ UPGRADE TO PRO · $9/MO
            </div>
            <div className="text-[13px] opacity-75">
              Unlocks deep audit, shippable artifacts, unlimited scans, private repo support
            </div>
          </div>
          <button
            onClick={upgradeToPro}
            className="px-4 py-2 border uppercase tracking-widest shrink-0"
            style={{ borderColor: "#ffb000", color: "#ffb000", background: "rgba(0,0,0,0.6)", fontSize: 12, textShadow: "0 0 4px #ffb000" }}
          >
            UPGRADE NOW →
          </button>
        </div>
      )}

      {/* Create new */}
      <div
        className="border p-3 flex gap-2 flex-wrap"
        style={{ borderColor: "rgba(57,255,20,0.4)", background: "rgba(0,0,0,0.5)" }}
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="key label (e.g. 'claude code on laptop')"
          spellCheck={false}
          className="flex-1 min-w-[200px] bg-transparent border-none outline-none"
          style={{
            color: "#39ff14",
            fontFamily: "var(--font-vt323), monospace",
            fontSize: 16,
            textShadow: "0 0 4px #39ff14",
          }}
          onKeyDown={(e) => { if (e.key === "Enter") void create(); }}
        />
        <button
          onClick={create}
          disabled={!label.trim() || creating}
          className="px-3 py-1.5 border uppercase tracking-widest disabled:opacity-40"
          style={{
            borderColor: "#39ff14",
            color: "#39ff14",
            background: "rgba(0,0,0,0.5)",
            fontSize: 12,
            textShadow: "0 0 4px #39ff14",
          }}
        >
          {creating ? "CREATING…" : "+ NEW KEY"}
        </button>
      </div>

      {/* One-time secret display */}
      {newKey && (
        <div
          className="border p-3 flex flex-col gap-2"
          style={{ borderColor: "#ffb000", background: "rgba(255,176,0,0.06)", color: "#ffb000" }}
        >
          <div
            className="uppercase tracking-widest"
            style={{ fontFamily: "var(--font-press-start-2p), monospace", fontSize: 11 }}
          >
            ▸ COPY THIS NOW — IT WON&apos;T BE SHOWN AGAIN
          </div>
          <pre
            className="text-xs p-2 border bg-black/70 break-all whitespace-pre-wrap"
            style={{
              borderColor: "rgba(255,176,0,0.5)",
              fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
              color: "#ffb000",
            }}
          >
            {newKey}
          </pre>
          <button
            onClick={() => { void navigator.clipboard.writeText(newKey); }}
            className="self-start px-3 py-1.5 border uppercase tracking-widest text-xs"
            style={{ borderColor: "#ffb000", color: "#ffb000", background: "rgba(0,0,0,0.6)" }}
          >
            COPY KEY
          </button>
          <button
            onClick={() => setNewKey(null)}
            className="self-start text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100"
            style={{ color: "#ffb000" }}
          >
            i&apos;ve saved it — hide
          </button>
        </div>
      )}

      {error && (
        <div
          className="px-3 py-2 border text-sm"
          style={{ borderColor: "#ff007f", color: "#ff007f", background: "rgba(255,0,127,0.06)" }}
        >
          ! {error}
        </div>
      )}

      {/* Existing keys */}
      {keys === null ? (
        <div className="opacity-60 text-sm">loading keys…</div>
      ) : keys.length === 0 ? (
        <div
          className="border p-6 text-center opacity-80"
          style={{ borderColor: "rgba(57,255,20,0.25)", background: "rgba(0,0,0,0.45)" }}
        >
          No keys yet. Name one above and hit + NEW KEY to wire the MCP up.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {keys.map((k) => (
            <li
              key={k.hashPrefix}
              className="border px-3 py-2 flex items-center justify-between gap-2 flex-wrap"
              style={{ borderColor: "rgba(57,255,20,0.35)", background: "rgba(57,255,20,0.03)" }}
            >
              <div className="flex-1 min-w-[200px] flex flex-col gap-0.5">
                <span style={{ color: "#39ff14", fontSize: 16, textShadow: "0 0 4px #39ff14" }}>
                  {k.label}
                </span>
                <span className="text-[11px] opacity-50 uppercase tracking-widest">
                  sk_…{k.hashPrefix} · created {shortAgo(k.createdAt)} · last used {shortAgo(k.lastUsedAt)}
                </span>
              </div>
              <button
                onClick={() => revoke(k.hashPrefix, k.label)}
                className="text-[11px] opacity-50 hover:opacity-90 uppercase tracking-widest"
                style={{ color: "#ff007f" }}
              >
                revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
