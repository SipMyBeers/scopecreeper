#!/usr/bin/env node
/**
 * LibreSprite MCP Server
 *
 * Exposes pixel-art tooling for the Scope Creeper arcade asset over MCP
 * (Model Context Protocol). Tools:
 *
 *   - arcade_recolor:  PNG → tier-palette variant
 *   - arcade_animate:  PNG → N-frame sprite sheet + JSON metadata
 *   - sprite_sheet_export: drives LibreSprite's CLI export
 *   - open_in_editor: launches LibreSprite UI on a file (hand-edit hand-off)
 *
 * Pixel work runs in Python+PIL (deterministic, reliable). LibreSprite
 * is invoked for sprite-sheet export and for opening files in the UI.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SCRIPTS = resolve(ROOT, "scripts");

const PYTHON =
  process.env.PYTHON ||
  "/Library/Frameworks/Python.framework/Versions/3.14/bin/python3";
const LIBRESPRITE =
  process.env.LIBRESPRITE || "/Applications/LibreSprite.app/Contents/MacOS/LibreSprite";

function spawnP(
  cmd: string,
  args: string[],
  opts: { cwd?: string } = {}
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveP) => {
    const p = spawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (b) => (stdout += b.toString()));
    p.stderr.on("data", (b) => (stderr += b.toString()));
    p.on("close", (code) =>
      resolveP({ code: code ?? -1, stdout, stderr })
    );
  });
}

// ─── Tool schemas ────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "arcade_recolor",
    description:
      "Recolor an arcade-machine PNG into one of the four tier palettes (corpse|sweetspot|abyss|delusion). Preserves alpha + luminance, remaps the neon hues. Returns the output path.",
    inputSchema: {
      type: "object",
      required: ["input", "output", "tier"],
      properties: {
        input: { type: "string", description: "Absolute path to input PNG." },
        output: { type: "string", description: "Absolute path to write the variant PNG." },
        tier: {
          type: "string",
          enum: ["corpse", "sweetspot", "abyss", "delusion"],
        },
      },
    },
  },
  {
    name: "arcade_animate",
    description:
      "Generate an N-frame animated sprite sheet from a base arcade PNG. Frames simulate CRT flicker: pixel jitter + glow pulse. Writes the sprite sheet + a sidecar JSON with frame metadata.",
    inputSchema: {
      type: "object",
      required: ["input", "output"],
      properties: {
        input: { type: "string", description: "Absolute path to input PNG." },
        output: { type: "string", description: "Absolute path to write the sprite-sheet PNG." },
        frames: {
          type: "integer",
          minimum: 2,
          maximum: 24,
          default: 6,
          description: "Number of frames in the animation.",
        },
      },
    },
  },
  {
    name: "arcade_animate_swirl",
    description:
      "Bake a swirl animation INTO an arcade sprite by rotating the CRT screen interior per frame. Cabinet pixels stay static; only the screen window rotates. Writes a horizontal sprite-sheet PNG + sidecar JSON.",
    inputSchema: {
      type: "object",
      required: ["input", "output"],
      properties: {
        input: { type: "string", description: "Absolute path to input PNG (recolored or base arcade)." },
        output: { type: "string", description: "Absolute path to write the sprite-sheet PNG." },
        frames: {
          type: "integer",
          minimum: 2,
          maximum: 32,
          default: 8,
          description: "Number of frames in the swirl rotation cycle.",
        },
      },
    },
  },
  {
    name: "sprite_sheet_export",
    description:
      "Use LibreSprite's CLI to export an .aseprite file as a sprite sheet PNG + JSON. Useful when the source is hand-authored in LibreSprite.",
    inputSchema: {
      type: "object",
      required: ["input", "sheet_out", "data_out"],
      properties: {
        input: { type: "string", description: "Absolute path to .aseprite source." },
        sheet_out: { type: "string", description: "Absolute path to write the sprite sheet PNG." },
        data_out: { type: "string", description: "Absolute path to write the JSON metadata." },
        sheet_type: {
          type: "string",
          enum: ["horizontal", "vertical", "rows", "columns", "packed"],
          default: "horizontal",
        },
      },
    },
  },
  {
    name: "open_in_editor",
    description:
      "Open a PNG / aseprite file in the LibreSprite UI (non-blocking). Hand-off for manual editing.",
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: {
        path: { type: "string", description: "Absolute path to file to open." },
      },
    },
  },
];

// ─── Tool handlers ───────────────────────────────────────────────────────────

async function handleRecolor(args: any) {
  const input = String(args.input);
  const output = String(args.output);
  const tier = String(args.tier);
  if (!existsSync(input)) {
    throw new Error(`input does not exist: ${input}`);
  }
  const r = await spawnP(PYTHON, [
    resolve(SCRIPTS, "recolor.py"),
    input,
    output,
    tier,
  ]);
  if (r.code !== 0) {
    throw new Error(`recolor failed (${r.code}): ${r.stderr.trim()}`);
  }
  return {
    output,
    tier,
    stdout: r.stdout.trim(),
  };
}

async function handleAnimate(args: any) {
  const input = String(args.input);
  const output = String(args.output);
  const frames = String(args.frames ?? 6);
  if (!existsSync(input)) throw new Error(`input does not exist: ${input}`);
  const r = await spawnP(PYTHON, [
    resolve(SCRIPTS, "animate.py"),
    input,
    output,
    frames,
  ]);
  if (r.code !== 0) {
    throw new Error(`animate failed (${r.code}): ${r.stderr.trim()}`);
  }
  return {
    output,
    json: output.replace(/\.png$/i, ".json"),
    stdout: r.stdout.trim(),
  };
}

async function handleAnimateSwirl(args: any) {
  const input = String(args.input);
  const output = String(args.output);
  const frames = String(args.frames ?? 8);
  if (!existsSync(input)) throw new Error(`input does not exist: ${input}`);
  const r = await spawnP(PYTHON, [
    resolve(SCRIPTS, "animate_swirl.py"),
    input,
    output,
    frames,
  ]);
  if (r.code !== 0) {
    throw new Error(`animate_swirl failed (${r.code}): ${r.stderr.trim()}`);
  }
  return {
    output,
    json: output.replace(/\.png$/i, ".json"),
    stdout: r.stdout.trim(),
  };
}

async function handleSpriteSheetExport(args: any) {
  const input = String(args.input);
  const sheet = String(args.sheet_out);
  const data = String(args.data_out);
  const sheetType = String(args.sheet_type ?? "horizontal");
  if (!existsSync(input)) throw new Error(`input does not exist: ${input}`);
  const r = await spawnP(LIBRESPRITE, [
    "--batch",
    input,
    "--sheet",
    sheet,
    "--sheet-type",
    sheetType,
    "--data",
    data,
    "--format",
    "json-array",
    "--script",
    resolve(SCRIPTS, "libresprite_export.js"),
  ]);
  if (r.code !== 0) {
    throw new Error(`libresprite export failed (${r.code}): ${r.stderr.trim()}`);
  }
  return { sheet, data, stdout: r.stdout.trim() };
}

async function handleOpenInEditor(args: any) {
  const path = String(args.path);
  if (!existsSync(path)) throw new Error(`file not found: ${path}`);
  // Detach so the editor stays open after this tool call returns.
  const child = spawn(LIBRESPRITE, [path], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return { opened: path, pid: child.pid };
}

// ─── Wire up server ──────────────────────────────────────────────────────────

const server = new Server(
  { name: "libresprite-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    let result: unknown;
    switch (name) {
      case "arcade_recolor":
        result = await handleRecolor(args);
        break;
      case "arcade_animate":
        result = await handleAnimate(args);
        break;
      case "arcade_animate_swirl":
        result = await handleAnimateSwirl(args);
        break;
      case "sprite_sheet_export":
        result = await handleSpriteSheetExport(args);
        break;
      case "open_in_editor":
        result = await handleOpenInEditor(args);
        break;
      default:
        throw new Error(`unknown tool: ${name}`);
    }
    return {
      content: [
        { type: "text", text: JSON.stringify(result, null, 2) },
      ],
    };
  } catch (err) {
    return {
      isError: true,
      content: [
        { type: "text", text: `ERROR: ${(err as Error).message}` },
      ],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("libresprite-mcp ready");
