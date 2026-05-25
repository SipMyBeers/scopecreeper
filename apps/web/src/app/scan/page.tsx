import type { Metadata } from "next";
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
  return <Hero />;
}
