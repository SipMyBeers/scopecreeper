import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { writeFile, chmod, readFile } from "fs/promises";
import { join } from "path";

const HOOK_BODY = `#!/bin/sh
# Installed by @scopecreeper/tui — drift check on every commit.
# Set SC_DISABLE=1 (env var) to skip without uninstalling.
[ "$SC_DISABLE" = "1" ] && exit 0
exec creeper precommit
`;

const MARKER = "creeper precommit";

export async function installHook(arg?: string): Promise<number> {
  const target = arg || process.cwd();
  const gitRoot = spawnSync("git", ["-C", target, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout?.trim();
  if (!gitRoot) {
    console.error(`✗ not a git repo: ${target}`);
    return 1;
  }
  const hookPath = join(gitRoot, ".git", "hooks", "pre-commit");

  if (existsSync(hookPath)) {
    const existing = await readFile(hookPath, "utf8");
    if (existing.includes(MARKER)) {
      console.log(`✓ already installed: ${hookPath}`);
      return 0;
    }
    console.error(`✗ pre-commit hook already exists at ${hookPath}`);
    console.error(`  it does not call scope-creeper. refusing to overwrite.`);
    console.error(`  add this line to your existing hook to integrate:`);
    console.error(`      exec creeper precommit`);
    return 1;
  }

  await writeFile(hookPath, HOOK_BODY);
  await chmod(hookPath, 0o755);
  console.log(`✓ installed pre-commit hook → ${hookPath}`);
  console.log(`  every commit will now be scored against ${gitRoot}/.scopecreeper.md`);
  console.log(`  drift fires a blocking 'why?' prompt before the commit proceeds`);
  console.log(`  to skip a single commit:    SC_DISABLE=1 git commit ...`);
  console.log(`  to remove:                  rm ${hookPath}`);
  return 0;
}
