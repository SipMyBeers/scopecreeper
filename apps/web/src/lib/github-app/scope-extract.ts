/**
 * Extract "scope of truth" + "PR intent" + "diff signal" from a GitHub PR
 * for the LLM-based drift analyzer.
 *
 * Three sources, ranked:
 *  1. `.scopecreeper.md` at repo root → canonical declared scope
 *  2. README.md fallback if scopecreeper.md is missing
 *  3. PR description as the local "what this PR claims"
 *
 * The diff is summarized down to file paths + change types so we don't
 * blow the LLM context window on huge PRs.
 */

export interface PrContext {
  prTitle: string;
  prBody: string;
  scopeDoc: string | null; // canonical scope: .scopecreeper.md OR README.md
  scopeDocSource: "scopecreeper.md" | "readme" | "none";
  diffSummary: string;
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
}

const MAX_DIFF_LINES = 120; // truncate after this many summary lines

interface FileChange {
  path: string;
  added: number;
  deleted: number;
  status: "added" | "modified" | "deleted" | "renamed";
}

function parseDiffSummary(diff: string): {
  files: FileChange[];
  totalAdded: number;
  totalDeleted: number;
} {
  const files: FileChange[] = [];
  let totalAdded = 0;
  let totalDeleted = 0;
  let current: FileChange | null = null;

  const lines = diff.split("\n");
  for (const ln of lines) {
    if (ln.startsWith("diff --git ")) {
      if (current) files.push(current);
      const m = ln.match(/diff --git a\/(.+?) b\/(.+)$/);
      const path = m ? m[2] : "unknown";
      current = { path, added: 0, deleted: 0, status: "modified" };
    } else if (ln.startsWith("new file mode")) {
      if (current) current.status = "added";
    } else if (ln.startsWith("deleted file mode")) {
      if (current) current.status = "deleted";
    } else if (ln.startsWith("rename from") || ln.startsWith("rename to")) {
      if (current) current.status = "renamed";
    } else if (ln.startsWith("+") && !ln.startsWith("+++")) {
      if (current) current.added++;
      totalAdded++;
    } else if (ln.startsWith("-") && !ln.startsWith("---")) {
      if (current) current.deleted++;
      totalDeleted++;
    }
  }
  if (current) files.push(current);
  return { files, totalAdded, totalDeleted };
}

function summarizeFiles(files: FileChange[]): string {
  if (files.length === 0) return "(no file changes detected)";
  const sorted = files
    .slice()
    .sort((a, b) => (b.added + b.deleted) - (a.added + a.deleted));
  const top = sorted.slice(0, MAX_DIFF_LINES);
  const lines = top.map((f) => {
    const marker = f.status === "added" ? "+++"
      : f.status === "deleted" ? "---"
      : f.status === "renamed" ? "→→→"
      : "···";
    return `${marker} ${f.path} (+${f.added}/-${f.deleted})`;
  });
  if (sorted.length > top.length) {
    lines.push(`… and ${sorted.length - top.length} more file(s)`);
  }
  return lines.join("\n");
}

export interface BuildPrContextArgs {
  prTitle: string;
  prBody: string | null;
  scopecreeperMd: string | null;
  readmeMd: string | null;
  diff: string;
}

export function buildPrContext(args: BuildPrContextArgs): PrContext {
  const parsed = parseDiffSummary(args.diff);
  const filesChanged = parsed.files.length;
  const diffSummary = summarizeFiles(parsed.files);

  let scopeDoc: string | null = null;
  let scopeDocSource: PrContext["scopeDocSource"] = "none";
  if (args.scopecreeperMd && args.scopecreeperMd.trim()) {
    scopeDoc = args.scopecreeperMd.slice(0, 6000);
    scopeDocSource = "scopecreeper.md";
  } else if (args.readmeMd && args.readmeMd.trim()) {
    scopeDoc = args.readmeMd.slice(0, 3000);
    scopeDocSource = "readme";
  }

  return {
    prTitle: args.prTitle.slice(0, 200),
    prBody: (args.prBody ?? "").slice(0, 3000),
    scopeDoc,
    scopeDocSource,
    diffSummary,
    filesChanged,
    linesAdded: parsed.totalAdded,
    linesDeleted: parsed.totalDeleted,
  };
}
