import type { Metadata } from "next";
import Link from "next/link";

export const runtime = "edge";

const TITLE = "I built an AI tool that tells me to stop building AI tools";
const DESC =
  "Scope Creeper's engineering write-up: why we use Llama 3.3 70B on Cloudflare Workers AI instead of Claude or GPT, how the deep-audit's hand-rolled tar parser fits in a 30s edge worker, the satori-on-edge fight, and the four leaf artifacts (KILL is the punchline).";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "https://scopecreeper.ai/blog/built-in-public" },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: "https://scopecreeper.ai/blog/built-in-public",
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

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="mt-8 mb-2 text-[#39ff14]"
      style={{
        fontFamily: "var(--font-press-start-2p), monospace",
        fontSize: 16,
        letterSpacing: "0.15em",
        textShadow: "0 0 6px #39ff14",
      }}
    >
      ▸ {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base leading-relaxed opacity-90 mt-3">{children}</p>
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

export default function BlogBuiltInPublicPage() {
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
          BUILT IN PUBLIC · ENGINEERING WRITE-UP
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
          I BUILT AN AI TOOL THAT TELLS ME
          <br />
          TO STOP BUILDING AI TOOLS
        </h1>

        <P>
          Scope Creeper is a diagnostic engine for builders who keep mistaking
          ambition for product. You drop in a GitHub repo URL, an AI chatlog,
          or one word; it returns a delusion score (0–100), a skill-tree of
          project paths your seed could grow into, and on-demand artifacts you
          can ship or paste into a real codebase. There is also a{" "}
          <Code>KILL</Code> artifact whose job is to tell you to stop.
        </P>

        <P>
          What follows is the engineering write-up I wish I&apos;d found before
          I started. Stack choices, the boring bits that ate three days, and
          the bits I&apos;m most proud of. Live at{" "}
          <a href="https://scopecreeper.ai" style={{ color: "#39ff14" }}>
            scopecreeper.ai
          </a>
          .
        </P>

        <H2>Why Llama 3.3 70B on Workers AI, not Claude or GPT</H2>
        <P>
          The single biggest decision. Two reasons.
        </P>
        <P>
          One — every &quot;wrap GPT-4 in a vibey UI&quot; product gets
          knee-capped the day OpenAI changes pricing or rotates a key. I
          wanted a stack with no external paid-API dependency for the core
          loop. Cloudflare Workers AI ships <Code>@cf/meta/llama-3.3-70b-instruct-fp8-fast</Code>{" "}
          on the same edge runtime as the rest of the app, free at the tier
          we&apos;re at. The latency is fine. The JSON-mode reliability is
          shaky but workable (more on that).
        </P>
        <P>
          Two — Llama 3.3 70B isn&apos;t as smart as Claude Opus on
          architectural reasoning, but it&apos;s plenty smart for what this
          product actually does: surfacing concrete project ideas from a
          fuzzy seed and writing a 1-page PRD with a stack and a 30-minute
          first cut. The intelligence delta matters less than the prompt
          engineering on top.
        </P>

        <H2>The JSON-mode &quot;newline in string&quot; gotcha</H2>
        <P>
          Workers AI&apos;s <Code>response_format: {`{`}type: &quot;json_object&quot;{`}`}</Code>{" "}
          returns structurally-valid JSON braces with one persistent flaw:
          the model emits literal{" "}
          <Code>\n</Code>
          {" "}characters inside string values, which is illegal per the JSON
          spec. <Code>JSON.parse</Code> rejects it. I wasted half a day
          chasing &quot;artifact generation failed&quot; before I wrote a
          tolerant parser that walks the response character-by-character and
          escapes raw newlines, tabs, and carriage returns that appear inside
          string contexts.
        </P>
        <Pre>
{`function sanitizeJSONControlChars(s) {
  let out = "", inString = false, escape = false;
  for (const ch of s) {
    if (inString) {
      if (escape) { out += ch; escape = false; continue; }
      if (ch === "\\\\") { out += ch; escape = true; continue; }
      if (ch === '"') { out += ch; inString = false; continue; }
      if (ch === "\\n") { out += "\\\\n"; continue; }
      if (ch === "\\r") { out += "\\\\r"; continue; }
      if (ch === "\\t") { out += "\\\\t"; continue; }
      out += ch;
    } else {
      out += ch;
      if (ch === '"') inString = true;
    }
  }
  return out;
}`}
        </Pre>
        <P>
          Live at <Code>apps/web/src/lib/json-tolerant.ts</Code>. It&apos;s
          maybe forty lines and unblocked everything.
        </P>

        <H2>satori-on-edge for OG images, with a static fallback</H2>
        <P>
          I wanted satori-generated OG cards (per-thread, with the actual
          score baked in) so shared links would look good on X / iMessage /
          Slack. <Code>satori</Code> compiles to a SVG; <Code>@resvg/resvg-wasm</Code>{" "}
          turns that SVG into a PNG. Both work in Node. Both fight you on
          Cloudflare&apos;s edge runtime — next-on-pages bundles satori as a
          giant blob and the WASM module has loading quirks.
        </P>
        <P>
          The shippable answer: pre-render the homepage OG card at build time
          via a Node script (<Code>scripts/build-og-root.mjs</Code>) and
          serve it as a static <Code>/og/root.png</Code>. For per-thread
          dynamic OG, the edge route does try satori + resvg-wasm but falls
          back to inline SVG if either fails. SVG OG previews work on
          Slack and Discord; Twitter/X and iMessage prefer PNG. Acceptable
          trade-off.
        </P>

        <H2>The hand-rolled tar parser for repo deep-audit</H2>
        <P>
          The Pro-tier deep-audit pulls a public repo&apos;s tarball from
          GitHub&apos;s codeload, walks every file, runs grep heuristics for
          TODO density, dead/skipped tests, leaked secrets, stale
          dependencies, and debug-spam in non-test source. Every finding
          cites real file + line numbers (no hallucinated paths — verifiable
          via <Code>git show HEAD:&lt;file&gt;</Code>).
        </P>
        <P>
          Cloudflare Workers have a hard 30s wall clock and ~128MB memory.
          You can&apos;t buffer the whole tarball. So:
        </P>
        <Pre>
{`const decompressed = res.body.pipeThrough(new DecompressionStream("gzip"));
for await (const entry of walkTarGz(decompressed, {
  maxFiles: 200, maxTotalBytes: 30 * 1024 * 1024,
  maxFileBytes: 200 * 1024, wallMillis: 30_000,
  shouldEnter: isScannable,
})) {
  // grep + heuristics
}`}
        </Pre>
        <P>
          The walker is ~120 lines of pure JS — tar is a 512-byte-aligned
          format that&apos;s genuinely easy to parse once you stop looking
          for an npm dependency. It pairs with <Code>DecompressionStream(&quot;gzip&quot;)</Code>,
          which is a Web standard Cloudflare ships. Total audit time on
          something like vercel/next.js: ~1.2s, with hard caps at 200
          files / 30MB / 30s.
        </P>

        <H2>The four leaf artifacts (and why KILL is free)</H2>
        <P>
          Every dimension in the skill-tree can converge into one of four
          terminal artifacts:
        </P>
        <ul className="list-disc pl-6 mt-3 space-y-1 opacity-90 text-base">
          <li><Code>SHIPPABLE_V0.md</Code> — a 1-page PRD with a named stack, V0 scope, acceptance criteria, and 4-6 paste-runnable shell commands.</li>
          <li><Code>KILL.md</Code> — a sunk-cost autopsy with specific dated cutoff signals and a one-line eulogy.</li>
          <li><Code>GH_ISSUE.md</Code> — title, labels, body, ready to paste into a GitHub issue.</li>
          <li><Code>README_BADGE.svg</Code> — embeddable score badge.</li>
        </ul>
        <P>
          The <Code>KILL</Code> artifact is the only one available on the free
          tier. That&apos;s deliberate: it&apos;s the artifact most likely to
          be screenshotted and shared, because telling someone to stop
          building is the meme. SHIPPABLE / ISSUE / BADGE are Pro-gated
          ($9/mo) — they&apos;re the artifacts people who actually want to
          ship will pay for.
        </P>

        <H2>Tier gating as data, not config</H2>
        <P>
          One <Code>charge(sid, env, opts)</Code> helper sits in front of
          every billable action. It checks legacy credits first (existing
          pack purchasers can still spend), then Pro entitlement, then the
          free-tier monthly quota. Failure modes return either{" "}
          <Code>TIER_LIMIT_REACHED</Code> (free user hit 5/mo cap) or{" "}
          <Code>PRO_REQUIRED</Code> (free user requested a Pro-gated
          artifact). The frontend reads <Code>session.isPro</Code> from{" "}
          <Code>/api/session</Code> and gates UI accordingly.
        </P>

        <H2>What I&apos;d do differently</H2>
        <ul className="list-disc pl-6 mt-3 space-y-1 opacity-90 text-base">
          <li>Stripe webhook lifecycle is the highest-risk surface — I&apos;d test the cancel/grace-period/dunning path more thoroughly before launch.</li>
          <li>The free-tier monthly quota is sid-cookie scoped, so incognito defeats it. Fingerprinting via IP+UA hash is on the v2 list.</li>
          <li>I&apos;d ship the public leaderboard from day one. The viral surface this product needs is &quot;look at the score this famous repo got,&quot; not &quot;here&apos;s the tool.&quot;</li>
        </ul>

        <H2>Try it</H2>
        <P>
          <Link href="/" style={{ color: "#39ff14", textDecoration: "underline" }}>
            scopecreeper.ai
          </Link>
          {" "}— 5 free scans/month, no signup. <Link href="/board" style={{ color: "#39ff14", textDecoration: "underline" }}>The Hall of Delusion</Link>{" "}
          is live. Source pieces live at{" "}
          <a
            href="https://github.com/SipMyBeers/scopecreeper"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#39ff14" }}
          >
            github.com/SipMyBeers/scopecreeper
          </a>
          .
        </P>

        <footer className="mt-10 pt-4 border-t border-[#39ff14]/20 text-[11px] opacity-60 uppercase tracking-widest">
          <Link href="/" style={{ color: "#39ff14" }}>▸ RUN A SCAN</Link>
          {" · "}
          <Link href="/board" style={{ color: "#39ff14" }}>board</Link>
          {" · "}
          <Link href="/about" style={{ color: "#39ff14" }}>about</Link>
        </footer>
      </article>
    </main>
  );
}
