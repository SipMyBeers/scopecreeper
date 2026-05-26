import type { Metadata } from "next";
import Link from "next/link";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "About",
  description:
    "Scope Creeper is a tactical diagnostic engine for builders. Drop in a repo, a chatlog, or a single word and get a delusion score, a skill-tree of project paths, and shippable artifacts you can commit to GitHub.",
  alternates: { canonical: "https://scopecreeper.ai/about" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-[#e8ffe8] px-6 py-10 md:py-16"
      style={{
        fontFamily: "var(--font-vt323), monospace",
        background:
          "radial-gradient(ellipse at top, #0a0612 0%, #050308 60%, #000 100%)",
      }}
    >
      <article className="max-w-2xl mx-auto flex flex-col gap-6">
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
            <Link href="/about" style={{ color: "#39ff14" }} aria-current="page">about</Link>
            <Link href="/faq" style={{ color: "#39ff14" }}>faq</Link>
          </nav>
        </header>

        <h1
          className="leading-none"
          style={{
            fontFamily: "var(--font-press-start-2p), monospace",
            fontSize: "clamp(22px, 4vw, 36px)",
            color: "#ff007f",
            textShadow: "0 0 12px #ff007f",
            letterSpacing: "0.04em",
          }}
        >
          AI HALLUCINATES FLAWS.
          <br />
          YOU HALLUCINATE FEATURES.
        </h1>

        <p className="text-lg leading-snug opacity-90">
          Scope Creeper is a tactical diagnostic engine for people who keep
          mistaking ambition for product. Drop in a repo, a chatlog with your
          favorite agent, or just one word. We score how delusional the
          project is to actually ship, branch it into a tree of paths you could
          build, and converge each path on something concrete you can paste
          straight into a real codebase.
        </p>

        <section>
          <h2 className="text-[#39ff14] uppercase tracking-[0.2em] text-sm mb-2"
            style={{ fontFamily: "var(--font-press-start-2p), monospace" }}
          >
            WHAT IT DOES
          </h2>
          <ul className="flex flex-col gap-2 text-base opacity-90 leading-snug">
            <li>· <b>Delusion score</b> (0–100) on any payload — repo, chatlog, single word.</li>
            <li>· <b>Skill-tree</b> of 3–5 project paths the seed could grow into, each with its own creep estimate.</li>
            <li>· <b>Leaf artifacts</b> — a 1-page <code>SHIPPABLE_V0.md</code> PRD with stack + 30-min first cut, a <code>KILL.md</code> sunk-cost argument with dated cutoff signals, a paste-ready <code>GH_ISSUE.md</code> body, or an embeddable <code>README_BADGE.svg</code>.</li>
            <li>· <b>One-click GitHub export</b> — open the artifact as a real Issue or branch + PR on any repo you own.</li>
            <li>· <b>Repo deep-audit</b> (Pro) — agentic scan over a public tarball, citing real file:line evidence for TODO density, dead tests, dependency rot, leaked secrets.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[#39ff14] uppercase tracking-[0.2em] text-sm mb-2"
            style={{ fontFamily: "var(--font-press-start-2p), monospace" }}
          >
            WHO IT&apos;S FOR
          </h2>
          <p className="text-base opacity-90 leading-snug">
            Indie hackers, solo builders, founder-engineers, and anyone who has
            ever held a multi-hour ChatGPT &quot;let&apos;s build the next Notion&quot;
            conversation and emerged with no working code. Scope Creeper exists
            to convert ambition into either (a) a shippable v0 or (b) the
            self-respect to walk away.
          </p>
        </section>

        <section>
          <h2 className="text-[#39ff14] uppercase tracking-[0.2em] text-sm mb-2"
            style={{ fontFamily: "var(--font-press-start-2p), monospace" }}
          >
            HOW IT WORKS
          </h2>
          <ol className="flex flex-col gap-2 text-base opacity-90 leading-snug list-decimal pl-5">
            <li>You drop a payload into the terminal.</li>
            <li>The arcade scores your seed&apos;s reality + illusion components and emits a delusion total.</li>
            <li>The LLM (Llama 3.3 70B on Cloudflare Workers AI — no Anthropic, no OpenAI dependency) branches your seed into concrete project paths.</li>
            <li>Drill into a path to explore further, or converge into one of four leaf artifacts.</li>
            <li>Copy, download, share, or export to a GitHub repo. Pro users also get unlimited shares and a 5/mo deep-audit budget.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[#39ff14] uppercase tracking-[0.2em] text-sm mb-2"
            style={{ fontFamily: "var(--font-press-start-2p), monospace" }}
          >
            STACK
          </h2>
          <p className="text-base opacity-90 leading-snug">
            Next.js 16 on Cloudflare Pages (edge runtime, Workers AI, KV).
            Llama 3.3 70B for ideation + artifact synthesis. Stripe for
            subscription + one-shot purchases. Satori + resvg-wasm for OG
            badge generation. Zero Anthropic dependency by design.
          </p>
        </section>

        <footer className="mt-6 pt-4 border-t border-[#39ff14]/20 text-[11px] opacity-60 uppercase tracking-widest">
          <Link href="/" style={{ color: "#39ff14" }}>
            ▸ RUN A SCAN
          </Link>
          {" · "}
          <Link href="/faq" style={{ color: "#39ff14" }}>
            FAQ
          </Link>
          {" · "}
          <a href="https://github.com/SipMyBeers/scopecreeper" target="_blank" rel="noreferrer" style={{ color: "#39ff14" }}>
            github
          </a>
        </footer>
      </article>
    </main>
  );
}
