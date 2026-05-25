/**
 * Stub — original Sprint 5c renderer used satori + resvg-wasm to produce
 * a 1200x630 PNG of the share-thread score badge. Those deps aren't in
 * the build set; this returns a static-style placeholder SVG so share
 * URLs still get a valid og:image while the real renderer is restored.
 */
export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const title = `Scope Creeper · ${slug.slice(0, 12)}`;
  const score = "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#050308"/>
  <text x="600" y="280" fill="#39ff14" font-family="monospace" font-size="48" text-anchor="middle">${escapeXml(title).slice(0, 40)}</text>
  ${score ? `<text x="600" y="360" fill="#ff007f" font-family="monospace" font-size="72" text-anchor="middle">${score}</text>` : ""}
  <text x="600" y="540" fill="#5cb8ff" font-family="monospace" font-size="22" text-anchor="middle">scopecreeper.ai</text>
</svg>`;

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=600" },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
}
