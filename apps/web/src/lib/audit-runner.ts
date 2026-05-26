/**
 * Repo deep-audit orchestrator. Fetches a public GitHub tarball, walks it
 * with hard caps, applies grep heuristics, composes a narrative summary,
 * returns an AuditReport. All edge-runtime safe.
 */
import {
  type Finding,
  isScannable,
  scanFileContent,
  scanPackageJson,
} from "./audit-heuristics";
import { walkTarGz } from "./tar-parser";

export interface AuditReport {
  repo: string;
  scannedAt: number;
  filesScanned: number;
  bytesScanned: number;
  findings: Finding[];
  narrative: string;
  delusionScore: number;
  truncated: boolean;
}

const MAX_FILES = 200;
const MAX_FILE_BYTES = 200 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const WALL_MILLIS = 30_000;

function severityWeight(s: Finding["severity"]): number {
  return s === "high" ? 10 : s === "warn" ? 4 : 1;
}

/** Score = weighted sum of findings, normalized into 0-100 delusion-style. */
function scoreFromFindings(findings: Finding[], filesScanned: number): number {
  const raw = findings.reduce((acc, f) => acc + severityWeight(f.severity), 0);
  // Normalize: 1 weighted finding per 8 files ≈ 50; saturate at 100.
  const denom = Math.max(1, filesScanned / 8);
  const ratio = Math.min(1, raw / (denom + 8));
  return Math.round(ratio * 100);
}

export async function runAudit(
  repo: string,
  ai: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> } | undefined
): Promise<AuditReport> {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error(`invalid repo format (need 'owner/name'): ${repo}`);
  }

  const startedAt = Date.now();
  // Look up the default branch via the GitHub API, then fetch its tarball.
  // (Common branch names vary: main, master, canary, develop, etc.)
  let defaultBranch = "main";
  try {
    const meta = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "scopecreeper" },
    });
    if (meta.ok) {
      const json = (await meta.json()) as { default_branch?: string };
      if (json.default_branch) defaultBranch = json.default_branch;
    }
  } catch {
    /* fall through to default */
  }
  let res = await fetch(
    `https://codeload.github.com/${repo}/tar.gz/refs/heads/${defaultBranch}`,
    { redirect: "follow" }
  );
  if (!res.ok || !res.body) {
    // Try a couple of common alternates.
    for (const b of ["main", "master", "develop"]) {
      if (b === defaultBranch) continue;
      res = await fetch(
        `https://codeload.github.com/${repo}/tar.gz/refs/heads/${b}`,
        { redirect: "follow" }
      );
      if (res.ok && res.body) break;
    }
  }
  if (!res.ok || !res.body) {
    throw new Error(`tarball fetch failed: ${res.status}`);
  }

  const decompressed = res.body.pipeThrough(new DecompressionStream("gzip"));
  const findings: Finding[] = [];
  let filesScanned = 0;
  let bytesScanned = 0;
  let truncated = false;

  for await (const entry of walkTarGz(decompressed, {
    maxFiles: MAX_FILES,
    maxTotalBytes: MAX_TOTAL_BYTES,
    maxFileBytes: MAX_FILE_BYTES,
    shouldEnter: isScannable,
    startedAt,
    wallMillis: WALL_MILLIS,
  })) {
    filesScanned++;
    bytesScanned += entry.bytes;

    findings.push(...scanFileContent(entry.path, entry.content));

    // Special handling for package.json.
    if (/(?:^|\/)package\.json$/.test(entry.path)) {
      try {
        const parsed = JSON.parse(entry.content) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        findings.push(...scanPackageJson(entry.path, parsed));
      } catch {
        /* malformed — ignore */
      }
    }

    if (Date.now() - startedAt > WALL_MILLIS - 500) {
      truncated = true;
      break;
    }
  }

  const delusionScore = scoreFromFindings(findings, filesScanned);

  // Optional LLM narrative pass — context is the *findings*, not raw code.
  let narrative = `${filesScanned} files scanned, ${findings.length} findings.`;
  if (ai && findings.length > 0) {
    const top = findings
      .slice()
      .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
      .slice(0, 25)
      .map((f) => `[${f.severity}] ${f.category} ${f.file}${f.line ? `:${f.line}` : ""} — ${f.evidence}`)
      .join("\n");
    try {
      const out = (await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [
          {
            role: "system",
            content:
              "You are SCOPE CREEPER, scoring tech-debt and scope drift in a real repo. " +
              "Tone: cynical, terminal, ALL-CAPS verdicts. Refer ONLY to the findings you are given. " +
              "Do not invent file paths or facts. 4-7 sentences max.",
          },
          {
            role: "user",
            content: `Repo: ${repo}\nDelusion: ${delusionScore}\nTop findings:\n${top}\n\nWrite the narrative.`,
          },
        ],
        max_tokens: 600,
      })) as { response?: string };
      if (out?.response) narrative = out.response.trim();
    } catch {
      /* LLM narrative is optional, keep deterministic line */
    }
  }

  return {
    repo,
    scannedAt: startedAt,
    filesScanned,
    bytesScanned,
    findings,
    narrative,
    delusionScore,
    truncated,
  };
}
