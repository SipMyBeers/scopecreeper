import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCfEnv } from "@/lib/cf-env";
import { getProject } from "@/lib/projects";
import {
  getOrCreateSession,
  hasLegacyCredits,
  isPro,
  readSession,
} from "@/lib/session";
import ProjectDetailClient from "./ProjectDetailClient";
import { headers, cookies } from "next/headers";

export const runtime = "edge";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Project · ${id.slice(0, 8)}`,
    description: "Theory-vs-actual diff for this project.",
    alternates: { canonical: `https://scopecreeper.ai/projects/${id}` },
    robots: { index: false, follow: false },
  };
}

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  delete?: (key: string) => Promise<void>;
}
interface Env {
  KV_PROJECTS?: KV;
  KV_QUOTAS?: KV;
  AUTH_SECRET?: string;
}

async function buildRequestForSession() {
  const hdrs = await headers();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");
  const url = `https://${hdrs.get("host") ?? "scopecreeper.ai"}/projects`;
  return new Request(url, { headers: { cookie: cookieHeader } });
}

export default async function ProjectDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const env = getCfEnv<Env>();
  if (!env.KV_PROJECTS) notFound();
  const req = await buildRequestForSession();
  const { sid } = await getOrCreateSession(req, env);
  const record = await readSession(sid, env);
  const allowed = record && (isPro(record) || hasLegacyCredits(record));
  if (!allowed) {
    return (
      <main
        className="min-h-screen bg-black text-[#ffb000] px-4 py-14"
        style={{ fontFamily: "var(--font-vt323), monospace" }}
      >
        <div className="max-w-xl mx-auto border p-6" style={{ borderColor: "#ffb000" }}>
          <h1
            className="uppercase tracking-widest mb-2"
            style={{ fontFamily: "var(--font-press-start-2p), monospace", fontSize: 14 }}
          >
            ▸ PRO REQUIRED
          </h1>
          <p className="opacity-90">Projects are a Pro feature.</p>
          <Link href="/projects" className="underline" style={{ color: "#ffb000" }}>
            ← back to projects
          </Link>
        </div>
      </main>
    );
  }

  const project = await getProject(env.KV_PROJECTS, sid, id);
  if (!project) notFound();

  return <ProjectDetailClient initialProject={project} />;
}
