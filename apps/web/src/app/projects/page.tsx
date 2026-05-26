import type { Metadata } from "next";
import Link from "next/link";
import ProjectsClient from "./ProjectsClient";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Pro-tier workspaces. Bundle a repo, chatlogs, and docs — see what you claimed vs what you shipped vs how creepy it could still get.",
  alternates: { canonical: "https://scopecreeper.ai/projects" },
};

export default function ProjectsPage() {
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
            <Link href="/projects" style={{ color: "#39ff14" }} aria-current="page">projects</Link>
            <Link href="/board" style={{ color: "#39ff14" }}>board</Link>
            <Link href="/about" style={{ color: "#39ff14" }}>about</Link>
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
          PROJECTS :: THEORY vs ACTUAL
        </h1>

        <p className="text-base opacity-85 leading-snug">
          Bundle a repo + chatlogs + docs into one workspace. Run analysis to
          diff what you CLAIMED you&apos;d build against what your repo
          actually SHIPS. Bonus: a creepier-mode skill tree of project
          directions you could still wander into.
        </p>

        <ProjectsClient />
      </article>
    </main>
  );
}
