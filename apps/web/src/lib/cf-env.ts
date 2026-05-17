/**
 * Unified accessor for Cloudflare Pages bindings + secrets.
 *
 * @cloudflare/next-on-pages does NOT auto-populate `process.env` with
 * worker bindings. The right way to access them inside an edge route
 * is `getRequestContext()` which returns the live execution context
 * including `env`. Falls back to `process.env` for dev (`next dev`).
 */
import { getRequestContext } from "@cloudflare/next-on-pages";

export function getCfEnv<T = Record<string, unknown>>(): T {
  try {
    const ctx = getRequestContext();
    if (ctx?.env) return ctx.env as T;
  } catch {
    /* not in a CF worker context — fall through */
  }
  return ((process as unknown as { env: T }).env ?? ({} as T)) as T;
}
