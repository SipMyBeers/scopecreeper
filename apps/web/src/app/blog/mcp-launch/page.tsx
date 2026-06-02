import type { Metadata } from "next";
import Link from "next/link";

export const runtime = "edge";

const TITLE = "Scope Creeper for Claude Code · MCP server launch";
const DESC =
  "Install @scopecreeper/mcp in Claude Code. Give your AI agent the ability to ask another AI to kill your plan before you write code. Three tools: scan, kill, shippable.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "https://scopecreeper.ai/blog/mcp-launch" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: "https://scopecreeper.ai/blog/mcp-launch",
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

export default function McpLaunchPage() {
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
          LAUNCH · CLAUDE CODE MCP
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
          GIVE YOUR AI AGENT THE ABILITY
          <br />
          TO ASK ANOTHER AI TO KILL ITS PLAN
        </h1>

        <P>
          <Code>@scopecreeper/mcp</Code> is now on npm. It&apos;s a Model Context
          Protocol server that exposes eight Scope Creeper tools to Claude Code
          (or any MCP-speaking client): <Code>scan</Code>, <Code>kill</Code>,{" "}
          <Code>inbox</Code>, <Code>history</Code>, <Code>scope</Code>,{" "}
          <Code>patterns</Code>, <Code>audit</Code>, and <Code>shippable</Code>.
        </P>

        <P>
          The point: Claude is sycophantic by default. Ask it for a plan and
          you get a plan. Scope Creeper is the opposite — its{" "}
          <Code>kill</Code> tool returns a brutally honest one-page autopsy
          arguing why a project should NOT be built, with dated cutoff
          signals and a one-line eulogy. Install the MCP and your agent gains
          an adversarial second opinion it can invoke before writing a single
          line of code.
        </P>

        <H2>Install in 30 seconds</H2>
        <P>
          (Optional) generate an API key at{" "}
          <Link href="/account" style={{ color: "#39ff14" }}>
            scopecreeper.ai/account
          </Link>
          . Without a key the free tier still works — keys just identify your
          Pro entitlement.
        </P>
        <Pre>
{`claude mcp add scope-creeper -- npx -y @scopecreeper/mcp \\
  --api-key=sk_sc_live_YOUR_KEY`}
        </Pre>

        <H2>Eight tools</H2>
        <P>
          <Code>scope_creeper_scan(payload)</Code> — quick delusion score
          (0-100) + tier + verdict + 3-5 creep dimensions. Free tier.
        </P>
        <P>
          <Code>scope_creeper_kill(plan)</Code> — markdown autopsy with
          sunk-cost framing, dated cutoff signals, &quot;what to build
          instead&quot;, and a one-line eulogy. Free tier. This is the one
          that matters.
        </P>
        <P>
          <Code>scope_creeper_inbox(drain?)</Code> — reads pending drift
          events from the local daemon&apos;s inbox. Pass{" "}
          <Code>drain: true</Code> to mark them read. Free tier.
        </P>
        <P>
          <Code>scope_creeper_history(repo?, area?, sinceDays?)</Code> —
          query your past drift decisions. Useful for &quot;have I rejected
          this before?&quot; Free tier.
        </P>
        <P>
          <Code>scope_creeper_scope(repoPath)</Code> — reads{" "}
          <Code>.scopecreeper.md</Code> + the decision diary so Claude can
          ground recommendations in what you&apos;ve already declared.
          Free tier.
        </P>
        <P>
          <Code>scope_creeper_patterns(windowDays?)</Code> — surfaces
          behavioral patterns: what you keep expanding, what you keep
          avoiding, which repos are chronically in ABYSS. Free tier.
        </P>
        <P>
          <Code>scope_creeper_audit(repo)</Code> — deep code audit on a
          public GitHub repo: grep heuristics (secrets, TODO density, dead
          tests, dep age) + LLM narrative with file:line evidence. Pro tier
          ($9/mo).
        </P>
        <P>
          <Code>scope_creeper_shippable(plan)</Code> — 1-page PRD with a
          named stack, V0 scope (3-5 bullets), 3-4 acceptance criteria, and
          4-6 paste-runnable shell commands for the first 30 minutes of
          work. Pro tier ($9/mo).
        </P>

        <H2>The workflow</H2>
        <P>
          Before any big build, ask Claude Code:
        </P>
        <Pre>
{`> Use scope-creeper to KILL this plan before we start:
>   "Build a Notion competitor with AI, calendar, CRM, voice notes."`}
        </Pre>
        <P>
          Claude calls <Code>scope_creeper_kill</Code> and pastes back the
          autopsy. If the autopsy is convincing, you walked away cheap. If
          the plan survives the autopsy, ask for <Code>scope_creeper_shippable</Code>{" "}
          and get a paste-runnable v0 spec.
        </P>

        <H2>Why we built it</H2>
        <P>
          Scope Creeper started as a web tool. The web is good for discovery
          and the &quot;score my repo&quot; moment, but the actual decision
          to start building usually happens inside a chat — exactly where
          Claude Code lives. The MCP puts the adversarial second opinion at
          the moment of decision, not after.
        </P>
        <P>
          The whole package is 4.5KB on the wire, zero external dependencies
          beyond the official MCP SDK, no telemetry, and the API key (if you
          choose to use one) only authenticates — we never see your plan
          text outside the LLM call that produces the artifact.
        </P>

        <H2>Try it free, no key</H2>
        <P>
          Six tools work without authentication (subject to a per-IP rate
          limit): <Code>scan</Code>, <Code>kill</Code>, <Code>inbox</Code>,{" "}
          <Code>history</Code>, <Code>scope</Code>, and <Code>patterns</Code>.
          The Pro tier ($9/mo) unlocks <Code>audit</Code> and{" "}
          <Code>shippable</Code>, plus the web app (share links, projects,
          leaderboard).
        </P>

        <H2>Sources</H2>
        <ul className="list-disc pl-6 mt-3 space-y-1 opacity-90 text-base">
          <li>
            npm:{" "}
            <a
              href="https://www.npmjs.com/package/@scopecreeper/mcp"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#39ff14" }}
            >
              @scopecreeper/mcp
            </a>
          </li>
          <li>
            source:{" "}
            <a
              href="https://github.com/SipMyBeers/scopecreeper/tree/main/apps/mcp"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#39ff14" }}
            >
              github.com/SipMyBeers/scopecreeper/tree/main/apps/mcp
            </a>
          </li>
          <li>
            tier + key management:{" "}
            <Link href="/account" style={{ color: "#39ff14" }}>
              scopecreeper.ai/account
            </Link>
          </li>
          <li>
            engineering write-up:{" "}
            <Link
              href="/blog/built-in-public"
              style={{ color: "#39ff14" }}
            >
              /blog/built-in-public
            </Link>
          </li>
        </ul>

        <footer className="mt-10 pt-4 border-t border-[#39ff14]/20 text-[11px] opacity-60 uppercase tracking-widest">
          <Link href="/" style={{ color: "#39ff14" }}>▸ RUN A SCAN</Link>
          {" · "}
          <Link href="/board" style={{ color: "#39ff14" }}>board</Link>
          {" · "}
          <Link href="/account" style={{ color: "#39ff14" }}>account</Link>
        </footer>
      </article>
    </main>
  );
}
