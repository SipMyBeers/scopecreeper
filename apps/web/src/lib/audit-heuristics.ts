/**
 * Grep-based red-flag detection for repo deep-audits. Pure functions.
 *
 * Each heuristic takes (path, content) and returns Finding[] — every finding
 * cites file + line so the audit report has real evidence, not LLM vibes.
 */

export type FindingCategory =
  | "TODO_DENSITY"
  | "DEAD_TEST"
  | "DEAD_CODE"
  | "DEP_AGE"
  | "SECRET"
  | "MIXED_CONCERNS";

export interface Finding {
  category: FindingCategory;
  severity: "info" | "warn" | "high";
  file: string;
  line?: number;
  evidence: string;
}

const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".swift", ".php", ".cs", ".c", ".h", ".cpp", ".hpp",
  ".md", ".mdx", ".yml", ".yaml", ".toml", ".json", ".env",
  ".sh", ".bash", ".zsh", ".fish",
  ".sql", ".graphql", ".gql",
  ".css", ".scss", ".sass", ".less", ".html", ".vue", ".svelte", ".astro",
]);

export function isScannable(path: string): boolean {
  // Skip obvious non-targets (lockfiles, build artifacts, vendor dirs).
  if (/(?:^|\/)(?:node_modules|dist|build|\.next|\.vercel|coverage|target|vendor|\.git)\//.test(path)) {
    return false;
  }
  if (/(?:^|\/)(?:pnpm-lock\.yaml|yarn\.lock|package-lock\.json|Cargo\.lock|Gemfile\.lock|composer\.lock|poetry\.lock)$/.test(path)) {
    return false;
  }
  const dot = path.lastIndexOf(".");
  if (dot < 0) return false;
  const ext = path.slice(dot).toLowerCase();
  return TEXT_EXT.has(ext);
}

/** Conservative regexes for high-confidence secret patterns. Evidence omits
 *  the secret text itself to avoid leaking it through the audit report. */
const SECRET_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "AWS Access Key ID", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub PAT (ghp_)", re: /\bghp_[A-Za-z0-9]{36,}\b/ },
  { name: "GitHub OAuth (gho_)", re: /\bgho_[A-Za-z0-9]{36,}\b/ },
  { name: "Stripe Live Secret", re: /\bsk_live_[A-Za-z0-9]{20,}\b/ },
  { name: "OpenAI API key", re: /\bsk-(?:proj-)?[A-Za-z0-9_\-]{20,}\b/ },
  { name: "Anthropic API key", re: /\bsk-ant-[A-Za-z0-9_\-]{20,}\b/ },
  { name: "Generic private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
];

const TODO_RE = /\b(?:TODO|FIXME|HACK|XXX|TKTK)\b/gi;
const DEBUG_RE = /\b(?:console\.log|debugger;|print\()/g;
const SKIP_RE = /\b(?:it|test|describe)\.(?:skip|only)\b|\bxdescribe\b|\bxit\b/;

function lineOf(content: string, idx: number): number {
  let line = 1;
  for (let i = 0; i < idx && i < content.length; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

function lineSnippet(content: string, line: number): string {
  const lines = content.split("\n");
  return (lines[line - 1] ?? "").trim().slice(0, 140);
}

export function scanFileContent(path: string, content: string): Finding[] {
  const findings: Finding[] = [];

  // 1) Secret scan — high severity. Evidence text never includes the match.
  for (const { name, re } of SECRET_PATTERNS) {
    const matches = content.match(re);
    if (matches) {
      const idx = content.indexOf(matches[0]);
      findings.push({
        category: "SECRET",
        severity: "high",
        file: path,
        line: lineOf(content, idx),
        evidence: `${name} matched (redacted)`,
      });
    }
  }

  // 2) TODO/FIXME density — collect matches via matchAll.
  let todoCount = 0;
  let firstTodoIdx = -1;
  for (const m of content.matchAll(TODO_RE)) {
    if (firstTodoIdx < 0 && m.index !== undefined) firstTodoIdx = m.index;
    todoCount++;
    if (todoCount > 50) break;
  }
  if (todoCount >= 3 && firstTodoIdx >= 0) {
    const ln = lineOf(content, firstTodoIdx);
    findings.push({
      category: "TODO_DENSITY",
      severity: todoCount >= 8 ? "warn" : "info",
      file: path,
      line: ln,
      evidence: `${todoCount} TODO/FIXME markers; e.g. "${lineSnippet(content, ln)}"`,
    });
  }

  // 3) Dead-test indicator: .skip / .only / xit / xdescribe in test files.
  if (/\.(?:test|spec)\.[tj]sx?$/i.test(path)) {
    const m = content.match(SKIP_RE);
    if (m && m.index !== undefined) {
      const ln = lineOf(content, m.index);
      findings.push({
        category: "DEAD_TEST",
        severity: "warn",
        file: path,
        line: ln,
        evidence: `Skipped/exclusive test marker: ${lineSnippet(content, ln)}`,
      });
    }
  }

  // 4) Debug-spam in non-test source.
  if (!/\.(?:test|spec)\.[tj]sx?$/i.test(path)) {
    let debugCount = 0;
    let debugFirstIdx = -1;
    for (const m of content.matchAll(DEBUG_RE)) {
      debugCount++;
      if (debugFirstIdx < 0 && m.index !== undefined) debugFirstIdx = m.index;
      if (debugCount > 100) break;
    }
    if (debugCount >= 5 && debugFirstIdx >= 0) {
      findings.push({
        category: "DEAD_CODE",
        severity: debugCount >= 20 ? "warn" : "info",
        file: path,
        line: lineOf(content, debugFirstIdx),
        evidence: `${debugCount} debug-logging calls left in non-test source`,
      });
    }
  }

  return findings;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const STALE_HEURISTIC: Array<{ name: string; reasonIfMatch: string; match: (v: string) => boolean }> = [
  {
    name: "react",
    reasonIfMatch: "React 16/17 — out of LTS support window",
    match: (v) => /^\^?(?:16|17)\./.test(v),
  },
  {
    name: "next",
    reasonIfMatch: "Next.js < 14 — pre-App-Router era, large migration overhead",
    match: (v) => /^\^?(?:9|10|11|12|13)\./.test(v),
  },
];

/** Run heuristics over the parsed `package.json` of a repo. */
export function scanPackageJson(path: string, parsed: PackageJson): Finding[] {
  const findings: Finding[] = [];
  const allDeps = { ...(parsed.dependencies ?? {}), ...(parsed.devDependencies ?? {}) };
  const depCount = Object.keys(allDeps).length;
  if (depCount >= 80) {
    findings.push({
      category: "MIXED_CONCERNS",
      severity: depCount >= 150 ? "warn" : "info",
      file: path,
      evidence: `${depCount} dependencies — refactor surface area is large`,
    });
  }
  for (const stale of STALE_HEURISTIC) {
    const v = allDeps[stale.name];
    if (v && stale.match(v)) {
      findings.push({
        category: "DEP_AGE",
        severity: "warn",
        file: path,
        evidence: `${stale.name}@${v} :: ${stale.reasonIfMatch}`,
      });
    }
  }
  return findings;
}
