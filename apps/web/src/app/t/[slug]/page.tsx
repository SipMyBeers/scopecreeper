/**
 * Public read-only renderer for a shared scan thread.
 *
 *   /t/<slug>   → fetches share:<slug> from KV_SHARED_THREADS and renders
 *                 the scan + skill tree (no DEPLOY/ARTIFACT buttons).
 *
 * og:image points at /api/og/[slug] (Sprint 5c).
 */
import { notFound } from "next/navigation";
import { getCfEnv } from "@/lib/cf-env";
import { getShared } from "@/lib/shared-threads";
import type { Metadata } from "next";
import SharedThreadView from "@/components/SharedThreadView";

export const runtime = "edge";

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
}
interface Env {
  KV_SHARED_THREADS?: KV;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const env = getCfEnv<Env>();
  if (!env.KV_SHARED_THREADS) return { title: "scope creeper" };
  const env_kv = env.KV_SHARED_THREADS;
  const shared = await getShared(env_kv, slug);
  if (!shared) return { title: "not found · scope creeper" };
  const r = shared.thread.result;
  const title = `${r.score} · ${r.tier.toUpperCase()} · scope creeper`;
  const description = r.verdict;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og/${slug}`, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/${slug}`],
    },
  };
}

export default async function SharedThreadPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const env = getCfEnv<Env>();
  if (!env.KV_SHARED_THREADS) notFound();
  const shared = await getShared(env.KV_SHARED_THREADS!, slug);
  if (!shared) notFound();
  return <SharedThreadView slug={slug} thread={shared.thread} createdAt={shared.createdAt} />;
}
