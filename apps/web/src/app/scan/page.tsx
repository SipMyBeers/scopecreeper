import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/Hero";

export const runtime = "edge";

const TITLE = "Scope Creeper · arcade demo";
const DESC =
  "Drop a repo URL, a chatlog, or a single word. Get a delusion score and a skill tree of project paths you could build from it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "https://scopecreeper.ai/scan" },
};

export default function ScanPage() {
  return (
    <>
      {/* Fixed back button — sits above the arcade canvas. Pink terminal pill. */}
      <Link
        href="/"
        style={{
          position: "fixed",
          top: 18,
          left: 18,
          zIndex: 100,
          fontFamily: "var(--font-press-start-2p), monospace",
          fontSize: 10,
          letterSpacing: "0.2em",
          color: "#ff007f",
          textShadow: "0 0 6px #ff007f",
          textDecoration: "none",
          padding: "8px 14px",
          background: "rgba(0,0,0,0.78)",
          border: "1px solid #ff007f",
          boxShadow: "0 0 14px rgba(255,0,127,0.45)",
          backdropFilter: "blur(4px)",
        }}
      >
        ◂ BACK TO LANDING
      </Link>
      <Hero />
    </>
  );
}
