/**
 * Smoke test the audit runner against a small public repo, bypassing the
 * paywalled API endpoint. Uses Node's built-in DecompressionStream + fetch.
 */
const { runAudit } = await import("../src/lib/audit-runner.ts").catch(async () => {
  // Fall back to tsx
  throw new Error("Run with: npx tsx scripts/test-audit.mjs");
});

const repo = process.argv[2] ?? "sindresorhus/p-map";
console.log(`auditing ${repo}...`);
const startedAt = Date.now();
const report = await runAudit(repo, undefined);
console.log(`ok in ${Date.now() - startedAt}ms`);
console.log(`files: ${report.filesScanned}, bytes: ${report.bytesScanned}`);
console.log(`delusion: ${report.delusionScore}, findings: ${report.findings.length}`);
console.log(`\nfirst 10 findings:`);
for (const f of report.findings.slice(0, 10)) {
  const loc = f.line ? `${f.file}:${f.line}` : f.file;
  console.log(`  [${f.severity}] ${f.category} — ${loc} — ${f.evidence}`);
}
