import type { Metadata } from "next";
import Link from "next/link";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about Scope Creeper — what the delusion score means, how artifacts work, what Pro includes, and how Scope Creeper differs from scopecreeper.com (the consulting-spend SaaS).",
  alternates: { canonical: "https://scopecreeper.ai/faq" },
};

interface QA { q: string; a: React.ReactNode; aPlain: string; }

const QAS: QA[] = [
  {
    q: "What is Scope Creeper?",
    aPlain:
      "A tactical diagnostic engine for builders. You paste a GitHub repo URL, an AI chatlog, or a single word; we return a delusion score (0-100), a horizontal skill-tree of 3-5 project paths your seed could grow into, and on-demand artifacts (a 1-page PRD, a kill plan, a GitHub issue body, or a README badge) you can ship or paste straight into a repo.",
    a: (
      <>
        A tactical diagnostic engine for builders. You paste a GitHub repo URL,
        an AI chatlog, or a single word; we return a delusion score (0–100), a
        horizontal skill-tree of 3–5 project paths your seed could grow into,
        and on-demand artifacts (a 1-page PRD, a kill plan, a GitHub issue body,
        or a README badge) you can ship or paste straight into a repo.
      </>
    ),
  },
  {
    q: "Is this the same as scopecreeper.com?",
    aPlain:
      "No. scopecreeper.com is a B2B SaaS for enterprise consulting-spend management — it ingests invoices and tracks consulting engagements at Fortune 500 scale. Different audience, different problem, different price point. We're scopecreeper.ai: a creative diagnostic tool for indie builders and solo founders.",
    a: (
      <>
        No. <b>scopecreeper.com</b> is a B2B SaaS for enterprise consulting-spend
        management — it ingests invoices and tracks consulting engagements at
        Fortune 500 scale. Different audience, different problem, different
        price point. We&apos;re scopecreeper<b>.ai</b>: a creative diagnostic
        tool for indie builders and solo founders.
      </>
    ),
  },
  {
    q: "What does the delusion score actually measure?",
    aPlain:
      "Two components blended into one 0-100 score. Reality: how grounded the seed is (a real repo with active commits scores higher than a vague chat). Illusion: how ambitious it already is (how many features the chat claims, how broad the scope of the input is). Low scores (corpse / sweetspot) mean shippable. High scores (abyss / delusion) mean: cool dream, but you'll be in the abyss in six weeks.",
    a: (
      <>
        Two components, blended into one 0–100 score:
        <br />· <b>Reality</b> — how grounded the seed is (a real repo with
        active commits scores higher than a vague chat).
        <br />· <b>Illusion</b> — how ambitious it already is (how many features
        the chat claims, how broad the scope of the input is).
        <br />Low scores (corpse / sweetspot) mean shippable. High scores
        (abyss / delusion) mean: cool dream, but you&apos;ll be in the abyss
        in six weeks.
      </>
    ),
  },
  {
    q: "How is this different from ChatGPT?",
    aPlain:
      "ChatGPT will happily say yes to your ambition and produce a 20-feature plan. Scope Creeper's job is the opposite — score the ambition, surface multiple paths, force you to pick one, and converge on a real artifact with a concrete stack and a 30-minute first cut. The LLM underneath is Llama 3.3 70B (free Workers AI, no Anthropic dep), but it's wrapped in a deliberately cynical product prompt.",
    a: (
      <>
        ChatGPT will happily say yes to your ambition and produce a 20-feature
        plan. Scope Creeper&apos;s job is the opposite — score the ambition,
        surface multiple paths, force you to pick one, and converge on a real
        artifact with a concrete stack and a 30-minute first cut. The LLM
        underneath is Llama 3.3 70B (free Workers AI, no Anthropic dep), but
        it&apos;s wrapped in a deliberately cynical product prompt.
      </>
    ),
  },
  {
    q: "What are leaf artifacts?",
    aPlain:
      "Four terminal outputs you can converge on at any point in the tree. SHIPPABLE_V0.md: 1-page PRD with stack, V0 scope, acceptance criteria, and 4-6 paste-runnable shell commands. KILL.md: sunk-cost framing, specific dated cutoff signals, and a one-line eulogy. GH_ISSUE.md: title plus labels plus body, paste-ready for a GitHub issue. README_BADGE.svg: an embeddable score badge for any repo's README.",
    a: (
      <>
        Four terminal outputs you can converge on at any point in the tree:
        <br />· <b>SHIPPABLE_V0.md</b> — 1-page PRD with stack, V0 scope,
        acceptance criteria, and 4–6 paste-runnable shell commands.
        <br />· <b>KILL.md</b> — sunk-cost framing, specific dated cutoff
        signals, and a one-line eulogy.
        <br />· <b>GH_ISSUE.md</b> — title + labels + body, paste-ready for
        a GitHub issue.
        <br />· <b>README_BADGE.svg</b> — an embeddable score badge for any
        repo&apos;s README.
      </>
    ),
  },
  {
    q: "Can I export an artifact to GitHub?",
    aPlain:
      "Yes. The ArtifactPanel has an EXPORT -> GH button. First click takes you through GitHub OAuth (public_repo scope only); then a repo picker. ISSUE artifacts open a real issue with the right labels; SHIPPABLE / KILL / BADGE create a new branch, commit the file under SCOPE_CREEPER/<kind>-<slug>, and open a PR.",
    a: (
      <>
        Yes. The ArtifactPanel has an <code>EXPORT ▸ GH</code> button. First
        click takes you through GitHub OAuth (public_repo scope only); then a
        repo picker. ISSUE artifacts open a real issue with the right labels;
        SHIPPABLE / KILL / BADGE create a new branch, commit the file under
        <code>SCOPE_CREEPER/&lt;kind&gt;-&lt;slug&gt;</code>, and open a PR.
      </>
    ),
  },
  {
    q: "How much does it cost?",
    aPlain:
      "Free tier: 5 scans per month, all branching, no artifacts, no share links. Pro: $9/month for unlimited scans, all artifact kinds, unlimited public share links, and 5 deep-audits per month. One-shot deep-audit: $5 per repo if you don't want a subscription.",
    a: (
      <>
        Free tier: 5 scans per month, all branching, no artifacts, no share
        links. Pro: $9/month for unlimited scans, all artifact kinds, unlimited
        public share links, and 5 deep-audits per month. One-shot deep-audit:
        $5 per repo if you don&apos;t want a subscription.
      </>
    ),
  },
  {
    q: "What's a deep-audit?",
    aPlain:
      "An agentic Worker that pulls a public GitHub repo's tarball, walks the source, and runs grep heuristics for TODO density, dead/skipped tests, leaked secret patterns, stale dependencies, and debug-spam in non-test code. Every finding cites file plus line. Narrative summary through Llama 3.3 70B, but evidence is real — not hallucinated. Capped at 200 files / 30MB / 30s wall.",
    a: (
      <>
        An agentic Worker that pulls a public GitHub repo&apos;s tarball, walks
        the source, and runs grep heuristics for TODO density, dead/skipped
        tests, leaked secret patterns, stale dependencies, and debug-spam in
        non-test code. Every finding cites file + line. Narrative summary
        through Llama 3.3 70B, but evidence is real — not hallucinated.
        Capped at 200 files / 30MB / 30s wall.
      </>
    ),
  },
  {
    q: "Are my scans private?",
    aPlain:
      "By default yes — scan history is stored in your browser's localStorage; we never see the contents unless you explicitly hit the SHARE button (Pro-only). Shared threads write to a server-side KV keyed by a short slug; only people with the link can read them. Audit reports stay on your session.",
    a: (
      <>
        By default yes — scan history is stored in your browser&apos;s
        localStorage; we never see the contents unless you explicitly hit the
        SHARE button (Pro-only). Shared threads write to a server-side KV
        keyed by a short slug; only people with the link can read them. Audit
        reports stay on your session.
      </>
    ),
  },
  {
    q: "Why Llama and not Claude or GPT?",
    aPlain:
      "Because Workers AI runs Llama 3.3 70B for free on Cloudflare's edge, and the prompt engineering matters more than the parameter count for this product. Zero Anthropic / OpenAI dependency by design — we can ship features without anyone's API key rotating mid-deploy.",
    a: (
      <>
        Because Workers AI runs Llama 3.3 70B for free on Cloudflare&apos;s
        edge, and the prompt engineering matters more than the parameter count
        for this product. Zero Anthropic / OpenAI dependency by design — we
        can ship features without anyone&apos;s API key rotating mid-deploy.
      </>
    ),
  },
  {
    q: "Who built this?",
    aPlain:
      "Beers Labs LLC — built on top of an in-house diagnostic engine originally tuned for self-roasting our own delusional product plans. Open source-curious; pieces live at github.com/SipMyBeers/scopecreeper.",
    a: (
      <>
        Beers Labs LLC — built on top of an in-house diagnostic engine
        originally tuned for self-roasting our own delusional product plans.
        Open source-curious; pieces live at{" "}
        <a href="https://github.com/SipMyBeers/scopecreeper" target="_blank" rel="noreferrer" style={{ color: "#39ff14" }}>
          github.com/SipMyBeers/scopecreeper
        </a>.
      </>
    ),
  },
];

/** Safe JSON encoder for <script type="application/ld+json">. Escapes
 *  characters that could break out of the script context. Source data is
 *  static + author-controlled (the QAS array), but we still escape defensively. */
function safeJsonForScript(value: unknown): string {
  // Escape characters that could break out of a <script> context.
  // U+2028 / U+2029 are also escaped: legal in JSON strings, illegal in JS literals.
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(LS).join("\\u2028")
    .split(PS).join("\\u2029");
}

export default function FAQPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QAS.map((qa) => ({
      "@type": "Question",
      name: qa.q,
      acceptedAnswer: { "@type": "Answer", text: qa.aPlain },
    })),
  };

  return (
    <main className="min-h-screen bg-black text-[#e8ffe8] px-6 py-10 md:py-16"
      style={{
        fontFamily: "var(--font-vt323), monospace",
        background:
          "radial-gradient(ellipse at top, #0a0612 0%, #050308 60%, #000 100%)",
      }}
    >
      {/* JSON-LD FAQPage schema — escaped via safeJsonForScript above. */}
      <script type="application/ld+json">{safeJsonForScript(jsonLd)}</script>
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
            <Link href="/about" style={{ color: "#39ff14" }}>about</Link>
            <Link href="/faq" style={{ color: "#39ff14" }} aria-current="page">faq</Link>
          </nav>
        </header>

        <h1
          style={{
            fontFamily: "var(--font-press-start-2p), monospace",
            fontSize: "clamp(22px, 4vw, 36px)",
            color: "#ff007f",
            textShadow: "0 0 10px #ff007f",
            letterSpacing: "0.04em",
          }}
        >
          FAQ :: KNOWN UNKNOWNS
        </h1>

        <div className="flex flex-col gap-5">
          {QAS.map((qa, i) => (
            <section key={i} className="flex flex-col gap-1.5">
              <h2 className="text-base font-bold"
                style={{
                  color: "#39ff14",
                  fontFamily: "var(--font-vt323), monospace",
                  fontSize: "20px",
                  textShadow: "0 0 4px #39ff14",
                }}
              >
                ▸ {qa.q}
              </h2>
              <div className="text-base opacity-90 leading-snug pl-3 border-l border-[#39ff14]/30">
                {qa.a}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-6 pt-4 border-t border-[#39ff14]/20 text-[11px] opacity-60 uppercase tracking-widest">
          <Link href="/" style={{ color: "#39ff14" }}>
            ▸ RUN A SCAN
          </Link>
          {" · "}
          <Link href="/about" style={{ color: "#39ff14" }}>
            about
          </Link>
        </footer>
      </article>
    </main>
  );
}
