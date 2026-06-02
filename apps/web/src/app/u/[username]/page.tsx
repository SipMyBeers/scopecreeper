import type { Metadata } from "next";
import Link from "next/link";
import { getCfEnv } from "@/lib/cf-env";
import { scanUser, type UserScanEnv } from "@/lib/user-scan";
import type { UserProfileResult } from "@/core";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} · Scope Creeper Developer Profile`,
    description: `GitHub developer profile scan for @${username}. Delusion score, repo patterns, and building habits scored by Scope Creeper.`,
    alternates: { canonical: `https://scopecreeper.ai/u/${username}` },
    openGraph: {
      title: `@${username} · Developer Delusion Score`,
      description: `Scope Creeper scanned @${username}'s GitHub. See the score.`,
      url: `https://scopecreeper.ai/u/${username}`,
      siteName: "Scope Creeper",
      images: ["/og/root.png"],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `@${username} · Developer Delusion Score`,
      description: `Scope Creeper scanned @${username}'s GitHub. See the score.`,
      images: ["/og/root.png"],
    },
  };
}

function tierColor(tier: string): string {
  if (tier === "delusion") return "#ff007f";
  if (tier === "abyss") return "#ffb000";
  if (tier === "sweetspot") return "#39ff14";
  return "#888888";
}

function timeAgo(pushedAt: string | null): string {
  if (!pushedAt) return "unknown";
  const days = Math.floor((Date.now() - Date.parse(pushedAt)) / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function ProfileContent({ result }: { result: UserProfileResult }) {
  const color = tierColor(result.tier);
  const MONO = { fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" };
  const PIXEL = { fontFamily: "var(--font-press-start-2p), monospace" };
  const VT = { fontFamily: "var(--font-vt323), monospace" };
  const DIM = "#7a8e7a";
  const WHITE = "#e8ffe8";

  return (
    <article className="max-w-3xl mx-auto flex flex-col gap-5">
      {/* nav */}
      <header className="flex items-center justify-between flex-wrap gap-3 border-b border-[#39ff14]/30 pb-3">
        <Link
          href="/"
          style={{ ...PIXEL, fontSize: 10, color: "#39ff14", textShadow: "0 0 6px #39ff14", letterSpacing: "0.3em", textDecoration: "none" }}
        >
          ◂ SCOPE CREEPER
        </Link>
        <nav className="flex gap-3 text-sm opacity-80">
          <Link href="/scan" style={{ color: "#39ff14" }}>scan</Link>
          <Link href="/board" style={{ color: "#39ff14" }}>board</Link>
          <Link href="/about" style={{ color: "#39ff14" }}>about</Link>
        </nav>
      </header>

      {/* eyebrow */}
      <div style={{ ...PIXEL, fontSize: 10, opacity: 0.5, letterSpacing: "0.3em" }}>
        DEVELOPER PROFILE · github.com/{result.username}
      </div>

      {/* score hero */}
      <div>
        <div
          style={{
            ...PIXEL,
            fontSize: "clamp(48px,10vw,96px)",
            lineHeight: 1,
            color,
            textShadow: `0 0 30px ${color}80`,
            letterSpacing: "0.05em",
          }}
        >
          {String(result.delusionScore).padStart(3, "0")}
          <span style={{ fontSize: "clamp(20px,4vw,36px)", opacity: 0.6 }}> / 100</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
          <span
            style={{
              ...PIXEL,
              fontSize: 13,
              color,
              textShadow: `0 0 8px ${color}`,
              letterSpacing: "0.18em",
            }}
          >
            {result.tier.toUpperCase()}
          </span>
          <span style={{ ...MONO, fontSize: 12, color: DIM }}>
            {result.publicRepos} public repos · {result.analyzedCount} analyzed
          </span>
        </div>
      </div>

      {/* verdict + analysis */}
      <div>
        <div
          style={{
            ...PIXEL,
            fontSize: "clamp(14px,2.5vw,20px)",
            color: WHITE,
            textShadow: `0 0 6px ${color}40`,
            lineHeight: 1.3,
            letterSpacing: "0.08em",
          }}
        >
          {result.verdict}
        </div>
        {result.analysis && (
          <p style={{ ...VT, fontSize: 20, color: WHITE, opacity: 0.85, marginTop: 6 }}>
            {result.analysis}
          </p>
        )}
      </div>

      {/* patterns */}
      {result.patterns.length > 0 && (
        <div
          style={{
            ...MONO,
            background: "rgba(0,0,0,0.6)",
            border: `1px solid ${color}40`,
            padding: "14px 18px",
            boxShadow: `0 0 20px ${color}12`,
          }}
        >
          <div style={{ ...PIXEL, fontSize: 10, color, letterSpacing: "0.2em", marginBottom: 10 }}>
            ▸ PATTERNS DETECTED
          </div>
          {result.patterns.map((p, i) => (
            <div key={i} style={{ color: WHITE, fontSize: 14, lineHeight: 1.65, opacity: 0.9 }}>
              <span style={{ color, marginRight: 8 }}>▸</span>{p}
            </div>
          ))}
        </div>
      )}

      {/* top repos */}
      {result.topRepos.length > 0 && (
        <div>
          <div style={{ ...PIXEL, fontSize: 10, color: "#5cb8ff", letterSpacing: "0.2em", marginBottom: 10 }}>
            ▸ REPO BREAKDOWN
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {result.topRepos.slice(0, 10).map((r, i) => (
              <div
                key={i}
                style={{
                  ...MONO,
                  fontSize: 12,
                  display: "flex",
                  gap: 10,
                  padding: "6px 12px",
                  border: "1px solid rgba(92,184,255,0.18)",
                  background: "rgba(0,0,0,0.45)",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "#5cb8ff", fontWeight: 700, minWidth: 120, flexShrink: 0 }}>
                  {r.archived ? "[archived] " : ""}{r.name}
                </span>
                {r.language && (
                  <span style={{ color: "#ffb000", opacity: 0.8, flexShrink: 0 }}>{r.language}</span>
                )}
                {r.description && (
                  <span style={{ color: DIM, flex: 1, minWidth: 140 }}>
                    {r.description.slice(0, 60)}{r.description.length > 60 ? "…" : ""}
                  </span>
                )}
                <span style={{ color: DIM, flexShrink: 0, marginLeft: "auto" }}>
                  {r.stars > 0 && <span style={{ color: "#ffb000" }}>{r.stars}★ </span>}
                  {timeAgo(r.pushedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* viral CTA */}
      <div
        style={{
          marginTop: 16,
          padding: "20px 24px",
          border: "1px solid rgba(57,255,20,0.35)",
          background: "rgba(57,255,20,0.04)",
        }}
      >
        <div style={{ ...PIXEL, fontSize: 11, color: "#39ff14", letterSpacing: "0.18em", marginBottom: 10 }}>
          ▸ WHAT&apos;S YOUR SCORE?
        </div>
        <p style={{ ...VT, fontSize: 18, color: WHITE, opacity: 0.85, marginBottom: 14 }}>
          Drop your GitHub username in the scanner. Takes 3 seconds.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/scan"
            style={{
              ...PIXEL,
              fontSize: 11,
              display: "inline-block",
              padding: "12px 20px",
              border: "1px solid #39ff14",
              color: "#39ff14",
              background: "rgba(0,0,0,0.7)",
              textShadow: "0 0 8px #39ff14",
              letterSpacing: "0.18em",
              textDecoration: "none",
              boxShadow: "0 0 20px rgba(57,255,20,0.3), inset 0 0 10px rgba(57,255,20,0.08)",
            }}
          >
            ▸ SCAN @YOU
          </Link>
          <Link
            href="/board"
            style={{
              ...PIXEL,
              fontSize: 11,
              display: "inline-block",
              padding: "12px 20px",
              border: "1px solid rgba(57,255,20,0.4)",
              color: "#39ff14",
              background: "transparent",
              textShadow: "0 0 4px #39ff14",
              letterSpacing: "0.18em",
              textDecoration: "none",
              opacity: 0.75,
            }}
          >
            HALL OF DELUSION →
          </Link>
        </div>
      </div>

      {/* scanned-at footer */}
      <footer style={{ ...MONO, fontSize: 11, opacity: 0.4, letterSpacing: "0.15em" }}>
        SCANNED {new Date(result.scannedAt).toISOString().split("T")[0]} · CACHED 6H ·{" "}
        <Link href="/scan" style={{ color: "#39ff14" }}>RESCAN</Link>
      </footer>
    </article>
  );
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const env = getCfEnv<UserScanEnv>();

  const PIXEL = { fontFamily: "var(--font-press-start-2p), monospace" };

  let result: UserProfileResult | null = null;
  let errorMsg: string | null = null;

  try {
    result = await scanUser(username, env);
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "scan failed";
  }

  return (
    <main
      className="min-h-screen bg-black text-[#e8ffe8] px-4 py-10 md:py-14"
      style={{
        fontFamily: "var(--font-vt323), monospace",
        background: "radial-gradient(ellipse at top, #0a0612 0%, #050308 60%, #000 100%)",
      }}
    >
      {result ? (
        <ProfileContent result={result} />
      ) : (
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <Link
            href="/"
            style={{ ...PIXEL, fontSize: 10, color: "#39ff14", textShadow: "0 0 6px #39ff14", letterSpacing: "0.3em", textDecoration: "none" }}
          >
            ◂ SCOPE CREEPER
          </Link>
          <div style={{ ...PIXEL, fontSize: "clamp(20px,4vw,32px)", color: "#ff007f", textShadow: "0 0 10px #ff007f" }}>
            USER NOT FOUND
          </div>
          <p style={{ fontFamily: "var(--font-vt323), monospace", fontSize: 20, opacity: 0.8 }}>
            {errorMsg ?? `GitHub user @${username} not found or unavailable.`}
          </p>
          <Link
            href="/scan"
            style={{ ...PIXEL, fontSize: 11, color: "#39ff14", textDecoration: "none", letterSpacing: "0.2em" }}
          >
            ▸ BACK TO SCANNER
          </Link>
        </div>
      )}
    </main>
  );
}
