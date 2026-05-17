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
