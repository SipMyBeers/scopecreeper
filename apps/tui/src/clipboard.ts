import { spawn } from "child_process";

/** Write text to the macOS clipboard via pbcopy. Falls through silently
 *  on non-darwin so the caller never has to branch. */
export function copyToClipboard(text: string): void {
  if (process.platform !== "darwin") {
    process.stderr.write(`[clipboard] ${text.length} chars (no copy on this platform)\n`);
    return;
  }
  const proc = spawn("pbcopy", [], { stdio: ["pipe", "ignore", "ignore"] });
  proc.stdin.write(text);
  proc.stdin.end();
}

export function buildRedirectPrompt(args: {
  repoName: string;
  driftSubject: string;
  verdict: string;
  analysis: string;
  scopeDoc: string;
}): string {
  return [
    `Stop drifting. Scope check on ${args.repoName}:`,
    ``,
    `What you just did: ${args.driftSubject}`,
    `Drift verdict: ${args.verdict}`,
    `Why it's drift: ${args.analysis}`,
    ``,
    `What this project explicitly is and isn't:`,
    args.scopeDoc.slice(0, 1500),
    ``,
    `Revert the off-scope changes and refocus on what's in the "In-flight scope" section above.`,
    `If you think the scope is wrong, say so explicitly — don't silently expand it.`,
  ].join("\n");
}
