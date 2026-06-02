/**
 * Canonical LLM prompt templates. The Pages Function imports these so
 * that future clients (a CLI, an extension) hit the same prompts.
 */

export const SYSTEM_PROMPT = [
  "You are SCOPE CREEPER, a tactical diagnostic engine.",
  "Your tone is cynical, terminal-glitch, retro-arcade.",
  "Speak in short imperatives. Never use second-person flattery.",
  "Diagnose the delta between what a project is and what it pretends to be.",
].join(" ");

export function mutationPrompt(args: {
  realityScore: number;
  illusionScore: number;
  description: string;
}): string {
  return [
    `Reality: ${args.realityScore}/100. Illusion: ${args.illusionScore}/100.`,
    `Project context:\n"""\n${args.description}\n"""`,
    "",
    "Return JSON with this exact shape:",
    `{
  "verdict": "<3-6 WORDS, ALL CAPS>",
  "analysis": "<one sentence, terminal-style>",
  "mutations": ["<creative mutation #1>", "<#2>", "<#3>"],
  "dimensions": [
    { "id": "<short_snake_case_id>", "label": "<UPPERCASE 1-3 WORDS>", "blurb": "<one terse sentence>" },
    "<3-5 dimensions total>"
  ]
}`,
    "",
    "Mutations should be absurd, specific, and disruptive — name a concrete feature to inject or invert.",
    "Dimensions are axes along which this project will creep when scaled (e.g. API_SURFACE, TEAM_SIZE, USER_LOAD, FEATURE_COUNT, AI_LAYER). Pick 3-5 that are SPECIFIC to this project's description, not generic.",
    "Do not wrap the JSON in markdown.",
  ].join("\n");
}

export function creepScalePrompt(args: {
  parentSummary: string;
  dimensionLabel: string;
  dimensionBlurb: string;
}): string {
  return [
    `Parent state of this project:\n"""\n${args.parentSummary}\n"""`,
    "",
    `Scale this project along the "${args.dimensionLabel}" dimension (${args.dimensionBlurb}).`,
    "Project what creeps in. What breaks first. What hidden cost surfaces.",
    "",
    "Return JSON only:",
    `{
  "verdict": "<3-6 WORDS, ALL CAPS>",
  "analysis": "<one sentence, terminal-style, describing what creeps>",
  "score": <int 0-100 NEW delusion score after this creep>,
  "mutations": ["<2-3 absurd-but-specific countermeasures>"],
  "dimensions": [
    { "id": "<id>", "label": "<UPPERCASE>", "blurb": "<one line>" },
    "<2-4 sub-dimensions to drill deeper into>"
  ]
}`,
  ].join("\n");
}

export function chatlogIllusionPrompt(chatlog: string): string {
  return [
    "Score the AMBITION (illusion) embedded in this AI conversation on a 0-100 scale.",
    "Higher = more sweeping, ungrounded, multi-feature, multi-system claims.",
    "Lower = pragmatic, bounded, ships in a week.",
    "",
    `Conversation:\n"""\n${chatlog.slice(0, 8000)}\n"""`,
    "",
    "Return JSON only:",
    `{"illusionScore": <int 0-100>, "claimedFeatures": ["<short feature 1>", "..."], "summary": "<one terminal-style line>"}`,
  ].join("\n");
}

function repoAgeLabel(pushedAt: string | null): string {
  if (!pushedAt) return "unknown";
  const days = Math.floor((Date.now() - Date.parse(pushedAt)) / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function userProfilePrompt(args: {
  user: { login: string; name: string | null; bio: string | null; publicRepos: number; followers: number; createdAt: string | null };
  repos: { name: string; description: string | null; language: string | null; stars: number; size: number; pushedAt: string | null; archived: boolean }[];
}): string {
  const accountAgeDays = args.user.createdAt
    ? Math.floor((Date.now() - Date.parse(args.user.createdAt)) / 86_400_000)
    : null;
  const ageLabel = accountAgeDays
    ? accountAgeDays > 365
      ? `${Math.floor(accountAgeDays / 365)} years`
      : `${Math.floor(accountAgeDays / 30)} months`
    : "unknown";

  const repoLines = args.repos
    .slice(0, 15)
    .map((r, i) => {
      const archived = r.archived ? " [ARCHIVED]" : "";
      const desc = r.description ? ` — ${r.description.slice(0, 80)}` : "";
      return `  ${i + 1}. ${r.name} (${r.language ?? "?"})${desc} — ${r.size}KB — ${r.stars}★ — last active ${repoAgeLabel(r.pushedAt)}${archived}`;
    })
    .join("\n");

  return [
    `Analyze this GitHub developer's building patterns. Score their scope creep tendency.`,
    ``,
    `Developer: ${args.user.login}${args.user.name ? ` (${args.user.name})` : ""}`,
    `Account age: ${ageLabel}`,
    `Bio: ${args.user.bio ?? "(none)"}`,
    `Total public repos (non-fork): ${args.user.publicRepos}`,
    `Followers: ${args.user.followers}`,
    ``,
    `Top ${args.repos.slice(0, 15).length} repos (most recently active):`,
    repoLines,
    ``,
    `Score 0 = disciplined, focused, consistent shipper.`,
    `Score 100 = serial project abandoner, scope inflation, never ships.`,
    ``,
    `Return JSON only, no markdown:`,
    `{`,
    `  "delusionScore": <int 0-100>,`,
    `  "tier": "corpse"|"sweetspot"|"abyss"|"delusion",`,
    `  "verdict": "<3-6 WORDS ALL CAPS — describe their building pattern>",`,
    `  "analysis": "<one terminal-style sentence about what you observe in their repos>",`,
    `  "patterns": [`,
    `    "<specific observable pattern 1, e.g. '12 of 30 repos abandoned after first week'>",`,
    `    "<specific pattern 2, grounded in the repo list>",`,
    `    "<specific pattern 3>"`,
    `  ]`,
    `}`,
  ].join("\n");
}
