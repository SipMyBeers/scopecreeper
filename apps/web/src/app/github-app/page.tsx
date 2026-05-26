import type { Metadata } from "next";
import Link from "next/link";

export const runtime = "edge";

const TITLE = "Scope Creeper for GitHub";
const DESC =
  "Add Scope Creeper as a GitHub App. Type `/scope-creeper` in any PR to get a creep score against your repo's declared scope, the top drift findings, and one-click KILL or SHIPPABLE artifacts. No PR-comment spam.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "https://scopecreeper.ai/github-app" },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: "https://scopecreeper.ai/github-app",
    siteName: "Scope Creeper",
    images: ["/og/root.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    images: ["/og/root.png"],
  },
};

const INSTALL_URL = "https://github.com/apps/scope-creeper";

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2
      id={id}
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

export default function GithubAppPage() {
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
            <Link href="/faq" style={{ color: "#39ff14" }}>faq</Link>
          </nav>
        </header>

        <div className="text-[11px] opacity-50 uppercase tracking-[0.3em] mb-1">
          GITHUB APP · DRIFT BOT
        </div>

        <h1
          style={{
            fontFamily: "var(--font-press-start-2p), monospace",
            fontSize: "clamp(20px, 3.6vw, 30px)",
            lineHeight: 1.25,
            color: "#ff007f",
            textShadow: "0 0 10px #ff007f",
          }}
        >
          A SECOND OPINION ON EVERY PR.
          <br />
          ONLY WHEN YOU ASK.
        </h1>

        <P>
          Scope Creeper for GitHub is a manually-triggered drift auditor.
          You type <Code>/scope-creeper</Code> in any PR comment, and the
          bot replies with a creep score, the top 3 drift findings, and one-
          click links to materialize a <Code>KILL</Code> or <Code>SHIPPABLE</Code>{" "}
          artifact in the web app.
        </P>

        <P>
          No auto-comments. No PR-comment spam. The bot is invisible until
          you summon it. That&apos;s the entire design.
        </P>

        <div className="flex gap-2 mt-4">
          <a
            href={INSTALL_URL}
            className="px-4 py-2 border uppercase tracking-widest"
            style={{
              borderColor: "#ff007f",
              color: "#ff007f",
              background: "rgba(0,0,0,0.7)",
              textShadow: "0 0 6px #ff007f",
              fontSize: 14,
            }}
            target="_blank"
            rel="noreferrer"
          >
            ▸ INSTALL ON GITHUB
          </a>
          <Link
            href="/blog/built-in-public"
            className="px-4 py-2 border uppercase tracking-widest"
            style={{
              borderColor: "rgba(57,255,20,0.5)",
              color: "#39ff14",
              background: "rgba(0,0,0,0.5)",
              textShadow: "0 0 4px #39ff14",
              fontSize: 14,
            }}
          >
            engineering notes
          </Link>
        </div>

        <H2>How it works</H2>
        <P>
          On any pull request, leave a comment containing the trigger:
        </P>
        <Pre>{`/scope-creeper`}</Pre>
        <P>
          The bot reads three things — the PR description, the actual diff
          (summarized down to file changes), and the repo&apos;s declared
          scope (see below) — and writes back a comment like this:
        </P>
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
**Generate KILL artifact** · **Generate SHIPPABLE v0** · Re-run with /scope-creeper`}</Pre>

        <H2>Sharpen the audit with <Code>.scopecreeper.md</Code></H2>
        <P>
          Drop a <Code>.scopecreeper.md</Code> at your repo root declaring
          what your project IS and what it&apos;s NOT. The bot uses it as the
          canonical scope-of-truth — every PR gets diffed against it.
        </P>
        <Pre>{`# .scopecreeper.md

## What this project IS
- A local-first CRM for sales founders
- Voice-first practice + post-call transcription
- File-based org graph, MIT, no telemetry

## What this project is NOT
- A SaaS subscription product
- A team-management platform
- A general-purpose AI agent framework

## In-flight scope for next 30 days
- Adapter v2 for Google Places
- Whisper.cpp upgrade to 1.6
- Bulk-import CSV mapping UI

## Explicitly deferred
- Mobile app
- Multi-tenant team accounts
- Cloud-hosted variant`}</Pre>
        <P>
          Without this file, the bot falls back to your README. Without that,
          it scores conservatively and warns in the comment.
        </P>

        <H2>What it returns</H2>
        <ul className="list-disc pl-6 mt-3 space-y-1 opacity-90 text-base">
          <li><b>Creep score</b> (0-100) — how much this PR drifts from declared scope.</li>
          <li><b>Tier badge</b> — CORPSE / SWEETSPOT / ABYSS / DELUSION.</li>
          <li><b>Verdict</b> — a single terminal-style line.</li>
          <li><b>Expected vs actual</b> — one sentence each.</li>
          <li><b>Drift findings</b> — 2-5 specific items with severity (info / warn / high) and file-level evidence.</li>
          <li><b>One-click artifact links</b> — generate a <Code>KILL</Code> or <Code>SHIPPABLE</Code> in the Scope Creeper web app, pre-loaded with this PR&apos;s context.</li>
          <li><b>Status check</b> — auto-runs on PR open + new commits, adds a <Code>scope-creeper / drift: NN</Code> status next to your other CI checks.</li>
        </ul>

        <H2>When the bot does NOT comment</H2>
        <P>
          The bot is deliberately quiet. It comments only when you explicitly
          ask via <Code>/scope-creeper</Code>, OR on PR open / new commits to
          drop the status check. It will never:
        </P>
        <ul className="list-disc pl-6 mt-3 space-y-1 opacity-90 text-base">
          <li>Comment on every push.</li>
          <li>Comment on individual commits.</li>
          <li>Block your merge (status check is informational, not required).</li>
          <li>Read private repos you didn&apos;t grant access to.</li>
        </ul>

        <H2>Permissions requested</H2>
        <ul className="list-disc pl-6 mt-3 space-y-1 opacity-90 text-base">
          <li><b>Repository contents — read</b>: to fetch <Code>.scopecreeper.md</Code> + README.</li>
          <li><b>Pull requests — read &amp; write</b>: to post the audit comment.</li>
          <li><b>Issues — read &amp; write</b>: PRs are issues in GitHub&apos;s data model, same scope.</li>
          <li><b>Checks — read &amp; write</b>: for the status check on PR open / sync.</li>
        </ul>

        <H2>Pricing</H2>
        <P>
          Free for public repos. Pro ($9/mo) unlocks private repos and removes
          the per-installation rate limit. Same tier system as the rest of
          Scope Creeper — pair this with the{" "}
          <Link href="/account" style={{ color: "#39ff14" }}>
            Claude Code MCP
          </Link>{" "}
          and you have a creep auditor both inside your editor and inside
          every PR.
        </P>

        <footer className="mt-10 pt-4 border-t border-[#39ff14]/20 text-[11px] opacity-60 uppercase tracking-widest">
          <a href={INSTALL_URL} target="_blank" rel="noreferrer" style={{ color: "#ff007f" }}>
            ▸ INSTALL THE GITHUB APP
          </a>
          {" · "}
          <Link href="/" style={{ color: "#39ff14" }}>scan</Link>
          {" · "}
          <Link href="/about" style={{ color: "#39ff14" }}>about</Link>
          {" · "}
          <Link href="/board" style={{ color: "#39ff14" }}>board</Link>
        </footer>
      </article>
    </main>
  );
}
