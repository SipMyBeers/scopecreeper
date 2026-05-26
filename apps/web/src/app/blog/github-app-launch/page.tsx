import type { Metadata } from "next";
import Link from "next/link";

export const runtime = "edge";

const TITLE = "Scope Creeper for GitHub · a drift bot that doesn't comment on every push";
const DESC =
  "Install the Scope Creeper GitHub App. Type `/scope-creeper` in any PR to get a creep score, the top 3 drift findings, and one-click KILL or SHIPPABLE artifacts. No PR-comment spam.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "https://scopecreeper.ai/blog/github-app-launch" },
  // DRAFT — keep out of indexes until GitHub App is registered + a real install URL exists.
  robots: { index: false, follow: false },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: "https://scopecreeper.ai/blog/github-app-launch",
    siteName: "Scope Creeper",
    images: ["/og/root.png"],
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    images: ["/og/root.png"],
  },
};

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mt-8 mb-2 text-[#39ff14]"
      style={{
        fontFamily: "var(--font-press-start-2p), monospace",
        fontSize: 14,
        letterSpacing: "0.15em",
        textShadow: "0 0 6px #39ff14",
      }}
    >
      ▸ {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-base leading-relaxed opacity-90 mt-3">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
        background: "rgba(57,255,20,0.08)",
        padding: "1px 5px",
        border: "1px solid rgba(57,255,20,0.2)",
        fontSize: "0.92em",
        color: "#39ff14",
      }}
    >
      {children}
    </code>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre
      className="mt-3 mb-1 text-xs leading-snug whitespace-pre-wrap overflow-x-auto p-3 border"
      style={{
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
        borderColor: "rgba(57,255,20,0.3)",
        background: "rgba(0,0,0,0.55)",
        color: "#cce5cc",
      }}
    >
      {children}
    </pre>
  );
}

export default function GhAppLaunchPage() {
  return (
    <main
      className="min-h-screen bg-black text-[#e8ffe8] px-4 py-10 md:py-14"
      style={{
        fontFamily: "var(--font-vt323), monospace",
        background:
          "radial-gradient(ellipse at top, #0a0612 0%, #050308 60%, #000 100%)",
      }}
    >
      <article className="max-w-2xl mx-auto flex flex-col gap-2">
        <header className="flex items-center justify-between flex-wrap gap-3 border-b border-[#39ff14]/30 pb-3 mb-5">
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
            <Link href="/about" style={{ color: "#39ff14" }}>about</Link>
          </nav>
        </header>

        <div className="text-[11px] opacity-50 uppercase tracking-[0.3em] mb-1">
          LAUNCH · GITHUB APP
        </div>

        <h1
          style={{
            fontFamily: "var(--font-press-start-2p), monospace",
            fontSize: "clamp(20px, 3.6vw, 28px)",
            lineHeight: 1.25,
            color: "#ff007f",
            textShadow: "0 0 10px #ff007f",
          }}
        >
          A DRIFT BOT THAT DOESN&apos;T
          <br />
          COMMENT ON EVERY PUSH
        </h1>

        <P>
          The Scope Creeper GitHub App is live. It adds an adversarial
          second-opinion to every pull request — but only when you ask for
          one. Type <Code>/scope-creeper</Code> in any PR comment and the
          bot replies with a creep score, the top 3 drift findings, and
          one-click links to materialize a <Code>KILL</Code> or{" "}
          <Code>SHIPPABLE</Code> artifact in the web app.
        </P>

        <P>
          No auto-comments. No commit-by-commit nag. The bot is invisible
          until you summon it. That&apos;s the entire design.
        </P>

        <div className="flex gap-2 mt-4">
          <a
            href="https://github.com/apps/scope-creeper"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 border uppercase tracking-widest"
            style={{
              borderColor: "#ff007f",
              color: "#ff007f",
              background: "rgba(0,0,0,0.7)",
              textShadow: "0 0 6px #ff007f",
              fontSize: 14,
            }}
          >
            ▸ INSTALL ON GITHUB
          </a>
          <Link
            href="/github-app"
            className="px-4 py-2 border uppercase tracking-widest"
            style={{
              borderColor: "rgba(57,255,20,0.5)",
              color: "#39ff14",
              background: "rgba(0,0,0,0.5)",
              textShadow: "0 0 4px #39ff14",
              fontSize: 14,
            }}
          >
            full docs
          </Link>
        </div>

        <H2>Why most PR bots are wrong</H2>
        <P>
          The default mode for &quot;tool that audits PRs&quot; is: comment
          on every push, scream loudly, get uninstalled. Renovate, Sonar,
          CodeClimate, Snyk — all uninstalled at scale not because they&apos;re
          wrong but because they&apos;re noisy. PR-comment fatigue is real,
          and shipping our worst foot first would be self-defeating.
        </P>
        <P>
          Scope Creeper&apos;s GitHub App is built around the opposite
          assumption: the user knows when they want a second opinion.
          We just need to be summonable when they do.
        </P>

        <H2>The trigger</H2>
        <Pre>{`/scope-creeper`}</Pre>
        <P>
          Drop that string in any PR comment, and the bot reads three
          things — the PR description, the actual diff (summarized to file
          changes), and your repo&apos;s declared scope (see below) —
          then posts a single comment with the audit.
        </P>

        <H2>Sharpen the audit with <Code>.scopecreeper.md</Code></H2>
        <P>
          Drop a <Code>.scopecreeper.md</Code> at your repo root declaring
          what your project IS, what it&apos;s NOT, and what&apos;s in-flight
          right now. The bot uses it as the canonical scope-of-truth — every
          PR is diffed against it.
        </P>
        <Pre>
{`## What this project IS
- A local-first CRM for sales founders
- File-based org graph, MIT, no telemetry

## What this project is NOT
- A SaaS product
- A team-management platform

## In-flight (next 30 days)
- Adapter v2 for Google Places
- Whisper.cpp upgrade

## Explicitly deferred
- Mobile app
- Multi-tenant team accounts`}
        </Pre>
        <P>
          Without this file, the bot falls back to your README. Without
          that, it scores conservatively and warns in the comment.
        </P>

        <H2>What gets posted</H2>
        <Pre>{`## 🌀 Scope Creeper · PR drift audit

**Creep score:** \`073 / 100\` — **ABYSS**
**Verdict:** SCOPE EXPANDS UNCONTROLLABLY

**Expected:** A PR that adds the post-call CRM auto-write loop described in the README.
**Actual:** Adds the auto-write loop PLUS a new web dashboard, a billing page, and a referral system.

### Drift findings
- ■ **Dashboard never declared** — \`apps/web/dashboard/*\` is not mentioned in .scopecreeper.md
- ▲ **Billing page added silently** — \`apps/web/billing/*\` is a Pro-tier surface not in any prior PR/issue
- · **Referral system mid-PR** — appears mid-diff, no associated test

---
**Generate KILL artifact** · **Generate SHIPPABLE v0** · Re-run with /scope-creeper`}
        </Pre>

        <H2>What it does NOT do</H2>
        <ul className="list-disc pl-6 mt-3 space-y-1 opacity-90 text-base">
          <li>Comment on every push.</li>
          <li>Comment on individual commits.</li>
          <li>Block your merge (status check is informational, never required).</li>
          <li>Read repos you didn&apos;t grant access to.</li>
        </ul>

        <H2>Pricing</H2>
        <P>
          Free for public repos. Pro ($9/mo) unlocks private repos and lifts
          the per-installation rate limit. Same tier system as the rest of
          Scope Creeper — pairs naturally with the{" "}
          <Link href="/blog/mcp-launch" style={{ color: "#39ff14" }}>
            Claude Code MCP
          </Link>{" "}
          so you have a creep auditor inside your editor AND inside every PR.
        </P>

        <H2>Links</H2>
        <ul className="list-disc pl-6 mt-3 space-y-1 opacity-90 text-base">
          <li>
            install:{" "}
            <a href="https://github.com/apps/scope-creeper" target="_blank" rel="noreferrer" style={{ color: "#39ff14" }}>
              github.com/apps/scope-creeper
            </a>
          </li>
          <li>
            full docs:{" "}
            <Link href="/github-app" style={{ color: "#39ff14" }}>
              scopecreeper.ai/github-app
            </Link>
          </li>
          <li>
            engineering write-up:{" "}
            <Link href="/blog/built-in-public" style={{ color: "#39ff14" }}>
              /blog/built-in-public
            </Link>
          </li>
        </ul>

        <footer className="mt-10 pt-4 border-t border-[#39ff14]/20 text-[11px] opacity-60 uppercase tracking-widest">
          <Link href="/" style={{ color: "#39ff14" }}>▸ RUN A SCAN</Link>
          {" · "}
          <Link href="/board" style={{ color: "#39ff14" }}>board</Link>
          {" · "}
          <Link href="/github-app" style={{ color: "#39ff14" }}>github app docs</Link>
        </footer>
      </article>
    </main>
  );
}