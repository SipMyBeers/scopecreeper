import type { Metadata } from "next";
import Link from "next/link";
import { getCfEnv } from "@/lib/cf-env";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Hall of Delusion",
  description:
    "Public leaderboard of the most-delusional repos audited by Scope Creeper. Real file:line evidence, real scores, real shame.",
  alternates: { canonical: "https://scopecreeper.ai/board" },
  openGraph: {
    title: "Hall of Delusion · Scope Creeper",
    description: "Most-delusional public repos. File:line evidence. Real shame.",
    images: ["/og/root.png"],
    url: "https://scopecreeper.ai/board",
    siteName: "Scope Creeper",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hall of Delusion · Scope Creeper",
    description: "Most-delusional public repos. File:line evidence. Real shame.",
    images: ["/og/root.png"],
  },
};

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  list?: (opts: { prefix: string; limit?: number }) => Promise<{ keys: { name: string }[] }>;
}
interface Env {
  KV_LEADERBOARD?: KV;
}

function tierForScore(score: number): { label: string; color: string } {
  if (score >= 96) return { label: "DELUSION", color: "#ff007f" };
  if (score >= 71) return { label: "ABYSS",    color: "#ffb000" };
  if (score >= 31) return { label: "SWEETSPOT", color: "#39ff14" };
  return                  { label: "CORPSE",   color: "#888888" };
}

function timeAgo(ms: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default async function BoardPage() {
  const env = getCfEnv<Env>();
  const entries: LeaderboardEntry[] = env.KV_LEADERBOARD
    ? await getLeaderboard(env.KV_LEADERBOARD)
    : [];

  return (
    <main
      className="min-h-screen bg-black text-[#e8ffe8] px-4 py-10 md:py-14"
      style={{
        fontFamily: "var(--font-vt323), monospace",
        background:
          "radial-gradient(ellipse at top, #0a0612 0%, #050308 60%, #000 100%)",
      }}
    >
      <article className="max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex items-center justify-between flex-wrap gap-3 border-b border-[#39ff14]/30 pb-3">
          <Link
            href="/"
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              color: "#39ff14",
              textShadow: "0 0 6px #39ff14",
            }}
          >
            ◂ SCOPE CREEPER
          </Link>
          <nav className="flex gap-3 text-sm opacity-80">
            <Link href="/" style={{ color: "#39ff14" }}>scan</Link>
            <Link href="/projects" style={{ color: "#39ff14" }}>projects</Link>
            <Link href="/board" style={{ color: "#39ff14" }} aria-current="page">board</Link>
            <Link href="/about" style={{ color: "#39ff14" }}>about</Link>
            <Link href="/faq" style={{ color: "#39ff14" }}>faq</Link>
          </nav>
        </header>

        <div className="flex items-end justify-between flex-wrap gap-3">
          <h1
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: "clamp(20px, 3.4vw, 32px)",
              color: "#ff007f",
              textShadow: "0 0 10px #ff007f",
              letterSpacing: "0.04em",
            }}
          >
            HALL OF DELUSION
          </h1>
          <div className="text-sm opacity-70 uppercase tracking-widest">
            {entries.length} REPOS · LIVE FROM /api/audit
          </div>
        </div>

        <p className="text-base opacity-85 leading-snug">
          Every audit run by a Pro user lands here. Score is the weighted sum of
          TODO density, dead tests, debug spam, dependency rot, and secret
          leakage — every finding cites real file:line. Audit your own:
          {" "}<Link href="/" style={{ color: "#39ff14", textDecoration: "underline" }}>
            scopecreeper.ai
          </Link>.
        </p>

        {entries.length === 0 ? (
          <div
            className="border p-6 text-center opacity-80"
            style={{ borderColor: "rgba(57,255,20,0.3)", background: "rgba(0,0,0,0.55)" }}
          >
            No audits yet — be the first.{" "}
            <Link href="/" style={{ color: "#39ff14", textDecoration: "underline" }}>
              Run a deep-audit
            </Link>.
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {entries.map((e, i) => {
              const tier = tierForScore(e.delusionScore);
              return (
                <li
                  key={e.repo}
                  className="border px-3 py-2 flex items-center gap-3 flex-wrap"
                  style={{
                    borderColor: `${tier.color}40`,
                    background: `${tier.color}08`,
                  }}
                >
                  <span
                    className="opacity-50 w-8 text-right"
                    style={{
                      fontFamily: "var(--font-press-start-2p), monospace",
                      fontSize: 11,
                      color: "#39ff14",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div
                    className="leading-none w-20"
                    style={{
                      fontFamily: "var(--font-press-start-2p), monospace",
                      fontSize: 22,
                      color: tier.color,
                      textShadow: `0 0 6px ${tier.color}`,
                    }}
                  >
                    {String(e.delusionScore).padStart(3, "0")}
                  </div>
                  <span
                    className="uppercase tracking-widest text-xs w-20"
                    style={{ color: tier.color }}
                  >
                    {tier.label}
                  </span>
                  <a
                    href={`https://github.com/${e.repo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-[160px] underline truncate"
                    style={{
                      color: "#e8ffe8",
                      fontSize: 16,
                      textShadow: "0 0 4px #39ff14",
                    }}
                  >
                    {e.repo}
                  </a>
                  <span className="text-[11px] opacity-60 uppercase tracking-widest">
                    {e.findingCount} findings · {e.filesScanned} files · {timeAgo(e.scannedAt)}
                    {e.truncated ? " · partial" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <footer className="mt-6 pt-4 border-t border-[#39ff14]/20 text-[11px] opacity-60 uppercase tracking-widest">
          <Link href="/" style={{ color: "#39ff14" }}>
            ▸ AUDIT YOUR OWN REPO
          </Link>
          {" · "}
          <Link href="/about" style={{ color: "#39ff14" }}>about</Link>
          {" · "}
          <Link href="/faq" style={{ color: "#39ff14" }}>faq</Link>
        </footer>
      </article>
    </main>
  );
}
