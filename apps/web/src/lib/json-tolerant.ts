/**
 * Tolerant JSON parser for LLM outputs. Llama 3.3 70B with response_format
 * json_object is structurally valid but emits literal newlines inside string
 * values, which standard JSON.parse rejects. This handles that + markdown
 * code-fence wrapping + slicing to the first {...} block.
 */

/** Escape literal control chars that appear *inside* JSON string values. */
function sanitizeJSONControlChars(s: string): string {
  let out = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) {
        out += ch;
        escape = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escape = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
    } else {
      out += ch;
      if (ch === '"') inString = true;
    }
  }
  return out;
}

export function tryParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const attempts = [trimmed, sanitizeJSONControlChars(trimmed)];
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      /* keep trying */
    }
    const match = candidate.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* keep trying */
      }
    }
  }
  return null;
}
