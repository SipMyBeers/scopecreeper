"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

const GREEN = "#39ff14";
const PINK = "#ff007f";
const CYAN = "#5cb8ff";
const AMBER = "#ffb000";

const VT: CSSProperties = { fontFamily: "var(--font-vt323), monospace" };
const MONO: CSSProperties = { fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" };
const PIXEL: CSSProperties = { fontFamily: "var(--font-press-start-2p), monospace" };

function H2({ children, color = GREEN, id }: { children: React.ReactNode; color?: string; id?: string }) {
  return (
    <h2
      id={id}
      style={{
        ...PIXEL,
        fontSize: 13,
        letterSpacing: "0.18em",
        color,
        textShadow: `0 0 6px ${color}`,
        marginTop: 36,
        marginBottom: 12,
      }}
    >
      ▸ {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ ...VT, fontSize: 18, lineHeight: 1.45, opacity: 0.92, marginTop: 8 }}>
      {children}
    </p>
  );
}

function Code({ children, color = GREEN }: { children: React.ReactNode; color?: string }) {
  return (
    <code
      style={{
        ...MONO,
        background: "rgba(57,255,20,0.08)",
        padding: "1px 5px",
        border: `1px solid ${color}40`,
        fontSize: "0.9em",
        color,
      }}
    >
      {children}
    </code>
  );
}

function Terminal({ lines, accent = GREEN }: { lines: string[]; accent?: string }) {
  return (
    <pre
      style={{
        ...MONO,
        fontSize: 12,
        lineHeight: 1.5,
        background: "rgba(0,0,0,0.7)",
        border: `1px solid ${accent}50`,
        padding: "14px 16px",
        marginTop: 12,
        marginBottom: 4,
        color: "#cce5cc",
        whiteSpace: "pre-wrap",
        overflowX: "auto",
        boxShadow: `0 0 16px ${accent}20 inset`,
      }}
    >
      {lines.join("\n")}
    </pre>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      style={{
        ...MONO,
        fontSize: 11,
        background: "transparent",
        border: `1px solid ${PINK}80`,
        color: PINK,
        padding: "4px 10px",
        cursor: "pointer",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        textShadow: `0 0 4px ${PINK}`,
      }}
    >
      {copied ? "✓ copied" : "copy"}
    </button>
  );
}

function InstallBlock() {
  const cmd = "npm install -g @scopecreeper/tui";
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <code
          style={{
            ...MONO,
            fontSize: 16,
            background: "rgba(0,0,0,0.85)",
            border: `1px solid ${GREEN}80`,
            padding: "12px 18px",
            color: GREEN,
            textShadow: `0 0 6px ${GREEN}`,
            flex: "1 1 auto",
            minWidth: 280,
          }}
        >
          $ {cmd}
        </code>
        <CopyBtn text={cmd} />
      </div>
      <P>then run <Code>creeper init &lt;your-repo&gt;</Code> and you&apos;re live.</P>
    </div>
  );
}

function CTAButton({ href, label, color = PINK, external }: { href: string; label: string; color?: string; external?: boolean }) {
  const sharedStyle: CSSProperties = {
    ...PIXEL,
    fontSize: 11,
    display: "inline-block",
    padding: "12px 20px",
    border: `1px solid ${color}`,
    color,
    background: "rgba(0,0,0,0.7)",
    textShadow: `0 0 6px ${color}`,
    letterSpacing: "0.18em",
    textDecoration: "none",
  };
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={sharedStyle}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} style={sharedStyle}>
      {label}
    </Link>
  );
}

const FEATURES: { glyph: string; text: string }[] = [
  { glyph: "✚", text: "Per-commit drift score (0–100) against your declared scope" },
  { glyph: "⌥", text: "Per-repo sparkline showing whether you're drifting up or down" },
  { glyph: "○", text: "macOS notifications that fire only when it actually matters" },
  { glyph: "▸", text: "Action picker with REDIRECT / EXPAND / KILL / ACCEPT routes" },
  { glyph: "✎", text: "Auto-maintained diary Claude / Cursor can read on next session" },
  { glyph: "⚙", text: "Live tail of any active Claude Code session (press w)" },
  { glyph: "✗", text: "KILL artifact: one-page brutal autopsy of any branch (press k)" },
  { glyph: "$", text: "8.6 MB RAM total, scales to dozens of repos" },
];

export default function BecomeLanding() {
  return (
    <main
      style={{
        ...VT,
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top, #0a0612 0%, #050308 60%, #000 100%)",
        color: "#e8ffe8",
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 28,
        paddingBottom: 56,
      }}
    >
      {/* nav */}
      <nav
        style={{
          maxWidth: 880,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${GREEN}30`,
          paddingBottom: 12,
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <Link
          href="/"
          style={{
            ...PIXEL,
            fontSize: 11,
            color: PINK,
            textShadow: `0 0 6px ${PINK}`,
            letterSpacing: "0.25em",
            textDecoration: "none",
          }}
        >
          🌀 SCOPE CREEPER
        </Link>
        <div style={{ display: "flex", gap: 18, fontSize: 14, opacity: 0.85 }}>
          <Link href="#install" style={{ color: GREEN }}>install</Link>
          <Link href="#loop" style={{ color: GREEN }}>the loop</Link>
          <Link href="/scan" style={{ color: GREEN }}>arcade demo</Link>
          <Link href="/github-app" style={{ color: GREEN }}>github app</Link>
          <Link href="/blog/mcp-launch" style={{ color: GREEN }}>mcp</Link>
          <a href="https://github.com/SipMyBeers/scopecreeper" target="_blank" rel="noreferrer" style={{ color: GREEN }}>
            github
          </a>
        </div>
      </nav>

      <article style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* hero */}
        <div style={{ textAlign: "left", marginBottom: 16 }}>
          <div
            style={{
              ...PIXEL,
              fontSize: 10,
              letterSpacing: "0.3em",
              color: GREEN,
              opacity: 0.6,
              marginBottom: 12,
            }}
          >
            v0.1 · LIVE TODAY
          </div>
          <h1
            style={{
              ...PIXEL,
              fontSize: "clamp(28px, 6vw, 56px)",
              lineHeight: 1.15,
              color: PINK,
              textShadow: `0 0 12px ${PINK}`,
              margin: 0,
            }}
          >
            BECOME A
            <br />
            SCOPE CREEPER
          </h1>
          <P>
            A watcher for the work you ship with AI. Lives in the background.
            Knocks on your door only when your repo is drifting from what
            you said you&apos;d build.
          </P>
          <P>
            Cursor agrees with everything. Claude Code says yes to features
            you don&apos;t need. Two hours in, you&apos;ve half-built three
            things you&apos;ll abandon next week. Scope Creeper is the second
            pair of eyes your AI doesn&apos;t have.
          </P>
        </div>

        <InstallBlock />

        <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
          <CTAButton href="#install" label="▸ START HERE" />
          <CTAButton href="https://github.com/SipMyBeers/scopecreeper" label="github →" color={GREEN} external />
          <CTAButton href="/scan" label="try the arcade" color={CYAN} />
        </div>

        {/* the problem */}
        <H2 color={AMBER}>The problem AI created</H2>
        <P>
          You don&apos;t have a capability problem anymore. You have a
          judgment problem. The AI ships anything you ask. It never says
          &quot;this is dumb&quot; or &quot;you&apos;re avoiding the real
          work.&quot; It just builds.
        </P>
        <Terminal accent={AMBER} lines={[
          "  Mon  10:14   commit · add post-call CRM auto-write loop      ✓ in scope",
          "  Mon  11:48   commit · scaffold billing dashboard             ✗ drift",
          "  Mon  14:02   commit · add referral system                    ✗ drift",
          "  Mon  15:30   commit · add team-management role table         ✗ drift",
          "  Mon  17:14   commit · refactor auth (rebuild)                ✗ drift",
          "                                                                       ",
          "  → 5 commits, 4 in feature graveyard by Friday                       ",
        ]} />

        {/* the loop */}
        <H2 color={GREEN}>The loop, in five moves</H2>

        <Terminal accent={GREEN} lines={[
          "  1.  daemon          rust binary, 10 MB ram, watches every repo",
          "  2.  every commit    scored against your .scopecreeper.md",
          "  3.  drift detected  fires a macOS notification",
          "  4.  action picker   you pick a route, each ranked by creep score",
          "  5.  diary           per-repo .scopecreeper-diary.md, claude reads it",
        ]} />

        <H2 color={PINK}>What the action picker looks like</H2>
        <Terminal accent={PINK} lines={[
          "  ▸ DRIFT · pick a route                       dittomethis #a3f7c2",
          "                                                                  ",
          "  adds apps/web/billing/page.tsx                                  ",
          "  73/100  ABYSS  ·  SCOPE EXPANDS UNCONTROLLABLY                  ",
          "                                                                  ",
          "  ▸ REDIRECT   ▓░░░░░░░░░  15/100   ★ recommended                 ",
          "       copy a 'stop drifting' prompt to clipboard → paste into AI ",
          "                                                                  ",
          "    EXPAND     ▓▓▓▓▓▓▓▓▓░  88/100                                 ",
          "       add this feature to .scopecreeper.md (legitimize)          ",
          "                                                                  ",
          "    KILL       ░░░░░░░░░░   0/100                                 ",
          "       generate the autopsy artifact for the drifty branch       ",
          "                                                                  ",
          "    ACCEPT     ▓▓▓▓▓▓▓░░░  73/100                                 ",
          "       keep it, log a justification, scope unchanged              ",
          "                                                                  ",
          "  ↑↓ select · enter confirm · esc dismiss                          ",
        ]} />
        <P>
          Every route is scored so you can rank them. The recommended option
          is whichever creeps your project the least. Pick. Tool acts.
          Decision is appended to <Code>.scopecreeper-diary.md</Code>.
        </P>

        <H2 color={CYAN}>The diary is your committed past</H2>
        <P>
          Each decision lands in a markdown file at the repo root. This
          file becomes the source of truth Claude reads next session, so
          it stops re-suggesting things you already rejected.
        </P>
        <Terminal accent={CYAN} lines={[
          "# Scope Creeper Diary · dittomethis",
          "",
          "## 2026-05-24 16:32 · REDIRECT · drift 73 → 15",
          "**Commit:** `a3f7c2` — adds billing dashboard",
          "**Verdict:** SCOPE EXPANDS UNCONTROLLABLY",
          "**Why drift:** apps/web/billing/* not in .scopecreeper.md",
          "**Note:** redirect prompt copied to clipboard",
          "",
          "## 2026-05-23 09:15 · ACCEPT · drift 52 → 52",
          "**Commit:** `b8e991` — adds post-call CRM write loop",
          "**Verdict:** SCOPE EXPANDS UNCONTROLLABLY",
          "**Why drift:** related to scope but not yet declared",
          "**Note:** accepted on purpose — add to in-flight tomorrow",
        ]} />

        {/* install */}
        <H2 color={GREEN} id="install">Install in 60 seconds</H2>
        <Terminal accent={GREEN} lines={[
          "# 1. install the cli",
          "$ npm install -g @scopecreeper/tui",
          "",
          "# 2. bootstrap a scope doc for any repo",
          "$ creeper init ~/your-repo",
          "  ✓ wrote ~/your-repo/.scopecreeper.md",
          "",
          "# 3. install the drift check on every commit",
          "$ creeper install-hook ~/your-repo",
          "  ✓ installed pre-commit hook",
          "",
          "# 4. start the background watcher",
          "$ creeper daemon &",
          "  [creeper] using native daemon: /opt/homebrew/bin/creeperd",
          "  watching 1 repo · 8.6 MB ram",
        ]} />

        <H2 color={AMBER}>What you actually get</H2>
        <div style={{ marginTop: 12 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
              <span style={{ color: GREEN, width: 16, textShadow: `0 0 4px ${GREEN}` }}>{f.glyph}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <H2 color={PINK} id="loop">Stop watching the AI build for you.</H2>
        <P>
          Start watching what you both shipped. Become the scope creeper of
          your own work. It&apos;s the first useful thing AI tools can do
          for you: warn you when they&apos;ve made you drift.
        </P>

        <InstallBlock />

        <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
          <CTAButton href="https://github.com/SipMyBeers/scopecreeper" label="GITHUB →" external />
          <CTAButton href="/scan" label="try the web demo" color={CYAN} />
          <CTAButton href="/github-app" label="github app" color={GREEN} />
          <CTAButton href="/blog/mcp-launch" label="claude code mcp" color={AMBER} />
        </div>

        {/* footer */}
        <footer
          style={{
            marginTop: 56,
            paddingTop: 16,
            borderTop: `1px solid ${GREEN}30`,
            fontSize: 11,
            opacity: 0.55,
            letterSpacing: "0.2em",
            ...PIXEL,
          }}
        >
          <Link href="/" style={{ color: GREEN }}>▸ BECOME ONE</Link>
          {"  ·  "}
          <Link href="/about" style={{ color: GREEN }}>about</Link>
          {"  ·  "}
          <Link href="/faq" style={{ color: GREEN }}>faq</Link>
          {"  ·  "}
          <Link href="/board" style={{ color: GREEN }}>leaderboard</Link>
          {"  ·  "}
          <a href="https://github.com/SipMyBeers/scopecreeper" target="_blank" rel="noreferrer" style={{ color: GREEN }}>
            source
          </a>
        </footer>
      </article>
    </main>
  );
}
