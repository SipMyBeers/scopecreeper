/**
 * Stub — original Sprint 0a prototype required `satori` + `@resvg/resvg-wasm`
 * which are not in the current build dep set. The route stays so the URL
 * doesn't 404 silently; returns a placeholder SVG until the OG pipeline
 * is restored.
 */
export const runtime = "edge";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#050308"/>
  <text x="600" y="300" fill="#39ff14" font-family="monospace" font-size="48" text-anchor="middle">Scope Creeper</text>
  <text x="600" y="360" fill="#ff007f" font-family="monospace" font-size="20" text-anchor="middle">OG image pipeline coming soon</text>
</svg>`;

export async function GET(): Promise<Response> {
  return new Response(SVG, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
  });
}
