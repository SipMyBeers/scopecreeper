import type { Metadata } from "next";
import Link from "next/link";
import AccountClient from "./AccountClient";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Account · API Keys",
  description:
    "Manage your Scope Creeper API keys for the Claude Code MCP server, CLI, and any non-browser client.",
  alternates: { canonical: "https://scopecreeper.ai/account" },
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <main
      className="min-h-screen bg-black text-[#e8ffe8] px-4 py-10 md:py-14"
      style={{
        fontFamily: "var(--font-vt323), monospace",
        background:
          "radial-gradient(ellipse at top, #0a0612 0%, #050308 60%, #000 100%)",
      }}
    >
      <article className="max-w-3xl mx-auto flex flex-col gap-5">
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
            <Link href="/board" style={{ color: "#39ff14" }}>board</Link>
            <Link href="/account" style={{ color: "#39ff14" }} aria-current="page">account</Link>
          </nav>
        </header>

        <h1
          style={{
            fontFamily: "var(--font-press-start-2p), monospace",
            fontSize: "clamp(20px, 3.6vw, 32px)",
            color: "#ff007f",
            textShadow: "0 0 10px #ff007f",
            letterSpacing: "0.04em",
          }}
        >
          ACCOUNT :: API KEYS
        </h1>

        <p className="text-base opacity-85 leading-snug">
          API keys authenticate the Scope Creeper MCP server (and any other
          non-browser client) against your account. Free + Pro tier limits
          apply identically — the key just identifies which session is
          calling. Treat keys like passwords; you only see them once.
        </p>

        <AccountClient />

        <section className="mt-4 pt-4 border-t border-[#39ff14]/20">
          <h2
            className="uppercase tracking-widest mb-2"
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 11,
              color: "#5cb8ff",
              textShadow: "0 0 6px #5cb8ff",
            }}
          >
            ▸ INSTALL THE MCP IN CLAUDE CODE
          </h2>
          <pre
            className="text-xs p-3 border whitespace-pre-wrap break-all"
            style={{
              borderColor: "rgba(92,184,255,0.4)",
              background: "rgba(0,0,0,0.55)",
              color: "#5cb8ff",
              fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
              lineHeight: 1.55,
            }}
          >
{`# add the Scope Creeper MCP server to your Claude Code config
claude mcp add scope-creeper -- npx -y @scopecreeper/mcp \\
  --api-key=sk_sc_live_YOUR_KEY_HERE

# then in Claude Code, before any big build, ask:
#   "use scope-creeper to kill or shippable this plan: ..."`}
          </pre>
          <p className="text-[11px] opacity-60 mt-2 uppercase tracking-widest">
            v0.1 exposes: scan · kill · shippable
          </p>
        </section>
      </article>
    </main>
  );
}
