/**
 * Browser-safe chatlog parser. Takes the raw text the user pasted
 * (Claude/ChatGPT/Gemini exports, or plain back-and-forth) and extracts
 * a rough structure so the rest of the engine can score it.
 */

export interface ChatTurn {
  role: "user" | "assistant" | "system";
  text: string;
}

export interface ChatlogParseResult {
  turns: ChatTurn[];
  wordCount: number;
  /** Phrases that look like proposed features. Used as an illusion proxy. */
  claimedFeatures: string[];
  /** True if the parser found explicit role markers (vs. fell back to a single blob). */
  structured: boolean;
}

const ROLE_PATTERNS: Array<{ role: ChatTurn["role"]; regex: RegExp }> = [
  { role: "user", regex: /^\s*(?:user|you|human|prompt)\s*:/i },
  { role: "assistant", regex: /^\s*(?:assistant|ai|claude|chatgpt|gpt|gemini|llm|model)\s*:/i },
  { role: "system", regex: /^\s*system\s*:/i },
];

/** Trigger words that imply a feature claim. */
const FEATURE_VERBS = [
  "build",
  "create",
  "implement",
  "add",
  "design",
  "ship",
  "launch",
  "integrate",
  "generate",
  "synthesize",
  "deploy",
];

export function parseChatlog(text: string): ChatlogParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { turns: [], wordCount: 0, claimedFeatures: [], structured: false };
  }

  const lines = trimmed.split(/\r?\n/);
  const turns: ChatTurn[] = [];
  let current: ChatTurn | null = null;
  let structured = false;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    let matched = false;
    for (const { role, regex } of ROLE_PATTERNS) {
      if (regex.test(line)) {
        if (current) turns.push(current);
        current = {
          role,
          text: line.replace(regex, "").trimStart(),
        };
        matched = true;
        structured = true;
        break;
      }
    }
    if (!matched) {
      if (current) current.text += (current.text ? "\n" : "") + line;
      else current = { role: "user", text: line };
    }
  }
  if (current) turns.push(current);

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const claimedFeatures = extractFeatures(trimmed);
  return { turns, wordCount, claimedFeatures, structured };
}

function extractFeatures(text: string): string[] {
  // Pull sentences that begin with one of the trigger verbs OR contain "feature:".
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const verbRegex = new RegExp(`\\b(?:${FEATURE_VERBS.join("|")})\\b`, "i");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of sentences) {
    if (out.length >= 12) break;
    if (verbRegex.test(s) || /feature\s*:/i.test(s)) {
      const cleaned = s.replace(/\s+/g, " ").slice(0, 180);
      if (!seen.has(cleaned.toLowerCase())) {
        seen.add(cleaned.toLowerCase());
        out.push(cleaned);
      }
    }
  }
  return out;
}

/**
 * Default illusion score from a parsed chatlog — used when the LLM is
 * not available. Long, feature-rich conversations score higher.
 */
export function illusionScoreFromChatlog(parsed: ChatlogParseResult): number {
  let score = 20 + Math.min(40, parsed.wordCount / 80);
  score += Math.min(35, parsed.claimedFeatures.length * 4);

  const hot = ["world peace", "self-healing", "infinite", "multimodal", "neural", "opus 5.0", "agi", "autonomous"];
  const joined = parsed.turns.map((t) => t.text).join(" ").toLowerCase();
  for (const k of hot) if (joined.includes(k)) score += 5;

  return Math.max(0, Math.min(100, score));
}
