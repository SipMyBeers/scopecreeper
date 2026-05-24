import { readFile, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Append a new bullet under "In-flight scope" in .scopecreeper.md.
 * If the section isn't present, fall back to appending the bullet to
 * the end of the file with a note.
 *
 * Returns the line that was added so we can diary it.
 */
export async function expandScope(repoPath: string, subject: string): Promise<string> {
  const path = join(repoPath, ".scopecreeper.md");
  const raw = await readFile(path, "utf8");
  const bullet = `- ${subject.replace(/\n/g, " ").trim()} (added by EXPAND ${new Date().toISOString().slice(0, 10)})`;

  // Try to find the "In-flight scope" header and insert under it
  const headerRe = /(##\s*In-flight scope.*?\n)/i;
  if (headerRe.test(raw)) {
    const updated = raw.replace(headerRe, `$1${bullet}\n`);
    await writeFile(path, updated);
    return bullet;
  }
  // Fallback: append at end with a section header
  const appended = raw + `\n\n## In-flight (added by EXPAND)\n${bullet}\n`;
  await writeFile(path, appended);
  return bullet;
}
