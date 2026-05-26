/**
 * Tiny streaming tar parser for use on Cloudflare Workers edge runtime.
 * Pairs with `DecompressionStream("gzip")` to walk a `.tar.gz` from a
 * GitHub codeload URL without buffering the whole thing.
 *
 * Only POSIX/ustar regular-file entries are surfaced; directories, symlinks,
 * and other typeflags are skipped.
 */

export interface TarEntry {
  /** Repo-relative path, with the GitHub-archive prefix stripped. */
  path: string;
  /** Decoded UTF-8 content. Skipped for files exceeding `maxFileBytes`. */
  content: string;
  bytes: number;
}

export interface TarWalkOptions {
  maxFiles: number;
  maxTotalBytes: number;
  maxFileBytes: number;
  /** Strip the leading "owner-name-sha/" segment GitHub adds. Default true. */
  stripFirstSegment?: boolean;
  /** Return false to skip a path before reading its body. */
  shouldEnter?: (path: string) => boolean;
  /** Wall-clock guard. */
  startedAt?: number;
  wallMillis?: number;
}

function parseOctal(buf: Uint8Array, start: number, len: number): number {
  let s = "";
  for (let i = 0; i < len; i++) {
    const b = buf[start + i];
    if (b === 0 || b === 32) break;
    s += String.fromCharCode(b);
  }
  return s ? parseInt(s, 8) : 0;
}

function parseString(buf: Uint8Array, start: number, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    const b = buf[start + i];
    if (b === 0) break;
    s += String.fromCharCode(b);
  }
  return s;
}

export async function* walkTarGz(
  stream: ReadableStream<Uint8Array>,
  opts: TarWalkOptions
): AsyncIterable<TarEntry> {
  const reader = stream.getReader();
  let buf = new Uint8Array(0);
  let totalEmitted = 0;
  let filesEmitted = 0;
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const stripPrefix = opts.stripFirstSegment !== false;
  const startedAt = opts.startedAt ?? Date.now();
  const wallMillis = opts.wallMillis ?? 30_000;

  async function readMore(): Promise<boolean> {
    const { value, done } = await reader.read();
    if (done) return false;
    if (!value) return true;
    const next = new Uint8Array(buf.length + value.length);
    next.set(buf, 0);
    next.set(value, buf.length);
    buf = next;
    return true;
  }

  async function ensure(min: number): Promise<boolean> {
    while (buf.length < min) {
      if (!(await readMore())) return false;
    }
    return true;
  }

  while (true) {
    if (Date.now() - startedAt > wallMillis) return;
    if (filesEmitted >= opts.maxFiles) return;
    if (totalEmitted >= opts.maxTotalBytes) return;

    if (!(await ensure(512))) return;
    const header = buf.subarray(0, 512);
    buf = buf.subarray(512);

    // End-of-archive: two zero blocks.
    let allZero = true;
    for (let i = 0; i < 512; i++) if (header[i] !== 0) { allZero = false; break; }
    if (allZero) return;

    let name = parseString(header, 0, 100);
    const prefix = parseString(header, 345, 155);
    if (prefix) name = `${prefix}/${name}`;
    const size = parseOctal(header, 124, 12);
    const typeflag = header[156] === 0 ? 0 : header[156] - 0x30; // ascii digit
    const padded = Math.ceil(size / 512) * 512;

    // Strip the GitHub archive prefix "owner-name-sha/" or "name-tag/".
    let relPath = name;
    if (stripPrefix) {
      const slash = name.indexOf("/");
      relPath = slash >= 0 ? name.slice(slash + 1) : "";
    }

    // Skip if not a regular file, or zero-length, or oversize, or filtered.
    const isRegular = typeflag === 0 || header[156] === 0;
    const skip =
      !isRegular ||
      !relPath ||
      size === 0 ||
      size > opts.maxFileBytes ||
      (opts.shouldEnter && !opts.shouldEnter(relPath));

    if (skip) {
      // Discard `padded` bytes without copying.
      let remaining = padded;
      while (remaining > 0) {
        if (buf.length === 0 && !(await readMore())) return;
        const take = Math.min(remaining, buf.length);
        buf = buf.subarray(take);
        remaining -= take;
      }
      continue;
    }

    if (!(await ensure(padded))) return;
    const body = buf.subarray(0, size);
    const text = decoder.decode(body);
    buf = buf.subarray(padded);

    yield { path: relPath, content: text, bytes: size };
    filesEmitted++;
    totalEmitted += size;
  }
}
