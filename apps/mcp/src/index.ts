#!/usr/bin/env node
/**
 * @scopecreeper/mcp
 *
 * MCP server that exposes Scope Creeper's diagnostic engine to Claude Code
 * (or any MCP-speaking client). Stdio transport.
 *
 * Tools:
 *   scope_creeper.scan      — quick delusion score on any seed (free tier)
 *   scope_creeper.kill      — KILL artifact (sunk-cost autopsy, free tier)
 *   scope_creeper.shippable — SHIPPABLE_V0 PRD (Pro tier)
 *
 * Auth: pass `--api-key=sk_sc_live_...` or set SCOPE_CREEPER_API_KEY.
 * Override the API base with --base= or SCOPE_CREEPER_BASE.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, writeFile, appendFile, mkdir } from "fs/promises";
import { join, dirname } from "path";

interface InboxEvent {
  ts: number;
  repo: string;
  path: string;
  hash: string;
  subject: string;
  score: number;
  tier: string;
  verdict: string;
  analysis: string;
  reasons: string[];
}

const HOME = process.env.HOME ?? "";
const INBOX_JSONL = join(HOME, ".config", "scopecreeper", "inbox.jsonl");
const INBOX_ARCHIVE = join(HOME, ".config", "scopecreeper", "inbox-archive.jsonl");

async function readInbox(drainAfter: boolean): Promise<{ events: InboxEvent[] }> {
  let raw: string;
  try {
    raw = await readFile(INBOX_JSONL, "utf8");
  } catch {
    return { events: [] };
  }
  const events: InboxEvent[] = raw.split("\n").filter(Boolean)
    .map((l) => {
      try { return JSON.parse(l) as InboxEvent; } catch { return null; }
    })
    .filter((e): e is InboxEvent => e !== null);
  if (drainAfter && events.length) {
    try {
      await mkdir(dirname(INBOX_ARCHIVE), { recursive: true });
      await appendFile(INBOX_ARCHIVE, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
      await writeFile(INBOX_JSONL, "");
    } catch { /* best-effort; surface events regardless */ }
  }
  return { events };
}

const VERSION = "0.2.0";

function parseArgs(argv: string[]): {
  apiKey: string | undefined;
  base: string;
} {
  let apiKey = process.env.SCOPE_CREEPER_API_KEY;
  let base = process.env.SCOPE_CREEPER_BASE ?? "https://scopecreeper.ai";
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--api-key=")) apiKey = arg.slice("--api-key=".length);
    else if (arg.startsWith("--base=")) base = arg.slice("--base=".length).replace(/\/+$/, "");
  }
  return { apiKey, base };
}

const { apiKey, base } = parseArgs(process.argv);

function headers(): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) h["authorization"] = `Bearer ${apiKey}`;
  return h;
}

async function apiCall(
  path: string,
  body: unknown
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, error: `network: ${(err as Error).message}` };
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: `${res.status} ${res.statusText}` };
  }
  if (!res.ok) {
    const err = (json as { error?: string; message?: string }).error
      ?? (json as { message?: string }).message
      ?? `${res.status} ${res.statusText}`;
    return { ok: false, error: String(err) };
  }
  return { ok: true, data: json };
}

interface Dimension {
  id?: string;
  label?: string;
  blurb?: string;
  creep?: number;
}

interface ScanResult {
  score?: number;
  tier?: string;
  verdict?: string;
  analysis?: string;
  mutations?: string[];
  dimensions?: Dimension[];
}

interface Artifact {
  kind?: string;
  title?: string;
  body?: string;
  mime?: string;
}

const server = new Server(
  { name: "scope-creeper", version: VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "scope_creeper_scan",
      description:
        "Run a Scope Creeper scan against any seed — a GitHub repo URL (owner/name), an AI chatlog, or a single word. Returns a delusion score (0-100), a tier (corpse / sweetspot / abyss / delusion), a verdict, a one-sentence analysis, and 3-5 'creep dimensions' (alternate project paths the seed could grow into). Free tier — 5 scans / month.",
      inputSchema: {
        type: "object",
        properties: {
          payload: {
            type: "string",
            description:
              "The seed to scan. A repo as 'owner/name', a chatlog with User:/Assistant: turns, or any short text. Will be auto-detected.",
          },
          kind: {
            type: "string",
            enum: ["repo", "chatlog"],
            description:
              "Optional. Force the input kind. If omitted, the server auto-detects: anything matching 'owner/name' is treated as a repo, everything else as a chatlog.",
          },
        },
        required: ["payload"],
      },
    },
    {
      name: "scope_creeper_kill",
      description:
        "Generate a KILL artifact — a brutally honest one-page autopsy arguing why a project / feature / branch should NOT be built. Returns markdown with: sunk-cost framing, specific dated cutoff signals, 'what to build instead', and a one-line eulogy. Use this BEFORE writing code for any big plan to get a real second opinion. Free tier.",
      inputSchema: {
        type: "object",
        properties: {
          plan: {
            type: "string",
            description:
              "The plan / project / feature description to roast. Can be a paragraph from a PRD, a chatlog of you talking to an LLM about building something, or a one-line idea.",
          },
        },
        required: ["plan"],
      },
    },
    {
      name: "scope_creeper_inbox",
      description:
        "Read pending drift events from the local Scope Creeper daemon's shared inbox. Returns commits the daemon flagged as drifting from the user's declared scope (.scopecreeper.md). Each event has a repo, hash, score (0-100), tier, verdict, and analysis. If pending events exist, BRING THEM UP TO THE USER PROACTIVELY before continuing the conversation — they may be working on something they've already decided is off-scope. Pass `drain: true` to mark events as read (moves them to inbox-archive.jsonl). Reads from ~/.config/scopecreeper/inbox.jsonl on the local filesystem; returns an empty array if the file doesn't exist or the daemon isn't running.",
      inputSchema: {
        type: "object",
        properties: {
          drain: {
            type: "boolean",
            description: "If true, mark all returned events as read by moving them to the archive. Default false.",
          },
        },
      },
    },
    {
      name: "scope_creeper_shippable",
      description:
        "Generate a SHIPPABLE_V0 artifact — a 1-page PRD with a concrete stack, V0 scope (3-5 bullets), acceptance criteria, and 4-6 paste-runnable shell commands for the first 30 minutes of work. Use when a plan has survived the KILL test and you want to start building. Pro tier ($9/mo).",
      inputSchema: {
        type: "object",
        properties: {
          plan: {
            type: "string",
            description:
              "The plan / feature description to convert into a shippable v0 spec.",
          },
        },
        required: ["plan"],
      },
    },
  ],
}));

function detectKind(payload: string): "repo" | "chatlog" {
  // owner/name detection.
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(payload.trim())
    ? "repo"
    : "chatlog";
}

/** Run scan, drill into the first dimension with a chosen artifactKind,
 *  return the artifact. Used by kill + shippable. */
async function generateArtifact(
  plan: string,
  artifactKind: "KILL" | "SHIPPABLE"
): Promise<{ ok: true; artifact: Artifact } | { ok: false; error: string }> {
  // Step 1: kick off a scan against the plan so we have a parent state.
  const scan = await apiCall("/api/score", { kind: "chatlog", payload: plan });
  if (!scan.ok) return { ok: false, error: `scan failed: ${scan.error}` };
  const sd = scan.data as ScanResult;
  const firstDim = (sd.dimensions ?? [])[0];
  if (!firstDim?.label) {
    return { ok: false, error: "no dimensions returned from scan; cannot anchor artifact" };
  }
  // Step 2: ask the creep endpoint for a terminal artifact of the requested kind.
  const parentSummary = [
    `Score: ${sd.score}/100`,
    `Tier: ${sd.tier}`,
    `Verdict: ${sd.verdict}`,
    sd.analysis,
    `(root seed: ${plan.slice(0, 240)})`,
  ].filter(Boolean).join("\n");

  const creep = await apiCall("/api/creep", {
    parentSummary,
    dimension: firstDim,
    artifactKind,
  });
  if (!creep.ok) return { ok: false, error: creep.error };
  const cd = creep.data as { artifact?: Artifact };
  if (!cd.artifact?.body) {
    return { ok: false, error: "artifact generation returned no body" };
  }
  return { ok: true, artifact: cd.artifact };
}

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === "scope_creeper_inbox") {
    const drain = Boolean((args as { drain?: boolean }).drain);
    const result = await readInbox(drain);
    if (!result.events.length) {
      return {
        content: [
          {
            type: "text",
            text: "inbox empty — no pending drifts. (If the user expects events here, confirm `creeper daemon` is running on their machine.)",
          },
        ],
      };
    }
    const lines: string[] = [
      `${result.events.length} pending drift event${result.events.length === 1 ? "" : "s"}${drain ? " — drained" : ""}:`,
      "",
    ];
    for (const e of [...result.events].reverse()) {
      lines.push(`## ${e.repo} · ${e.score}/100 ${(e.tier ?? "").toUpperCase()}`);
      lines.push(`- commit: \`${e.hash}\` — ${e.subject}`);
      lines.push(`- verdict: ${e.verdict}`);
      if (e.analysis) lines.push(`- analysis: ${e.analysis}`);
      if (e.reasons?.length) lines.push(`- reasons: ${e.reasons.join(", ")}`);
      lines.push(`- repo path: \`${e.path}\``);
      lines.push("");
    }
    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  if (name === "scope_creeper_scan") {
    const payload = String((args as { payload?: string }).payload ?? "").trim();
    if (!payload) {
      return {
        isError: true,
        content: [{ type: "text", text: "missing 'payload'" }],
      };
    }
    const kind =
      (args as { kind?: "repo" | "chatlog" }).kind ?? detectKind(payload);
    const result = await apiCall("/api/score", { kind, payload });
    if (!result.ok) {
      return {
        isError: true,
        content: [{ type: "text", text: `scan failed: ${result.error}` }],
      };
    }
    const sd = result.data as ScanResult;
    const lines = [
      `Score: ${sd.score}/100 (${(sd.tier ?? "").toUpperCase()})`,
      `Verdict: ${sd.verdict}`,
      ``,
      sd.analysis ?? "",
      ``,
    ];
    if (sd.dimensions?.length) {
      lines.push("Creep dimensions (paths this seed could grow into):");
      for (const d of sd.dimensions) {
        lines.push(`- ${d.label} (creep ${d.creep ?? "?"}) — ${d.blurb}`);
      }
    }
    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  if (name === "scope_creeper_kill") {
    const plan = String((args as { plan?: string }).plan ?? "").trim();
    if (!plan) {
      return {
        isError: true,
        content: [{ type: "text", text: "missing 'plan'" }],
      };
    }
    const result = await generateArtifact(plan, "KILL");
    if (!result.ok) {
      return {
        isError: true,
        content: [{ type: "text", text: result.error }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `# ${result.artifact.title ?? "KILL"}\n\n${result.artifact.body}`,
        },
      ],
    };
  }

  if (name === "scope_creeper_shippable") {
    const plan = String((args as { plan?: string }).plan ?? "").trim();
    if (!plan) {
      return {
        isError: true,
        content: [{ type: "text", text: "missing 'plan'" }],
      };
    }
    const result = await generateArtifact(plan, "SHIPPABLE");
    if (!result.ok) {
      const hint = result.error.includes("PRO_REQUIRED")
        ? "\n\n(SHIPPABLE is a Pro feature — upgrade at scopecreeper.ai)"
        : "";
      return {
        isError: true,
        content: [{ type: "text", text: `${result.error}${hint}` }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `# ${result.artifact.title ?? "SHIPPABLE V0"}\n\n${result.artifact.body}`,
        },
      ],
    };
  }

  return {
    isError: true,
    content: [{ type: "text", text: `unknown tool: ${name}` }],
  };
});

async function main(): Promise<void> {
  if (!apiKey) {
    console.error(
      "warn: no api key configured — pass --api-key=sk_sc_live_... or set SCOPE_CREEPER_API_KEY. Falling back to anonymous calls (subject to per-IP free-tier limits)."
    );
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("scope-creeper-mcp fatal:", err);
  process.exit(1);
});
