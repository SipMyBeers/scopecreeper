"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import CreeperBackground from "./CreeperBackground";

const GREEN = "#39ff14";
const PINK = "#ff007f";
const CYAN = "#5cb8ff";
const AMBER = "#ffb000";
const PURPLE = "#a855f7";
const WHITE = "#e8ffe8";
const DIM = "#7a8e7a";

const VT: CSSProperties = { fontFamily: "var(--font-vt323), monospace" };
const MONO: CSSProperties = { fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" };
const PIXEL: CSSProperties = { fontFamily: "var(--font-press-start-2p), monospace" };

// A line of terminal output, color-coded by token type
type Tok =
  | string                           // plain dim text
  | { c: string; t: string; bold?: boolean }; // colored token

function TokLine({ tokens }: { tokens: Tok[] }) {
  return (
    <div>
      {tokens.map((tok, i) => {
        if (typeof tok === "string") {
          return <span key={i} style={{ color: DIM }}>{tok}</span>;
        }
        return (
          <span
            key={i}
            style={{
              color: tok.c,
              fontWeight: tok.bold ? 700 : 400,
              textShadow: `0 0 4px ${tok.c}80`,
            }}
          >
            {tok.t}
          </span>
        );
      })}
    </div>
  );
}

function Terminal({ children, accent = GREEN, title }: { children: ReactNode; accent?: string; title?: string }) {
  return (
    <div
      style={{
        ...MONO,
        fontSize: 12.5,
        lineHeight: 1.6,
        background: "linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.7))",
        border: `1px solid ${accent}55`,
        marginTop: 14,
        marginBottom: 8,
        position: "relative",
        boxShadow: `0 0 30px ${accent}18, inset 0 0 24px ${accent}08`,
        animation: "creeper-pulse-border 4s ease-in-out infinite",
      }}
    >
      {/* fake titlebar with traffic lights */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderBottom: `1px solid ${accent}30`,
          background: `linear-gradient(180deg, ${accent}12, transparent)`,
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: 9, background: PINK, boxShadow: `0 0 6px ${PINK}` }} />
        <span style={{ width: 9, height: 9, borderRadius: 9, background: AMBER, boxShadow: `0 0 6px ${AMBER}` }} />
        <span style={{ width: 9, height: 9, borderRadius: 9, background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: DIM, letterSpacing: "0.15em" }}>
          {title ?? "creeper · live"}
        </span>
      </div>
      <div style={{ padding: "12px 16px", color: DIM }}>
        {children}
      </div>
      {/* scanline overlay */}
      <div
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(255,255,255,0.025) 3px, rgba(0,0,0,0) 4px)",
        }}
      />
    </div>
  );
}

function SectionTag({ children, color }: { children: ReactNode; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 44, marginBottom: 14 }}>
      <div
        style={{
          width: 6,
          height: 28,
          background: `linear-gradient(180deg, ${color}, transparent)`,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
      <h2
        style={{
          ...PIXEL,
          fontSize: 13,
          letterSpacing: "0.18em",
          color,
          textShadow: `0 0 8px ${color}`,
          margin: 0,
        }}
      >
        ▸ {children}
      </h2>
      <div
        style={{
          flex: 1,
          height: 1,
          background: `linear-gradient(90deg, ${color}, transparent)`,
          animation: "creeper-section-bar 8s linear infinite",
          backgroundSize: "200% 100%",
        }}
      />
    </div>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p style={{ ...VT, fontSize: 19, lineHeight: 1.45, color: WHITE, opacity: 0.92, marginTop: 8 }}>
      {children}
    </p>
  );
}

function Code({ children, color = GREEN }: { children: ReactNode; color?: string }) {
  return (
    <code
      style={{
        ...MONO,
        background: `${color}14`,
        padding: "1px 6px",
        border: `1px solid ${color}40`,
        fontSize: "0.92em",
        color,
        textShadow: `0 0 4px ${color}80`,
      }}
    >
      {children}
    </code>
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
        background: copied ? PINK : "transparent",
        border: `1px solid ${PINK}`,
        color: copied ? "#000" : PINK,
        padding: "6px 14px",
        cursor: "pointer",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        textShadow: copied ? "none" : `0 0 4px ${PINK}`,
        transition: "all 0.15s",
        fontWeight: 700,
      }}
    >
      {copied ? "✓ copied" : "copy"}
    </button>
  );
}

function InstallBlock() {
  const cmd = "npm install -g @scopecreeper/tui";
  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" }}>
        <code
          style={{
            ...MONO,
            fontSize: 17,
            background: "linear-gradient(180deg, rgba(0,0,0,0.95), rgba(20,30,15,0.95))",
            border: `2px solid ${GREEN}`,
            padding: "16px 20px",
            color: GREEN,
            textShadow: `0 0 8px ${GREEN}`,
            flex: "1 1 auto",
            minWidth: 280,
            position: "relative",
            boxShadow: `0 0 20px ${GREEN}40, inset 0 0 12px ${GREEN}15`,
          }}
        >
          <span style={{ color: AMBER, marginRight: 8 }}>$</span>{cmd}
        </code>
        <CopyBtn text={cmd} />
      </div>
      <P>then run <Code color={CYAN}>creeper init &lt;your-repo&gt;</Code> and you&apos;re live.</P>
    </div>
  );
}

function CTAButton({ href, label, color = PINK, external, intense }: { href: string; label: string; color?: string; external?: boolean; intense?: boolean }) {
  const sharedStyle: CSSProperties = {
    ...PIXEL,
    fontSize: 11,
    display: "inline-block",
    padding: "13px 22px",
    border: `1px solid ${color}`,
    color,
    background: intense ? `linear-gradient(135deg, ${color}25, transparent)` : "rgba(0,0,0,0.7)",
    textShadow: `0 0 8px ${color}`,
    letterSpacing: "0.18em",
    textDecoration: "none",
    boxShadow: intense ? `0 0 24px ${color}50, inset 0 0 12px ${color}20` : `0 0 12px ${color}30`,
    transition: "all 0.2s",
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

function LiveDot({ color = GREEN }: { color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: 8,
        background: color,
        boxShadow: `0 0 8px ${color}, 0 0 14px ${color}`,
        animation: "creeper-blink-dot 1.4s ease-in-out infinite",
        marginRight: 8,
      }}
    />
  );
}

const FEATURES: { glyph: string; color: string; text: string }[] = [
  { glyph: "✚", color: GREEN, text: "Per-commit drift score (0–100) against your declared scope" },
  { glyph: "⌥", color: CYAN, text: "Per-repo sparkline showing whether you're drifting up or down" },
  { glyph: "○", color: AMBER, text: "macOS notifications that fire only when it actually matters" },
  { glyph: "▸", color: PINK, text: "Action picker with REDIRECT / EXPAND / KILL / ACCEPT routes" },
  { glyph: "✎", color: PURPLE, text: "Auto-maintained diary Claude / Cursor can read on next session" },
  { glyph: "⚙", color: CYAN, text: "Live tail of any active Claude Code session (press w)" },
  { glyph: "✗", color: PINK, text: "KILL artifact: one-page brutal autopsy of any branch (press k)" },
  { glyph: "$", color: AMBER, text: "8.6 MB RAM total, scales to dozens of repos" },
];

export default function BecomeLanding() {
  return (
    <main
      style={{
        ...VT,
        minHeight: "100vh",
        background: "#000",
        color: WHITE,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 28,
        paddingBottom: 56,
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <CreeperBackground />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* nav */}
        <nav
          style={{
            maxWidth: 920,
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
              textShadow: `0 0 8px ${PINK}`,
              letterSpacing: "0.25em",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <LiveDot color={PINK} />
            SCOPE CREEPER
          </Link>
          <div style={{ display: "flex", gap: 18, fontSize: 14, opacity: 0.85, flexWrap: "wrap" }}>
            <Link href="#install" style={{ color: GREEN }}>install</Link>
            <Link href="#loop" style={{ color: CYAN }}>the loop</Link>
            <Link href="/scan" style={{ color: AMBER }}>arcade demo</Link>
            <Link href="/github-app" style={{ color: PURPLE }}>github app</Link>
            <Link href="/blog/mcp-launch" style={{ color: GREEN }}>mcp</Link>
            <a href="https://github.com/SipMyBeers/scopecreeper" target="_blank" rel="noreferrer" style={{ color: GREEN }}>
              github
            </a>
          </div>
        </nav>

        <article style={{ maxWidth: 920, margin: "0 auto" }}>
          {/* hero */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                ...PIXEL,
                fontSize: 10,
                letterSpacing: "0.3em",
                color: GREEN,
                opacity: 0.7,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
              }}
            >
              <LiveDot color={GREEN} />
              v0.1 · LIVE TODAY · 7 REPOS WATCHED
            </div>
            <h1
              style={{
                ...PIXEL,
                fontSize: "clamp(30px, 6.5vw, 60px)",
                lineHeight: 1.12,
                color: PINK,
                margin: 0,
                animation: "creeper-hero-rgb 3s ease-in-out infinite",
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

          <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
            <CTAButton href="#install" label="▸ START HERE" intense />
            <CTAButton href="https://github.com/SipMyBeers/scopecreeper" label="github →" color={GREEN} external />
            <CTAButton href="/scan" label="try the arcade" color={CYAN} />
          </div>

          {/* the problem */}
          <SectionTag color={AMBER}>The problem AI created</SectionTag>
          <P>
            You don&apos;t have a capability problem anymore. You have a
            judgment problem. The AI ships anything you ask. It never says
            &quot;this is dumb&quot; or &quot;you&apos;re avoiding the real
            work.&quot; It just builds.
          </P>
          <Terminal accent={AMBER} title="your week with cursor · last monday">
            <TokLine tokens={[
              { c: DIM, t: "  Mon  10:14  " },
              { c: CYAN, t: "commit" }, "  ", { c: WHITE, t: "add post-call CRM auto-write loop" },
              "  ", { c: GREEN, t: "✓ in scope", bold: true },
            ]} />
            <TokLine tokens={[
              { c: DIM, t: "  Mon  11:48  " },
              { c: CYAN, t: "commit" }, "  ", { c: WHITE, t: "scaffold billing dashboard" },
              "        ", { c: PINK, t: "✗ drift", bold: true },
            ]} />
            <TokLine tokens={[
              { c: DIM, t: "  Mon  14:02  " },
              { c: CYAN, t: "commit" }, "  ", { c: WHITE, t: "add referral system" },
              "               ", { c: PINK, t: "✗ drift", bold: true },
            ]} />
            <TokLine tokens={[
              { c: DIM, t: "  Mon  15:30  " },
              { c: CYAN, t: "commit" }, "  ", { c: WHITE, t: "add team-management role table" },
              "      ", { c: PINK, t: "✗ drift", bold: true },
            ]} />
            <TokLine tokens={[
              { c: DIM, t: "  Mon  17:14  " },
              { c: CYAN, t: "commit" }, "  ", { c: WHITE, t: "refactor auth (rebuild)" },
              "              ", { c: PINK, t: "✗ drift", bold: true },
            ]} />
            <TokLine tokens={[" "]} />
            <TokLine tokens={[
              { c: AMBER, t: "  → 5 commits, 4 in feature graveyard by Friday", bold: true },
            ]} />
          </Terminal>

          {/* the loop */}
          <SectionTag color={GREEN}>The loop, in five moves</SectionTag>
          <Terminal accent={GREEN} title="the system">
            <TokLine tokens={[
              { c: PINK, t: "  1.  " }, { c: GREEN, t: "daemon", bold: true },
              "          ", { c: WHITE, t: "rust binary, 10 MB ram, watches every repo" },
            ]} />
            <TokLine tokens={[
              { c: PINK, t: "  2.  " }, { c: CYAN, t: "every commit", bold: true },
              "    ", { c: WHITE, t: "scored against your " }, { c: AMBER, t: ".scopecreeper.md" },
            ]} />
            <TokLine tokens={[
              { c: PINK, t: "  3.  " }, { c: AMBER, t: "drift detected", bold: true },
              "  ", { c: WHITE, t: "fires a macOS notification" },
            ]} />
            <TokLine tokens={[
              { c: PINK, t: "  4.  " }, { c: PURPLE, t: "action picker", bold: true },
              "   ", { c: WHITE, t: "you pick a route, each ranked by creep score" },
            ]} />
            <TokLine tokens={[
              { c: PINK, t: "  5.  " }, { c: CYAN, t: "diary", bold: true },
              "           ", { c: WHITE, t: "per-repo " }, { c: AMBER, t: ".scopecreeper-diary.md" },
              { c: WHITE, t: ", claude reads it" },
            ]} />
          </Terminal>

          <SectionTag color={PINK}>What the action picker looks like</SectionTag>
          <Terminal accent={PINK} title="creeper · ? drain pending">
            <TokLine tokens={[
              { c: PINK, t: "  ▸ DRIFT · pick a route", bold: true },
              "                       ", { c: DIM, t: "dittomethis " }, { c: CYAN, t: "#a3f7c2" },
            ]} />
            <TokLine tokens={[" "]} />
            <TokLine tokens={[{ c: WHITE, t: "  adds apps/web/billing/page.tsx" }]} />
            <TokLine tokens={[
              { c: PINK, t: "  73/100", bold: true }, { c: DIM, t: "  " },
              { c: PINK, t: "ABYSS" }, { c: DIM, t: "  ·  " },
              { c: PINK, t: "SCOPE EXPANDS UNCONTROLLABLY", bold: true },
            ]} />
            <TokLine tokens={[" "]} />
            <TokLine tokens={[
              { c: PINK, t: "  ▸ REDIRECT   " },
              { c: GREEN, t: "▓░░░░░░░░░" }, { c: DIM, t: "  " }, { c: GREEN, t: "15/100", bold: true },
              { c: DIM, t: "   " }, { c: AMBER, t: "★ recommended", bold: true },
            ]} />
            <TokLine tokens={[{ c: DIM, t: "       copy a 'stop drifting' prompt to clipboard → paste into AI" }]} />
            <TokLine tokens={[" "]} />
            <TokLine tokens={[
              { c: DIM, t: "    EXPAND     " },
              { c: AMBER, t: "▓▓▓▓▓▓▓▓▓░" }, { c: DIM, t: "  " }, { c: AMBER, t: "88/100" },
            ]} />
            <TokLine tokens={[{ c: DIM, t: "       add this feature to .scopecreeper.md (legitimize)" }]} />
            <TokLine tokens={[" "]} />
            <TokLine tokens={[
              { c: DIM, t: "    KILL       " },
              { c: CYAN, t: "░░░░░░░░░░" }, { c: DIM, t: "   " }, { c: CYAN, t: "0/100" },
            ]} />
            <TokLine tokens={[{ c: DIM, t: "       generate the autopsy artifact for the drifty branch" }]} />
            <TokLine tokens={[" "]} />
            <TokLine tokens={[
              { c: DIM, t: "    ACCEPT     " },
              { c: PINK, t: "▓▓▓▓▓▓▓░░░" }, { c: DIM, t: "  " }, { c: PINK, t: "73/100" },
            ]} />
            <TokLine tokens={[{ c: DIM, t: "       keep it, log a justification, scope unchanged" }]} />
            <TokLine tokens={[" "]} />
            <TokLine tokens={[{ c: DIM, t: "  ↑↓ select · enter confirm · esc dismiss" }]} />
          </Terminal>
          <P>
            Every route is scored so you can rank them. The recommended option
            is whichever creeps your project the least. Pick. Tool acts.
            Decision is appended to <Code color={CYAN}>.scopecreeper-diary.md</Code>.
          </P>

          <SectionTag color={CYAN}>The diary is your committed past</SectionTag>
          <P>
            Each decision lands in a markdown file at the repo root. This
            file becomes the source of truth Claude reads next session, so
            it stops re-suggesting things you already rejected.
          </P>
          <Terminal accent={CYAN} title=".scopecreeper-diary.md">
            <TokLine tokens={[{ c: CYAN, t: "# Scope Creeper Diary · dittomethis", bold: true }]} />
            <TokLine tokens={[" "]} />
            <TokLine tokens={[
              { c: PURPLE, t: "## 2026-05-24 16:32 · " }, { c: GREEN, t: "REDIRECT", bold: true },
              { c: PURPLE, t: " · drift " }, { c: PINK, t: "73" }, { c: PURPLE, t: " → " }, { c: GREEN, t: "15" },
            ]} />
            <TokLine tokens={[{ c: WHITE, t: "**Commit:** " }, { c: CYAN, t: "`a3f7c2`" }, { c: WHITE, t: " — adds billing dashboard" }]} />
            <TokLine tokens={[{ c: WHITE, t: "**Verdict:** " }, { c: PINK, t: "SCOPE EXPANDS UNCONTROLLABLY" }]} />
            <TokLine tokens={[{ c: WHITE, t: "**Why drift:** apps/web/billing/* not in .scopecreeper.md" }]} />
            <TokLine tokens={[{ c: WHITE, t: "**Note:** redirect prompt copied to clipboard" }]} />
            <TokLine tokens={[" "]} />
            <TokLine tokens={[
              { c: PURPLE, t: "## 2026-05-23 09:15 · " }, { c: AMBER, t: "ACCEPT", bold: true },
              { c: PURPLE, t: " · drift " }, { c: AMBER, t: "52" }, { c: PURPLE, t: " → " }, { c: AMBER, t: "52" },
            ]} />
            <TokLine tokens={[{ c: WHITE, t: "**Commit:** " }, { c: CYAN, t: "`b8e991`" }, { c: WHITE, t: " — adds post-call CRM write loop" }]} />
            <TokLine tokens={[{ c: WHITE, t: "**Note:** accepted on purpose — add to in-flight tomorrow" }]} />
          </Terminal>

          {/* install */}
          <SectionTag color={GREEN}>Install in 60 seconds</SectionTag>
          <Terminal accent={GREEN} title="zsh · localhost">
            <TokLine tokens={[{ c: DIM, t: "# 1. install the cli" }]} />
            <TokLine tokens={[{ c: AMBER, t: "$ " }, { c: GREEN, t: "npm install -g " }, { c: PINK, t: "@scopecreeper/tui" }]} />
            <TokLine tokens={[" "]} />
            <TokLine tokens={[{ c: DIM, t: "# 2. bootstrap a scope doc for any repo" }]} />
            <TokLine tokens={[{ c: AMBER, t: "$ " }, { c: GREEN, t: "creeper init " }, { c: CYAN, t: "~/your-repo" }]} />
            <TokLine tokens={[{ c: GREEN, t: "  ✓ wrote " }, { c: CYAN, t: "~/your-repo/.scopecreeper.md" }]} />
            <TokLine tokens={[" "]} />
            <TokLine tokens={[{ c: DIM, t: "# 3. install the drift check on every commit" }]} />
            <TokLine tokens={[{ c: AMBER, t: "$ " }, { c: GREEN, t: "creeper install-hook " }, { c: CYAN, t: "~/your-repo" }]} />
            <TokLine tokens={[{ c: GREEN, t: "  ✓ installed pre-commit hook" }]} />
            <TokLine tokens={[" "]} />
            <TokLine tokens={[{ c: DIM, t: "# 4. start the background watcher" }]} />
            <TokLine tokens={[{ c: AMBER, t: "$ " }, { c: GREEN, t: "creeper daemon " }, { c: PURPLE, t: "&" }]} />
            <TokLine tokens={[{ c: DIM, t: "  [creeper] using native daemon: " }, { c: CYAN, t: "/opt/homebrew/bin/creeperd" }]} />
            <TokLine tokens={[{ c: DIM, t: "  watching 1 repo · " }, { c: GREEN, t: "8.6 MB ram" }]} />
          </Terminal>

          <SectionTag color={AMBER}>What you actually get</SectionTag>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "6px 0" }}>
                <span
                  style={{
                    color: f.color,
                    width: 20,
                    fontSize: 16,
                    textShadow: `0 0 6px ${f.color}`,
                    flexShrink: 0,
                  }}
                >
                  {f.glyph}
                </span>
                <span style={{ color: WHITE, fontSize: 17 }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* final CTA */}
          <SectionTag color={PINK}>Stop watching the AI build for you.</SectionTag>
          <P>
            Start watching what you both shipped. Become the scope creeper of
            your own work. It&apos;s the first useful thing AI tools can do
            for you: warn you when they&apos;ve made you drift.
          </P>

          <InstallBlock />

          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <CTAButton href="https://github.com/SipMyBeers/scopecreeper" label="GITHUB →" external intense />
            <CTAButton href="/scan" label="try the web demo" color={CYAN} />
            <CTAButton href="/github-app" label="github app" color={PURPLE} />
            <CTAButton href="/blog/mcp-launch" label="claude code mcp" color={AMBER} />
          </div>

          {/* footer */}
          <footer
            style={{
              marginTop: 60,
              paddingTop: 18,
              borderTop: `1px solid ${GREEN}30`,
              fontSize: 11,
              opacity: 0.6,
              letterSpacing: "0.2em",
              ...PIXEL,
            }}
          >
            <Link href="/" style={{ color: PINK }}>▸ BECOME ONE</Link>
            <span style={{ color: DIM }}>  ·  </span>
            <Link href="/about" style={{ color: GREEN }}>about</Link>
            <span style={{ color: DIM }}>  ·  </span>
            <Link href="/faq" style={{ color: CYAN }}>faq</Link>
            <span style={{ color: DIM }}>  ·  </span>
            <Link href="/board" style={{ color: AMBER }}>leaderboard</Link>
            <span style={{ color: DIM }}>  ·  </span>
            <a href="https://github.com/SipMyBeers/scopecreeper" target="_blank" rel="noreferrer" style={{ color: PURPLE }}>
              source
            </a>
          </footer>
        </article>
      </div>
    </main>
  );
}
